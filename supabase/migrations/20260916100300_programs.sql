-- =============================================================================
-- Waffiy — 0004 · programs, memberships, program_progress
-- =============================================================================
-- Trois notions à ne pas confondre :
--   programs          : ce que le commerce propose (« 10 visites = 1 burger »)
--   memberships       : la CARTE, une par couple (client, commerce)
--   program_progress  : le SOLDE, une ligne par couple (client, programme)
-- L'interface montre une carte par commerce, qui agrège plusieurs programmes.

-- -----------------------------------------------------------------------------
-- programs
-- -----------------------------------------------------------------------------

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,

  -- C'est aussi le libellé de la récompense : « Burger gratuit ».
  name text not null
    check (length(btrim(name)) between 2 and 80),
  emoji text not null default '🎁'
    check (length(emoji) between 1 and 8),
  description text
    check (description is null or length(description) <= 280),

  -- Borne haute à 50 : au-delà, une carte de fidélité n'a plus de sens
  -- commercial, et l'affichage en pastilles devient illisible.
  threshold int not null
    check (threshold between 2 and 50),

  status public.program_status not null default 'draft',

  -- « Apparence de la carte » de l'écran d'édition.
  surface_color text check (surface_color is null or surface_color ~ '^#[0-9A-Fa-f]{6}$'),
  border_color  text check (border_color  is null or border_color  ~ '^#[0-9A-Fa-f]{6}$'),

  sort_order int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.programs is
  'Un programme de fidélité. Un commerce peut en proposer plusieurs en parallèle.';
comment on column public.programs.status is
  'draft : invisible du client et non créditable. archived : conservé pour l''historique.';

create index programs_merchant_status_idx on public.programs (merchant_id, status);
create index programs_merchant_sort_idx   on public.programs (merchant_id, sort_order);

create trigger programs_set_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- memberships — la carte de fidélité
-- -----------------------------------------------------------------------------

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id)  on delete cascade,
  merchant_id uuid not null references public.merchants (id) on delete cascade,

  -- « Cliente depuis mars 2026 » sur la fiche client.
  joined_at timestamptz not null default now(),

  -- Tri de « Mes cartes » côté client et de « Clients » côté commerçant.
  -- Mis à jour par credit_visit() et redeem_reward(), jamais par l'application.
  last_activity_at timestamptz,

  created_at timestamptz not null default now(),

  -- Une seule carte par commerce : rescanner l'affiche ne doit pas créer
  -- de doublon ni réinitialiser joined_at.
  unique (profile_id, merchant_id)
);

comment on table public.memberships is
  'La carte de fidélité : un couple (client, commerce). Créée uniquement par join_merchant().';

create index memberships_profile_idx
  on public.memberships (profile_id, last_activity_at desc nulls last);
create index memberships_merchant_idx
  on public.memberships (merchant_id, last_activity_at desc nulls last);

-- -----------------------------------------------------------------------------
-- program_progress — le solde de tampons
-- -----------------------------------------------------------------------------

create table public.program_progress (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,

  -- Dénormalisé depuis programs.merchant_id : sans lui, CHAQUE vérification RLS
  -- déclencherait une jointure sur programs, sur le chemin critique de tous les
  -- écrans commerçant. La cohérence est garantie par un déclencheur, plus bas.
  merchant_id uuid not null references public.merchants (id) on delete cascade,

  -- Solde courant. Décrémenté du seuil exact à la consommation : le surplus
  -- est conservé (règle métier 3).
  stamps int not null default 0 check (stamps >= 0),

  -- Cumul historique, jamais décrémenté. Alimente « Total visites ».
  lifetime_stamps int not null default 0 check (lifetime_stamps >= 0),

  rewards_redeemed int not null default 0 check (rewards_redeemed >= 0),

  -- Colonne lue par l'anti-fraude (règle métier 6).
  last_credit_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (profile_id, program_id)
);

comment on table public.program_progress is
  'Solde de tampons. AUCUNE écriture directe : seules les fonctions SECURITY DEFINER y touchent.';
comment on column public.program_progress.merchant_id is
  'Dénormalisé depuis programs, pour éviter une jointure dans chaque politique RLS.';
comment on column public.program_progress.last_credit_at is
  'Dernier crédit. Comparé au délai anti-fraude par credit_visit().';

create index program_progress_merchant_program_idx
  on public.program_progress (merchant_id, program_id);
create index program_progress_profile_idx
  on public.program_progress (profile_id);

-- Sert le filtre « Récompense disponible » de la liste clients : la grande
-- majorité des lignes est à zéro, l'index partiel reste donc petit.
create index program_progress_active_idx
  on public.program_progress (merchant_id)
  where stamps > 0;

create trigger program_progress_set_updated_at
  before update on public.program_progress
  for each row execute function public.set_updated_at();

-- Garantit que la dénormalisation ne peut pas mentir.
create or replace function public.sync_progress_merchant()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  owner_merchant uuid;
begin
  select p.merchant_id into owner_merchant
  from public.programs p where p.id = new.program_id;

  if owner_merchant is null then
    raise exception 'Programme introuvable : %', new.program_id;
  end if;

  -- On corrige plutôt que de refuser : l'appelant est toujours une de nos
  -- fonctions, et une divergence signalerait un bug, pas une attaque.
  new.merchant_id := owner_merchant;
  return new;
end;
$$;

create trigger program_progress_sync_merchant
  before insert or update of program_id on public.program_progress
  for each row execute function public.sync_progress_merchant();
