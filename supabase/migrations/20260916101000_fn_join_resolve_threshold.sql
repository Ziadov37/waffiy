-- =============================================================================
-- Waffiy — 0011 · join_merchant, resolve_client_for_scan, seuil des programmes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- join_merchant — la seule voie de création d'une carte (décision D5)
-- -----------------------------------------------------------------------------
-- Appelée par le CLIENT lui-même, après avoir scanné le QR affiché en vitrine.
-- C'est auth.uid() qui détermine à qui appartient la carte : un commerçant ne
-- peut donc inscrire personne à sa place, même en connaissant son code public.

create type public.join_result as (
  merchant_id        uuid,
  merchant_name      text,
  merchant_category  public.merchant_category,
  merchant_city      text,
  merchant_logo_url  text,
  already_member     boolean,
  programs_enrolled  int
);

create or replace function public.join_merchant(p_join_code text)
returns public.join_result
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_merchant public.merchants%rowtype;
  v_client   uuid := auth.uid();
  v_existing boolean;
  v_count    int;
  v_result   public.join_result;
begin
  if v_client is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  -- Même normalisation qu'au scan client : le code peut arriver saisi à la
  -- main, en minuscules, avec ou sans tirets d'affichage.
  select * into v_merchant
  from public.merchants
  where join_code = upper(translate(btrim(p_join_code), '- ', ''));

  if not found then
    raise exception 'MERCHANT_NOT_FOUND'
      using errcode = 'P0001',
            hint = 'Ce QR code ne correspond à aucun commerce Waffiy.';
  end if;

  if v_merchant.status <> 'active' then
    raise exception 'MERCHANT_SUSPENDED' using errcode = 'P0001';
  end if;

  ---------------------------------------------------------------------------
  -- Idempotence : rescanner l'affiche ne crée pas de doublon et surtout ne
  -- réinitialise pas joined_at — « Cliente depuis mars 2026 » doit rester vrai.
  ---------------------------------------------------------------------------
  select exists (
    select 1 from public.memberships
    where profile_id = v_client and merchant_id = v_merchant.id
  ) into v_existing;

  insert into public.memberships (profile_id, merchant_id)
  values (v_client, v_merchant.id)
  on conflict (profile_id, merchant_id) do nothing;

  ---------------------------------------------------------------------------
  -- DÉCISION D6 — inscription à TOUS les programmes actifs d'un coup.
  -- La carte porte le commerce ; les programmes sont ses faces.
  -- Les brouillons sont exclus : ils n'existent pas encore pour le client.
  ---------------------------------------------------------------------------
  with inserted as (
    insert into public.program_progress (profile_id, program_id, merchant_id)
    select v_client, p.id, v_merchant.id
    from public.programs p
    where p.merchant_id = v_merchant.id
      and p.status = 'active'
    on conflict (profile_id, program_id) do nothing
    returning 1
  )
  select count(*)::int into v_count from inserted;

  v_result.merchant_id       := v_merchant.id;
  v_result.merchant_name     := v_merchant.name;
  v_result.merchant_category := v_merchant.category;
  v_result.merchant_city     := v_merchant.city;
  v_result.merchant_logo_url := v_merchant.logo_url;
  v_result.already_member    := v_existing;
  v_result.programs_enrolled := v_count;
  return v_result;
end;
$$;

comment on function public.join_merchant is
  'Seule voie de création d''une carte. Appelée par le client après scan du QR du commerce. Idempotente.';

revoke all on function public.join_merchant(text) from public, anon;
grant execute on function public.join_merchant(text) to authenticated;

