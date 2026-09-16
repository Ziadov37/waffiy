-- =============================================================================
-- Waffiy — 0010 · redeem_reward()
-- =============================================================================
-- Consommer une récompense. Règle métier 2 : jamais automatique — cette
-- fonction n'est appelée que par un geste explicite du commerçant, en présence
-- du client. Règle métier 3 : on déduit exactement le seuil, le surplus reste.

create or replace function public.redeem_reward(
  p_client_code text,
  p_program_id  uuid,
  p_request_id  uuid
)
returns public.scan_result
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_program  public.programs%rowtype;
  v_merchant public.merchants%rowtype;
  v_progress public.program_progress%rowtype;
  v_existing public.transactions%rowtype;
  v_client   uuid;
  v_actor    uuid := auth.uid();
  v_before   int;
  v_after    int;
  v_txn_id   uuid;
  v_result   public.scan_result;
begin
  ---------------------------------------------------------------------------
  -- 1. Clé d'idempotence
  ---------------------------------------------------------------------------
  -- Plus critique encore qu'au crédit : un rejeu non protégé consommerait deux
  -- récompenses pour un seul burger servi.
  if p_request_id is null then
    raise exception 'MISSING_REQUEST_ID'
      using errcode = 'P0001',
            hint = 'Générez un UUID sur l''appareil avant l''appel et conservez-le pour les rejeus.';
  end if;

  ---------------------------------------------------------------------------
  -- 2. Rejeu
  ---------------------------------------------------------------------------
  select * into v_existing
  from public.transactions
  where client_request_id = p_request_id;

  if found then
    if v_existing.kind <> 'redeem' or v_existing.program_id <> p_program_id then
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
  -- 3. Programme, commerce, autorisation
  ---------------------------------------------------------------------------
  select * into v_program from public.programs where id = p_program_id;
  if not found then
    raise exception 'PROGRAM_NOT_FOUND' using errcode = 'P0001';
  end if;

  select * into v_merchant from public.merchants where id = v_program.merchant_id;

  -- RÈGLE MÉTIER 2 : la consommation est une action du commerçant. Un client
  -- qui appellerait cette fonction sur lui-même est arrêté ici.
  if v_actor is null or not public.auth_is_merchant_operator(v_merchant.id) then
    raise exception 'FORBIDDEN'
      using errcode = 'P0001',
            hint = 'Seul le commerçant peut valider l''utilisation d''une récompense.';
  end if;

  if v_merchant.status <> 'active' then
    raise exception 'MERCHANT_SUSPENDED' using errcode = 'P0001';
  end if;

  -- Un programme archivé reste consommable : un client qui a rempli sa carte
  -- avant l'archivage garde son dû. Seul le brouillon est refusé, puisqu'il
  -- n'a jamais pu accumuler de visites.
  if v_program.status = 'draft' then
    raise exception 'PROGRAM_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  ---------------------------------------------------------------------------
  -- 4. Client et carte
  ---------------------------------------------------------------------------
  select id into v_client
  from public.profiles
  where public_code = upper(translate(btrim(p_client_code), '- ', ''))
    and deleted_at is null;

  if not found then
    raise exception 'CLIENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.memberships
    where profile_id = v_client and merchant_id = v_merchant.id
  ) then
    raise exception 'NOT_ENROLLED' using errcode = 'P0001';
  end if;

  ---------------------------------------------------------------------------
  -- 5. Verrouillage et contrôle du solde
  ---------------------------------------------------------------------------
  select * into v_progress
  from public.program_progress
  where profile_id = v_client and program_id = p_program_id
  for update;

  if not found then
    raise exception 'INSUFFICIENT_STAMPS'
      using errcode = 'P0001', detail = '0';
  end if;

  if v_progress.stamps < v_program.threshold then
    raise exception 'INSUFFICIENT_STAMPS'
      using errcode = 'P0001',
            detail = v_progress.stamps::text,
            hint = format('%s visites sur %s requises.', v_progress.stamps, v_program.threshold);
  end if;

  ---------------------------------------------------------------------------
  -- 6. RÈGLE MÉTIER 3 — le surplus est conservé
  ---------------------------------------------------------------------------
  -- On déduit le seuil, pas le solde. À 11 visites sur un seuil de 10, le
  -- client repart avec 1 visite et non 0. lifetime_stamps n'est jamais
  -- décrémenté : c'est le cumul historique, pas le solde.
  v_before := v_progress.stamps;
  v_after  := v_before - v_program.threshold;

  insert into public.transactions (
    merchant_id, program_id, profile_id, actor_profile_id,
    kind, delta, stamps_before, stamps_after, threshold_at_time,
    reward_label, client_request_id, source
  ) values (
    v_merchant.id, p_program_id, v_client, v_actor,
    'redeem', -v_program.threshold, v_before, v_after, v_program.threshold,
    v_program.name, p_request_id, 'scan'
  )
  returning id into v_txn_id;

  update public.program_progress
  set stamps           = v_after,
      rewards_redeemed = rewards_redeemed + 1
  where id = v_progress.id;

  update public.memberships
  set last_activity_at = now()
  where profile_id = v_client and merchant_id = v_merchant.id;

  ---------------------------------------------------------------------------
  -- 7. Notification (règle métier 5)
  ---------------------------------------------------------------------------
  insert into public.notifications (
    profile_id, merchant_id, program_id, transaction_id, kind, title, body, data
  ) values (
    v_client, v_merchant.id, p_program_id, v_txn_id,
    'reward_redeemed',
    'Récompense utilisée',
    case
      when v_after > 0 then
        format('Votre %s chez %s a été utilisée. Nouveau cycle : %s / %s visites.',
               v_program.name, v_merchant.name, v_after, v_program.threshold)
      else
        format('Votre %s chez %s a été utilisée. Nouveau cycle démarré.',
               v_program.name, v_merchant.name)
    end,
    jsonb_build_object(
      'screen', 'rewards',
      'merchantId', v_merchant.id,
      'programId', p_program_id
    )
  );

  v_result.transaction_id    := v_txn_id;
  v_result.merchant_id       := v_merchant.id;
  v_result.program_id        := p_program_id;
  v_result.program_name      := v_program.name;
  v_result.stamps_after      := v_after;
  v_result.threshold         := v_program.threshold;
  -- Vrai si le surplus suffit déjà à une seconde récompense.
  v_result.reward_available  := v_after >= v_program.threshold;
  v_result.idempotent_replay := false;
  return v_result;

exception
  when unique_violation then
    select * into v_existing
    from public.transactions where client_request_id = p_request_id;

    if not found then
      raise;
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

comment on function public.redeem_reward is
  'Consomme une récompense. Jamais automatique (règle 2). Déduit le seuil exact, conserve le surplus (règle 3).';

revoke all on function public.redeem_reward(text, uuid, uuid) from public, anon;
grant execute on function public.redeem_reward(text, uuid, uuid) to authenticated;
