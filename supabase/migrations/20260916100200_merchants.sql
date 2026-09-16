-- =============================================================================
-- Waffiy — 0003 · merchants
-- =============================================================================
-- Un commerce = un compte (décision D4, pas de gestion d'équipe). Le droit
-- d'exploitation se lit donc entièrement dans owner_id, sans table pivot.

create table public.merchants (
  id uuid primary key default gen_random_uuid(),

  -- on delete restrict : supprimer le compte propriétaire d'un commerce actif
  -- doit échouer bruyamment plutôt que d'orphaliner des cartes de fidélité.
  owner_id uuid not null references public.profiles (id) on delete restrict,

  name text not null
    check (length(btrim(name)) between 2 and 120),
  category public.merchant_category not null,
  city text not null
    check (length(btrim(city)) between 1 and 80),
  phone text
    check (phone is null or phone ~ '^\+?[0-9 ().-]{6,20}$'),

  -- Bucket public « merchant-logos » du Storage Supabase.
  logo_url text,

  -- Charge utile du QR d'inscription affiché en vitrine. C'est l'unique voie
  -- d'entrée vers une carte de fidélité (décision D5).
  join_code text not null unique
    check (join_code ~ '^[2-9A-HJ-NP-Z]{8}$'),

  status public.merchant_status not null default 'active',

  -- Les compteurs « du jour » (scans d'aujourd'hui, activité du jour) se
  -- calculent dans ce fuseau, pas dans celui de l'appareil : un commerçant en
  -- déplacement ne doit pas voir ses statistiques se décaler.
  timezone text not null default 'Africa/Algiers',

  -- Règle métier 6 — délai minimum entre deux crédits pour un même couple
  -- client / programme. NULL signifie « hérite du réglage global »
  -- app_settings.min_credit_interval_seconds.
  min_credit_interval_seconds int
    check (min_credit_interval_seconds is null
           or min_credit_interval_seconds between 0 and 86400),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.merchants is
  'Un commerce. Exploité par un compte unique (owner_id) : pas de gestion d''équipe en phase 1.';
comment on column public.merchants.join_code is
  'Code du QR d''inscription en vitrine. Seule voie de création d''une carte (join_merchant).';
comment on column public.merchants.min_credit_interval_seconds is
  'Anti-fraude (règle 6). NULL = valeur globale de app_settings.';

create index merchants_owner_idx on public.merchants (owner_id);
create index merchants_status_idx on public.merchants (status);
create index merchants_city_category_idx on public.merchants (city, category);

create trigger merchants_set_updated_at
  before update on public.merchants
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Validation du fuseau horaire
-- -----------------------------------------------------------------------------
-- Une contrainte CHECK ne peut pas interroger pg_timezone_names (non immuable).
-- Un fuseau invalide ferait échouer tous les calculs de statistiques à la
-- lecture, donc très loin du point de saisie : on le refuse à l'écriture.

create or replace function public.validate_merchant_timezone()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from pg_timezone_names where name = new.timezone) then
    raise exception 'Fuseau horaire inconnu : %', new.timezone
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger merchants_validate_timezone
  before insert or update of timezone on public.merchants
  for each row execute function public.validate_merchant_timezone();

-- -----------------------------------------------------------------------------
-- Attribution du code d'inscription
-- -----------------------------------------------------------------------------

create or replace function public.assign_join_code()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  candidate text;
  attempts int := 0;
begin
  if new.join_code is not null then
    return new;
  end if;

  loop
    attempts := attempts + 1;
    candidate := public.random_code(8);
    exit when not exists (
      select 1 from public.merchants m where m.join_code = candidate
    );
    if attempts >= 20 then
      raise exception 'assign_join_code: 20 collisions consécutives.';
    end if;
  end loop;

  new.join_code := candidate;
  return new;
end;
$$;

create trigger merchants_assign_join_code
  before insert on public.merchants
  for each row execute function public.assign_join_code();