-- -----------------------------------------------------------------------------
-- resolve_client_for_scan — l'écran « Client identifié »
-- -----------------------------------------------------------------------------
-- Renvoie une ligne par programme actif du commerce, triée du plus avancé au
-- moins avancé. Les colonnes du client sont répétées sur chaque ligne : avec
-- deux ou trois programmes par commerce, la redondance est négligeable, et
-- elle évite un type JSON que l'application devrait retyper à la main.
--
-- « Le plus avancé » se mesure en RATIO stamps/seuil (ambiguïté C6, tranchée
-- comme dans le prototype) : on propose le programme le plus proche de la
-- récompense, pas celui qui compte le plus de tampons dans l'absolu.

create or replace function public.resolve_client_for_scan(
  p_client_code text,
  p_merchant_id uuid
)
returns table (
  client_profile_id  uuid,
  client_first_name  text,
  client_last_name   text,
  client_public_code text,
  client_joined_at   timestamptz,
  is_enrolled        boolean,
  total_visits       int,
  rewards_redeemed   int,
  program_id         uuid,
  program_name       text,
  program_emoji      text,
  program_threshold  int,
  stamps             int,
  reward_available   boolean,
  is_suggested       boolean,
  seconds_until_next_credit int
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_client   public.profiles%rowtype;
  v_merchant public.merchants%rowtype;
  v_interval int;
begin
  -- Garde d'autorisation. Sans elle, cette fonction serait un oracle permettant
  -- de sonder n'importe quel code client depuis n'importe quel compte.
  if auth.uid() is null or not public.auth_is_merchant_operator(p_merchant_id) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select * into v_merchant from public.merchants where id = p_merchant_id;

  select * into v_client
  from public.profiles
  where public_code = upper(translate(btrim(p_client_code), '- ', ''))
    and deleted_at is null;

  if not found then
    raise exception 'CLIENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_interval := coalesce(
    v_merchant.min_credit_interval_seconds,
    public.app_setting_int('min_credit_interval_seconds', 300)
  );

  return query
  with card as (
    select m.joined_at
    from public.memberships m
    where m.profile_id = v_client.id and m.merchant_id = p_merchant_id
  ),
  totals as (
    select
      coalesce(sum(pp.lifetime_stamps), 0)::int  as visits,
      coalesce(sum(pp.rewards_redeemed), 0)::int as rewards
    from public.program_progress pp
    where pp.profile_id = v_client.id and pp.merchant_id = p_merchant_id
  ),
  rows as (
    select
      pg.id          as program_id,
      pg.name        as program_name,
      pg.emoji       as program_emoji,
      pg.threshold   as program_threshold,
      coalesce(pp.stamps, 0) as stamps,
      coalesce(pp.stamps, 0) >= pg.threshold as reward_available,
      -- Ratio de progression, borné à 1 pour qu'un solde en surplus ne passe
      -- pas devant un programme réellement plus proche de sa récompense.
      least(coalesce(pp.stamps, 0)::numeric / pg.threshold, 1) as ratio,
      greatest(
        v_interval - floor(extract(epoch from (now() - pp.last_credit_at)))::int,
        0
      ) as cooldown
    from public.programs pg
    left join public.program_progress pp
      on pp.program_id = pg.id and pp.profile_id = v_client.id
    where pg.merchant_id = p_merchant_id
      and pg.status = 'active'
  ),
  ranked as (
    select r.*,
           row_number() over (order by r.ratio desc, r.stamps desc, r.program_name) as rk
    from rows r
  )
  select
    v_client.id,
    v_client.first_name,
    v_client.last_name,
    v_client.public_code,
    (select joined_at from card),
    exists (select 1 from card),
    (select visits  from totals),
    (select rewards from totals),
    ranked.program_id,
    ranked.program_name,
    ranked.program_emoji,
    ranked.program_threshold,
    ranked.stamps,
    ranked.reward_available,
    ranked.rk = 1,
    coalesce(ranked.cooldown, 0)
  from ranked
  order by ranked.rk;
end;
$$;

comment on function public.resolve_client_for_scan is
  'Vue restreinte du client scanné. Ni téléphone, ni email, ni commerces concurrents. Programmes triés par ratio de progression.';

