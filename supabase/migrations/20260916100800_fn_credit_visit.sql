-- =============================================================================
-- Waffiy — 0009 · credit_visit()
-- =============================================================================
-- Créditer une visite. Règles métier 1, 5, 6 et 7 : exécution serveur, en une
-- seule transaction, réservée au commerçant, horodatée, notifiée, et bornée par
-- un délai anti-fraude paramétrable.

-- Forme de retour partagée avec redeem_reward(), pour que l'application n'ait
-- qu'un seul type à manipuler après un scan.
create type public.scan_result as (
  transaction_id     uuid,
  merchant_id        uuid,
  program_id         uuid,
  program_name       text,
  stamps_after       int,
  threshold          int,
  reward_available   boolean,
  idempotent_replay  boolean
);

comment on type public.scan_result is
  'Résultat d''un crédit ou d''une consommation. idempotent_replay = true si l''action avait déjà été enregistrée.';

-- -----------------------------------------------------------------------------

create or replace function public.credit_visit(
  p_client_code text,
  p_program_id  uuid,
  p_request_id  uuid,
  p_count       int default 1
)
returns public.scan_result
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_program    public.programs%rowtype;
  v_merchant   public.merchants%rowtype;
  v_progress   public.program_progress%rowtype;
  v_existing   public.transactions%rowtype;
  v_client     uuid;
  v_actor      uuid := auth.uid();
  v_interval   int;
  v_max_count  int;
  v_elapsed    int;
  v_before     int;
  v_after      int;
  v_remaining  int;
  v_almost     int;
  v_unlocked   boolean;
  v_txn_id     uuid;
  v_result     public.scan_result;
