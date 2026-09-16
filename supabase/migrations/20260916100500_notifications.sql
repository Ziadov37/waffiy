-- =============================================================================
-- Waffiy — 0006 · notifications, push_tokens, app_settings
-- =============================================================================

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
-- Écrites en français par les fonctions serveur, dans la même transaction que
-- l'action qui les provoque (règle métier 5). L'envoi push est asynchrone :
-- une ligne ici est la commande, pushed_at en est l'accusé d'expédition.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),

  profile_id uuid not null references public.profiles (id) on delete cascade,

  -- Contexte, pour le lien profond. Nullable : une notification système n'a
  -- ni commerce ni programme.
  merchant_id uuid references public.merchants (id) on delete cascade,
  program_id  uuid references public.programs  (id) on delete cascade,
  transaction_id uuid references public.transactions (id) on delete set null,

  -- L'emoji et la teinte (vert pour une visite, or pour une récompense) se
  -- déduisent de ce type côté application : ils ne sont pas stockés.
  kind public.notification_kind not null,

  title text not null check (length(title) between 1 and 120),
  body  text not null check (length(body)  between 1 and 400),

  -- Charge utile du lien profond : { "screen": "card", "merchantId": "..." }
  data jsonb not null default '{}'::jsonb,

  read_at   timestamptz,
  pushed_at timestamptz,

  created_at timestamptz not null default now()
);

comment on table public.notifications is
  'Notifications destinées au client. Créées par les fonctions, dans la transaction de l''action.';
comment on column public.notifications.pushed_at is
  'Horodatage d''envoi effectif à Expo. NULL = encore en file d''attente.';

create index notifications_profile_recent_idx
  on public.notifications (profile_id, created_at desc);

-- Compteur du badge « Notifs ». Index partiel : les non-lues sont une minorité.
create index notifications_unread_idx
  on public.notifications (profile_id)
  where read_at is null;

-- File d'envoi consommée par l'Edge Function send-push.
create index notifications_pending_push_idx
  on public.notifications (created_at)
  where pushed_at is null;

-- -----------------------------------------------------------------------------
-- push_tokens
-- -----------------------------------------------------------------------------

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,

  -- Format ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx].
  token text not null unique,

  platform text not null check (platform in ('ios', 'android')),
  device_id text,

  last_seen_at timestamptz not null default now(),

  -- Renseigné quand Expo répond DeviceNotRegistered : application désinstallée
  -- ou notifications refusées. On cesse d'émettre sans perdre la trace.
  disabled_at timestamptz,

  created_at timestamptz not null default now()
);

comment on table public.push_tokens is
  'Jetons Expo Push par appareil. Un compte peut en avoir plusieurs (téléphone et tablette).';

create index push_tokens_profile_idx
  on public.push_tokens (profile_id)
  where disabled_at is null;

-- -----------------------------------------------------------------------------
-- app_settings
-- -----------------------------------------------------------------------------
-- « Paramétrable côté serveur » de la règle métier 6. Aucune politique RLS ne
-- sera créée sur cette table : elle n'est lisible que par les fonctions
-- SECURITY DEFINER, et par le super admin en phase 2.

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

comment on table public.app_settings is
  'Paramètres globaux. Inaccessible aux rôles applicatifs : lue par les fonctions serveur.';

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

insert into public.app_settings (key, value, description) values
  ('min_credit_interval_seconds', '300'::jsonb,
   'Règle 6 — délai minimum entre deux crédits pour un même couple client/programme. Surchargeable par commerce.'),
  ('almost_there_remaining', '1'::jsonb,
   'Déclenche la notification « Plus qu''une visite ! » quand il reste ce nombre de visites.'),
  ('max_credit_per_call', '1'::jsonb,
   'Plafond de visites créditables en un seul appel. Borne l''erreur de saisie et la fraude.');

-- Lecteur typé, utilisé par les fonctions métier.
create or replace function public.app_setting_int(p_key text, p_default int)
returns int
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select value #>> '{}' from public.app_settings where key = p_key)::int, p_default);
$$;

comment on function public.app_setting_int is
  'Lit un paramètre global entier, avec repli si la clé a été supprimée par erreur.';