revoke all on function public.resolve_client_for_scan(text, uuid) from public, anon;
grant execute on function public.resolve_client_for_scan(text, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- RÈGLE MÉTIER 4 — changement de seuil
-- -----------------------------------------------------------------------------
-- Deux fonctions séparées à dessein : l'application interroge d'abord l'impact
-- pour construire l'avertissement, puis confirme. Le calcul de l'impact ne
-- modifie rien et peut donc être appelé à chaque frappe sur le sélecteur.

create or replace function public.program_threshold_impact(
  p_program_id uuid,
  p_threshold  int
)
returns table (
  current_threshold  int,
  enrolled_count     int,
  in_progress_count  int,
  would_unlock       int,
  would_delay        int,
  requires_warning   boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_program public.programs%rowtype;
begin
  select * into v_program from public.programs where id = p_program_id;
  if not found then
    raise exception 'PROGRAM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not public.auth_is_merchant_operator(v_program.merchant_id) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  return query
  select
    v_program.threshold,
    count(*)::int,
    count(*) filter (where pp.stamps > 0)::int,
    -- Débloque immédiatement : le client n'avait pas sa récompense et l'aurait.
    count(*) filter (
      where pp.stamps < v_program.threshold and pp.stamps >= p_threshold
    )::int,
    -- Retarde : le client avait sa récompense disponible et la perdrait.
    count(*) filter (
      where pp.stamps >= v_program.threshold and pp.stamps < p_threshold
    )::int,
    -- Aucun avertissement si personne n'est inscrit (règle 4, seconde phrase).
    count(*) > 0
  from public.program_progress pp
  where pp.program_id = p_program_id;
end;
$$;

comment on function public.program_threshold_impact is
  'Règle 4 — chiffre l''effet d''un changement de seuil. Ne modifie rien : appelable à chaque frappe.';

create or replace function public.set_program_threshold(
  p_program_id uuid,
  p_threshold  int,
  p_confirmed  boolean default false
)
returns public.programs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_program public.programs%rowtype;
  v_affected int;
begin
  select * into v_program from public.programs where id = p_program_id for update;
  if not found then
    raise exception 'PROGRAM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not public.auth_is_merchant_operator(v_program.merchant_id) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  if p_threshold is null or p_threshold < 2 or p_threshold > 50 then
    raise exception 'INVALID_THRESHOLD'
      using errcode = 'P0001', detail = 'Le seuil doit être compris entre 2 et 50.';
  end if;

  if p_threshold = v_program.threshold then
    return v_program;  -- rien à faire, et surtout aucun avertissement à afficher
  end if;

  select count(*)::int into v_affected
  from public.program_progress pp
  where pp.program_id = p_program_id;

  -- RÈGLE MÉTIER 4 : l'avertissement n'est exigé que si des clients sont
  -- réellement inscrits. Sur un programme vide, le seuil s'ajuste librement.
  if v_affected > 0 and not p_confirmed then
    raise exception 'THRESHOLD_CHANGE_REQUIRES_CONFIRMATION'
      using errcode = 'P0001',
            detail = v_affected::text,
            hint = 'Appelez program_threshold_impact(), montrez l''avertissement, puis rappelez avec p_confirmed = true.';
  end if;

  update public.programs
  set threshold = p_threshold
  where id = p_program_id
  returning * into v_program;

  return v_program;
end;
$$;

comment on function public.set_program_threshold is
  'Règle 4 — refuse le changement de seuil tant que l''avertissement n''a pas été confirmé, si des clients sont inscrits.';

revoke all on function public.program_threshold_impact(uuid, int) from public, anon;
revoke all on function public.set_program_threshold(uuid, int, boolean) from public, anon;
grant execute on function public.program_threshold_impact(uuid, int) to authenticated;
grant execute on function public.set_program_threshold(uuid, int, boolean) to authenticated;
