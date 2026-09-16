-- =============================================================================
-- Waffiy — 0005 · transactions (le registre)
-- =============================================================================
-- Source de vérité de l'application. program_progress.stamps n'en est qu'un
-- cache : en cas de doute, le solde est reconstructible à partir d'ici.
-- La table est APPEND-ONLY, y compris pour le propriétaire de la base.

create table public.transactions (
  id uuid primary key default gen_random_uuid(),

  -- on delete restrict partout : le registre doit survivre à tout le reste.
  merchant_id uuid not null references public.merchants (id) on delete restrict,
  program_id  uuid not null references public.programs  (id) on delete restrict,
  profile_id  uuid not null references public.profiles  (id) on delete restrict,

  -- Audit pur. JAMAIS affiché dans l'application : la gestion d'équipe a été
  -- écartée (décision D4) et vous ne souhaitez pas savoir qui a scanné.
  -- Vaut toujours le propriétaire du commerce en phase 1. Existe pour que le
  -- back-office super admin puisse enquêter sur une fraude sans migrer le
  -- registre, et pour qu'une équipe réintroduite plus tard ait un historique.
  actor_profile_id uuid not null references public.profiles (id) on delete restrict,

  kind public.transaction_kind not null,

  -- +1 au crédit, -seuil à la consommation.
  delta int not null,

  stamps_before int not null check (stamps_before >= 0),
  stamps_after  int not null check (stamps_after  >= 0),

  -- INSTANTANÉ du seuil au moment de l'action. Sans lui, modifier le seuil
  -- d'un programme réécrirait rétroactivement l'histoire : « 8 / 10 » devenu
  -- « 8 / 15 » dans un historique vieux de six mois.
  threshold_at_time int not null check (threshold_at_time > 0),

  -- Instantané du nom de la récompense, renseigné à la consommation.
  reward_label text,

  -- CLÉ D'IDEMPOTENCE. C'est cette contrainte d'unicité qui rend le rejeu
  -- d'une action mise en file d'attente hors ligne strictement inoffensif :
  -- l'appareil génère l'UUID avant l'envoi, et un double envoi ne crédite
  -- qu'une seule fois.
  client_request_id uuid not null unique,

  source text not null default 'scan'
    check (source in ('scan', 'manual', 'offline_sync', 'system')),

  -- Motif d'un ajustement.
  note text check (note is null or length(note) <= 280),

  -- Horodatage (règle métier 5).
  created_at timestamptz not null default now(),

  -- Le solde d'arrivée doit découler du solde de départ. Une incohérence
  -- ici signalerait un bug dans une fonction, pas une donnée à accepter.
  constraint transactions_delta_coherent
    check (stamps_after = stamps_before + delta),

  -- Le signe de delta doit correspondre à la nature de l'opération.
  constraint transactions_kind_sign
    check (
      (kind = 'credit' and delta > 0)
      or (kind = 'redeem' and delta < 0)
      or (kind = 'adjust' and delta <> 0)
    ),

  -- Une consommation porte toujours le libellé de la récompense utilisée.
  constraint transactions_redeem_labelled
    check (kind <> 'redeem' or reward_label is not null)
);

comment on table public.transactions is
  'Registre immuable des visites et récompenses. Append-only, même pour le propriétaire.';
comment on column public.transactions.client_request_id is
  'Clé d''idempotence générée par l''appareil. Rend le rejeu hors ligne inoffensif.';
comment on column public.transactions.actor_profile_id is
  'Audit uniquement — jamais affiché (décision D4 : pas de gestion d''équipe).';
comment on column public.transactions.threshold_at_time is
  'Instantané du seuil : garde l''historique vrai quand le programme change (règle 4).';

-- Flux « Activité du jour » du commerçant.
create index transactions_merchant_recent_idx
  on public.transactions (merchant_id, created_at desc);

-- Historique côté client.
create index transactions_profile_recent_idx
  on public.transactions (profile_id, created_at desc);

-- Historique d'un client sur un programme, affiché dans la fiche client.
create index transactions_program_profile_idx
  on public.transactions (program_id, profile_id, created_at desc);

-- Statistiques du tableau de bord (scans du jour, récompenses du mois).
create index transactions_merchant_kind_idx
  on public.transactions (merchant_id, kind, created_at desc);

-- -----------------------------------------------------------------------------
-- Immuabilité
-- -----------------------------------------------------------------------------
-- La RLS ne suffirait pas : les fonctions SECURITY DEFINER s'exécutent avec les
-- droits du propriétaire et la contourneraient. Un déclencheur, lui, s'applique
-- à tout le monde. Une correction se fait par transaction compensatoire
-- (kind = 'adjust'), jamais par réécriture.

create or replace function public.reject_transaction_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'Le registre des transactions est immuable. Utilisez une transaction compensatoire (kind = ''adjust'').'
    using errcode = 'restrict_violation';
end;
$$;

create trigger transactions_immutable
  before update or delete on public.transactions
  for each row execute function public.reject_transaction_mutation();
