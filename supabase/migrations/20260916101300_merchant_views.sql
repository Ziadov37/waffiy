-- =============================================================================
-- Waffiy — 0014 · Vues et statistiques du commerçant
-- =============================================================================
-- La politique RLS sur profiles est volontairement limitée à soi-même : un
-- commerçant n'a pas à lire le téléphone et l'email de ses clients. Mais le
-- flux d'activité doit afficher « Sarah B. », et une jointure directe depuis
-- transactions vers profiles ne renverrait donc rien.
--
-- D'où ces vues, qui contournent la RLS (security_invoker = false) tout en
-- portant leur propre garde et en ne sélectionnant que les colonnes utiles.

-- -----------------------------------------------------------------------------
-- merchant_activity — flux d'activité et historique d'un client
-- -----------------------------------------------------------------------------

create view public.merchant_activity
with (security_invoker = false)
as
select
  t.id,
  t.merchant_id,
  t.profile_id,
  p.first_name,
  p.last_name,
  t.program_id,
  pg.name  as program_name,
  pg.emoji as program_emoji,
  t.kind,
  t.delta,
  t.stamps_before,
  t.stamps_after,
  t.threshold_at_time,
  t.reward_label,
  t.source,
  t.created_at
from public.transactions t
join public.profiles p on p.id = t.profile_id
join public.programs pg on pg.id = t.program_id
where public.auth_is_merchant_operator(t.merchant_id)   -- ← la garde
   or public.auth_is_platform_admin();

comment on view public.merchant_activity is
  'Registre du commerce, enrichi du nom du client. Ni téléphone ni email.';

revoke all on public.merchant_activity from anon;
grant select on public.merchant_activity to authenticated;

-- -----------------------------------------------------------------------------
-- merchant_stats — les quatre indicateurs du tableau de bord
-- -----------------------------------------------------------------------------
-- Fonction plutôt que vue : « aujourd'hui » et « ce mois-ci » doivent se
-- calculer dans le fuseau DU COMMERCE, pas dans celui du serveur ni de
-- l'appareil. Un commerçant en déplacement ne doit pas voir ses compteurs se
-- décaler de plusieurs heures.

create or replace function public.merchant_stats(p_merchant uuid)
returns table (
  customers_count   int,
  scans_today       int,
  rewards_this_month int,
  returning_rate    int
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tz         text;
  v_day_start  timestamptz;
  v_month_start timestamptz;
begin
  if not public.auth_is_merchant_operator(p_merchant)
     and not public.auth_is_platform_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select timezone into v_tz from public.merchants where id = p_merchant;
  if v_tz is null then
    raise exception 'MERCHANT_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- Minuit et premier du mois, lus dans le fuseau du commerce puis reconvertis
  -- en instant absolu pour la comparaison.
  v_day_start   := (date_trunc('day',   now() at time zone v_tz)) at time zone v_tz;
  v_month_start := (date_trunc('month', now() at time zone v_tz)) at time zone v_tz;

  return query
  select
    (select count(*)::int from public.memberships m where m.merchant_id = p_merchant),

    (select count(*)::int from public.transactions t
      where t.merchant_id = p_merchant
        and t.kind = 'credit'
        and t.created_at >= v_day_start),

    (select count(*)::int from public.transactions t
      where t.merchant_id = p_merchant
        and t.kind = 'redeem'
        and t.created_at >= v_month_start),

    -- « Clients fidèles » : part des clients revenus au moins une fois, donc
    -- ayant cumulé 2 visites ou plus. Un client à une seule visite n'a pas
    -- encore prouvé qu'il revenait.
    (select case
       when count(distinct mm.profile_id) = 0 then 0
       else round(
         100.0 * count(distinct mm.profile_id) filter (where loyal.total >= 2)
         / count(distinct mm.profile_id)
       )::int
     end
     from public.memberships mm
     left join lateral (
       select coalesce(sum(pp.lifetime_stamps), 0) as total
       from public.program_progress pp
       where pp.profile_id = mm.profile_id and pp.merchant_id = p_merchant
     ) loyal on true
     where mm.merchant_id = p_merchant);
end;
$$;

comment on function public.merchant_stats is
  'Indicateurs du tableau de bord, calculés dans le fuseau horaire du commerce.';

revoke all on function public.merchant_stats(uuid) from public, anon;
grant execute on function public.merchant_stats(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Bornes de la journée commerciale
-- -----------------------------------------------------------------------------
-- L'écran « Activité du jour » doit filtrer sur les mêmes bornes que les
-- statistiques. Les recalculer côté application à partir du fuseau de
-- l'appareil produirait deux vérités différentes sur le même écran.

create or replace function public.merchant_day_bounds(p_merchant uuid)
returns table (day_start timestamptz, day_end timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tz text;
begin
  if not public.auth_is_merchant_operator(p_merchant)
     and not public.auth_is_platform_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select timezone into v_tz from public.merchants where id = p_merchant;
  if v_tz is null then
    raise exception 'MERCHANT_NOT_FOUND' using errcode = 'P0001';
  end if;

  return query select
    (date_trunc('day', now() at time zone v_tz)) at time zone v_tz,
    ((date_trunc('day', now() at time zone v_tz)) + interval '1 day') at time zone v_tz;
end;
$$;

revoke all on function public.merchant_day_bounds(uuid) from public, anon;
grant execute on function public.merchant_day_bounds(uuid) to authenticated;