begin
  ---------------------------------------------------------------------------
  -- 1. La clé d'idempotence est obligatoire
  ---------------------------------------------------------------------------
  -- Sans elle, un rejeu après coupure réseau créditerait deux fois. C'est
  -- l'application qui la génère, AVANT l'envoi, et la conserve dans sa file.
  if p_request_id is null then
    raise exception 'MISSING_REQUEST_ID'
      using errcode = 'P0001',
            hint = 'Générez un UUID sur l''appareil avant l''appel et conservez-le pour les rejeus.';
  end if;

  ---------------------------------------------------------------------------
  -- 2. Rejeu : on répond avant toute autre vérification
  ---------------------------------------------------------------------------
  -- Volontairement en tête. Une action déjà enregistrée doit renvoyer le même
  -- résultat même si, entre-temps, le délai anti-fraude s'est rearmé ou le
  -- programme est passé en brouillon.
  select * into v_existing
  from public.transactions
  where client_request_id = p_request_id;

  if found then
    if v_existing.kind <> 'credit' or v_existing.program_id <> p_program_id then
      raise exception 'REQUEST_ID_CONFLICT'
        using errcode = 'P0001',
              hint = 'Cette clé d''idempotence a déjà servi pour une autre action.';
    end if;

    select p.name, p.threshold into v_result.program_name, v_result.threshold
    from public.programs p where p.id = v_existing.program_id;

    v_result.transaction_id    := v_existing.id;
    v_result.merchant_id       := v_existing.merchant_id;
    v_result.program_id        := v_existing.program_id;
    v_result.stamps_after      := v_existing.stamps_after;
    v_result.reward_available  := v_existing.stamps_after >= v_result.threshold;
    v_result.idempotent_replay := true;
    return v_result;
  end if;

  ---------------------------------------------------------------------------
  -- 3. Programme et commerce
  ---------------------------------------------------------------------------
  select * into v_program from public.programs where id = p_program_id;
  if not found then
    raise exception 'PROGRAM_NOT_FOUND' using errcode = 'P0001';
  end if;

  select * into v_merchant from public.merchants where id = v_program.merchant_id;

  ---------------------------------------------------------------------------
  -- 4. RÈGLE MÉTIER 1 — seul un commerçant authentifié crédite
  ---------------------------------------------------------------------------
  -- La fonction est SECURITY DEFINER : elle contourne la RLS. Ce contrôle est
  -- donc la seule chose qui empêche un client d'appeler credit_visit() sur
  -- lui-même avec la clé anonyme. Il ne doit jamais être déplacé plus bas.
  if v_actor is null or not public.auth_is_merchant_operator(v_merchant.id) then
    raise exception 'FORBIDDEN'
      using errcode = 'P0001',
            hint = 'Seul le commerçant qui exploite ce programme peut créditer une visite.';
  end if;

  ---------------------------------------------------------------------------
  -- 5. États du commerce et du programme
  ---------------------------------------------------------------------------
  if v_merchant.status <> 'active' then
    raise exception 'MERCHANT_SUSPENDED' using errcode = 'P0001';
  end if;

  -- Un programme en brouillon ou archivé n'est pas créditable (C8).
  if v_program.status <> 'active' then
    raise exception 'PROGRAM_NOT_ACTIVE'
      using errcode = 'P0001',
            hint = 'Publiez le programme avant de créditer des visites.';
  end if;

  ---------------------------------------------------------------------------
  -- 6. Nombre de visites
  ---------------------------------------------------------------------------
  v_max_count := public.app_setting_int('max_credit_per_call', 1);
  if p_count is null or p_count < 1 or p_count > v_max_count then
    raise exception 'INVALID_COUNT'
      using errcode = 'P0001',
            detail = format('Autorisé : 1 à %s.', v_max_count);
  end if;

  ---------------------------------------------------------------------------
  -- 7. Client
  ---------------------------------------------------------------------------
  -- Le code est normalisé : la saisie manuelle en caisse peut arriver en
  -- minuscules ou avec les tirets de l'affichage WFY-XXXXX-XXXXX.
  select id into v_client
  from public.profiles
  where public_code = upper(translate(btrim(p_client_code), '- ', ''))
    and deleted_at is null;

  if not found then
    raise exception 'CLIENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  ---------------------------------------------------------------------------
  -- 8. DÉCISION D5 — le client doit déjà posséder la carte
  ---------------------------------------------------------------------------
  -- L'inscription passe exclusivement par le client scannant le QR du
  -- commerce. Le commerçant ne peut donc inscrire personne à son insu.
  -- L'application affiche « ce client n'a pas encore votre carte » et propose
  -- d'ouvrir le QR d'inscription.
  if not exists (
    select 1 from public.memberships
    where profile_id = v_client and merchant_id = v_merchant.id
  ) then
    raise exception 'NOT_ENROLLED'
      using errcode = 'P0001',
            hint = 'Faites scanner votre QR d''inscription au client.';
  end if;

  ---------------------------------------------------------------------------
  -- 9. Verrouillage du solde
  ---------------------------------------------------------------------------
  -- FOR UPDATE sérialise deux caisses qui scanneraient le même client au même
  -- instant : la seconde attend, relit le solde à jour, et voit le délai
  -- anti-fraude que la première vient d'armer.
  select * into v_progress
  from public.program_progress
  where profile_id = v_client and program_id = p_program_id
  for update;

  if not found then
    -- Cas d'un programme publié APRÈS l'inscription du client : la ligne de
    -- progression n'existe pas encore, on la matérialise à la volée.
    insert into public.program_progress (profile_id, program_id, merchant_id)
    values (v_client, p_program_id, v_merchant.id)
    on conflict (profile_id, program_id) do nothing;

    select * into v_progress
    from public.program_progress
    where profile_id = v_client and program_id = p_program_id
    for update;
  end if;

  ---------------------------------------------------------------------------
  -- 10. RÈGLE MÉTIER 6 — délai anti-fraude
  ---------------------------------------------------------------------------
  -- Paramétrable côté serveur, jamais côté application : le commerçant ne peut
  -- pas raccourcir son propre délai (app_settings n'est accessible à personne).
  v_interval := coalesce(
    v_merchant.min_credit_interval_seconds,
    public.app_setting_int('min_credit_interval_seconds', 300)
  );

  if v_interval > 0 and v_progress.last_credit_at is not null then
    v_elapsed := floor(extract(epoch from (now() - v_progress.last_credit_at)))::int;
    if v_elapsed < v_interval then
      raise exception 'RATE_LIMITED'
        using errcode = 'P0001',
              detail = (v_interval - v_elapsed)::text,
              hint = format(
                'Une visite a déjà été créditée il y a %s s. Prochain crédit possible dans %s s.',
                v_elapsed, v_interval - v_elapsed);
    end if;
  end if;

  ---------------------------------------------------------------------------
  -- 11. Écriture
  ---------------------------------------------------------------------------
  v_before := v_progress.stamps;
  v_after  := v_before + p_count;

  insert into public.transactions (
    merchant_id, program_id, profile_id, actor_profile_id,
    kind, delta, stamps_before, stamps_after, threshold_at_time,
    client_request_id, source
  ) values (
    v_merchant.id, p_program_id, v_client, v_actor,
    'credit', p_count, v_before, v_after, v_program.threshold,
    p_request_id, 'scan'
  )
  returning id into v_txn_id;

  update public.program_progress
  set stamps          = v_after,
      lifetime_stamps = lifetime_stamps + p_count,
      last_credit_at  = now()
  where id = v_progress.id;

  update public.memberships
  set last_activity_at = now()
  where profile_id = v_client and merchant_id = v_merchant.id;

  ---------------------------------------------------------------------------
  -- 12. RÈGLE MÉTIER 5 — notification, dans la même transaction
  ---------------------------------------------------------------------------
  -- RÈGLE MÉTIER 2 : franchir le seuil rend la récompense DISPONIBLE. Rien
  -- n'est consommé ici, aucun solde n'est remis à zéro.
  v_unlocked  := v_after >= v_program.threshold;
  v_remaining := greatest(v_program.threshold - v_after, 0);
  v_almost    := public.app_setting_int('almost_there_remaining', 1);

  insert into public.notifications (
    profile_id, merchant_id, program_id, transaction_id, kind, title, body, data
  ) values (
    v_client, v_merchant.id, p_program_id, v_txn_id,
    case
      when v_unlocked then 'reward_unlocked'::public.notification_kind
      when v_remaining = v_almost then 'almost_there'::public.notification_kind
      else 'visit_credited'::public.notification_kind
    end,
    case
      when v_unlocked then 'Récompense débloquée'
      when v_remaining = v_almost then
        format('Plus que %s visite%s !', v_remaining, case when v_remaining > 1 then 's' else '' end)
      else format('+%s visite%s', p_count, case when p_count > 1 then 's' else '' end)
    end,
    case
      when v_unlocked then
        format('Vous avez gagné %s chez %s.', v_program.name, v_merchant.name)
      when v_remaining = v_almost then
        format('Encore %s visite%s avant votre %s chez %s.',
               v_remaining, case when v_remaining > 1 then 's' else '' end,
               v_program.name, v_merchant.name)
      else
        format('%s — %s : %s / %s visites',
               v_merchant.name, v_program.name, v_after, v_program.threshold)
    end,
    jsonb_build_object(
      'screen', case when v_unlocked then 'unlock' else 'card' end,
      'merchantId', v_merchant.id,
      'programId', p_program_id
    )
  );

  ---------------------------------------------------------------------------
  -- 13. Retour
  ---------------------------------------------------------------------------
  v_result.transaction_id    := v_txn_id;
  v_result.merchant_id       := v_merchant.id;
  v_result.program_id        := p_program_id;
  v_result.program_name      := v_program.name;
  v_result.stamps_after      := v_after;
  v_result.threshold         := v_program.threshold;
  v_result.reward_available  := v_unlocked;
  v_result.idempotent_replay := false;
  return v_result;

exception
  -- Deux appels rigoureusement simultanés portant la même clé d'idempotence
  -- peuvent franchir ensemble le contrôle de l'étape 2. La contrainte d'unicité
  -- rattrape le second : on lui renvoie l'action déjà enregistrée plutôt
  -- qu'une erreur que l'application ne saurait pas distinguer d'un vrai échec.
  when unique_violation then
    select * into v_existing
    from public.transactions where client_request_id = p_request_id;

    if not found then
      raise;  -- collision sur une autre contrainte : ne pas masquer
    end if;

    select p.name, p.threshold into v_result.program_name, v_result.threshold
    from public.programs p where p.id = v_existing.program_id;

    v_result.transaction_id    := v_existing.id;
    v_result.merchant_id       := v_existing.merchant_id;
    v_result.program_id        := v_existing.program_id;
    v_result.stamps_after      := v_existing.stamps_after;
    v_result.reward_available  := v_existing.stamps_after >= v_result.threshold;
    v_result.idempotent_replay := true;
    return v_result;
end;
$$;

comment on function public.credit_visit is
  'Crédite une ou plusieurs visites. Atomique, réservée au commerçant, idempotente, bornée par le délai anti-fraude.';

revoke all on function public.credit_visit(text, uuid, uuid, int) from public, anon;
grant execute on function public.credit_visit(text, uuid, uuid, int) to authenticated;
