-- =============================================================================
-- Waffiy — 0002 · profiles
-- =============================================================================
-- Extension 1–1 de auth.users. Aucune colonne « role » : le rôle est une
-- capacité dérivée (décision D2). Un compte est client par nature, et
-- commerçant s'il possède un commerce (merchants.owner_id).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,

  first_name text not null default ''
    check (length(first_name) <= 80),
  last_name  text not null default ''
    check (length(last_name) <= 80),

  -- Non vérifié en phase 1 : la connexion passe par un code email (D1).
  -- Conservé pour la recherche manuelle en caisse et un futur OTP SMS.
  phone text
    check (phone is null or phone ~ '^\+?[0-9 ().-]{6,20}$'),

  -- Copie dénormalisée de auth.users.email, pour l'affichage sans jointure
  -- vers le schéma auth (que la clé anonyme ne peut pas lire).
  email text,

  avatar_url text,

  -- Charge utile du QR client. Aléatoire, sans lien avec l'identité (D3) :
  -- ni nom, ni suite prévisible. 31^10 ≈ 8,2 × 10^14 combinaisons, ce qui
  -- rend l'énumération de la base de clients sans intérêt.
  public_code text not null unique
    check (public_code ~ '^[2-9A-HJKMNP-Z]{10}$'),

  locale text not null default 'fr'
    check (locale in ('fr', 'ar', 'en')),

  -- Crochet du back-office super admin (phase 2). Aucune politique RLS ne
  -- permet à un utilisateur de se l'attribuer : voir la migration 0008.
  is_platform_admin boolean not null default false,

  -- Anonymisation RGPD : on neutralise le profil sans supprimer la ligne,
  -- pour ne pas trouer la comptabilité des commerçants (voir Q12).
  deleted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Un compte Waffiy. Client par défaut, commerçant s''il possède un commerce.';
comment on column public.profiles.public_code is
  'Code du QR client — aléatoire, sans donnée personnelle. Affiché WFY-XXXXX-XXXXX.';
comment on column public.profiles.deleted_at is
  'Profil anonymisé (RGPD). Les transactions restent, le client n''est plus identifiable.';

-- Un numéro ne peut porter qu'un compte, mais l'absence de numéro est permise
-- autant de fois que voulu : d'où l'index partiel plutôt qu'une contrainte unique.
create unique index profiles_phone_key
  on public.profiles (phone)
  where phone is not null;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Attribution du code public
-- -----------------------------------------------------------------------------

create or replace function public.assign_public_code()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  candidate text;
  attempts int := 0;
begin
  if new.public_code is not null then
    return new;
  end if;

  -- Boucle de collision. Avec 8,2 × 10^14 combinaisons, la seconde itération
  -- est déjà improbable ; la borne protège d'une boucle infinie si l'alphabet
  -- venait à être réduit par erreur lors d'une migration future.
  loop
    attempts := attempts + 1;
    candidate := public.random_code(10);
    exit when not exists (
      select 1 from public.profiles p where p.public_code = candidate
    );
    if attempts >= 20 then
      raise exception 'assign_public_code: 20 collisions consécutives, alphabet suspect.';
    end if;
  end loop;

  new.public_code := candidate;
  return new;
end;
$$;

create trigger profiles_assign_public_code
  before insert on public.profiles
  for each row execute function public.assign_public_code();

-- -----------------------------------------------------------------------------
-- Création automatique du profil à l'inscription
-- -----------------------------------------------------------------------------
-- L'application n'insère jamais dans profiles : elle appelle signInWithOtp()
-- avec des métadonnées, et ce déclencheur matérialise le profil. C'est ce qui
-- garantit qu'aucun compte auth ne peut exister sans profil correspondant.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, first_name, last_name, phone, email)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'first_name'), ''), ''),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'last_name'),  ''), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''),
    new.email
  )
  on conflict (id) do nothing;  -- idempotent : un renvoi de code ne doit rien casser

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Garde l'email du profil aligné sur celui du compte en cas de changement.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();
