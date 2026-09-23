-- =============================================================================
-- Waffiy — numéros mobiles algériens canoniques et vérifiés
-- =============================================================================

create or replace function public.normalize_dz_phone(p_phone text)
returns text
language plpgsql
immutable
strict
set search_path = public, pg_temp
as $$
declare
  v_digits text := regexp_replace(btrim(p_phone), '[^0-9]', '', 'g');
begin
  if v_digits ~ '^00213[567][0-9]{8}$' then
    v_digits := substr(v_digits, 3);
  end if;

  if v_digits ~ '^0[567][0-9]{8}$' then
    return '+213' || substr(v_digits, 2);
  elsif v_digits ~ '^213[567][0-9]{8}$' then
    return '+' || v_digits;
  elsif v_digits ~ '^[567][0-9]{8}$' then
    return '+213' || v_digits;
  end if;

  return null;
end;
$$;

comment on function public.normalize_dz_phone(text) is
  'Convertit un numéro mobile algérien 05/06/07 au format E.164.';

create or replace function public.normalize_stored_phone(p_phone text)
returns text
language plpgsql
immutable
strict
set search_path = public, pg_temp
as $$
declare
  v_dz text := public.normalize_dz_phone(p_phone);
  v_digits text := regexp_replace(btrim(p_phone), '[^0-9]', '', 'g');
begin
  if v_dz is not null then return v_dz; end if;
  -- Les commerces historiques peuvent avoir une ligne fixe algérienne. Elle
  -- reste stockable, mais ne passe jamais pour un mobile utilisable par OTP.
  if v_digits ~ '^0[1-4][0-9]{7}$' then
    return '+213' || substr(v_digits, 2);
  elsif v_digits ~ '^213[1-4][0-9]{7}$' then
    return '+' || v_digits;
  end if;
  if btrim(p_phone) like '+%' and v_digits ~ '^[1-9][0-9]{7,14}$' then
    return '+' || v_digits;
  end if;
  return null;
end;
$$;

-- Échouer avant toute modification permet de traiter explicitement les données
-- historiques ambiguës au lieu d'écraser silencieusement un numéro.
do $$
declare
  v_invalid text;
  v_duplicates text;
begin
  select string_agg(id::text, ', ' order by id::text)
    into v_invalid
  from public.profiles
  where phone is not null and public.normalize_stored_phone(phone) is null;

  if v_invalid is not null then
    raise exception 'INVALID_DZ_PHONE_PROFILES:%', v_invalid;
  end if;

  select string_agg(normalized, ', ' order by normalized)
    into v_duplicates
  from (
    select public.normalize_stored_phone(phone) as normalized
    from public.profiles
    where phone is not null
    group by public.normalize_stored_phone(phone)
    having count(*) > 1
  ) duplicates;

  if v_duplicates is not null then
    raise exception 'DUPLICATE_DZ_PHONE_PROFILES:%', v_duplicates;
  end if;

  select string_agg(id::text, ', ' order by id::text)
    into v_invalid
  from public.merchants
  where phone is not null and public.normalize_stored_phone(phone) is null;

  if v_invalid is not null then
    raise exception 'INVALID_DZ_PHONE_MERCHANTS:%', v_invalid;
  end if;
end;
$$;

alter table public.profiles
  add column if not exists phone_verified_at timestamptz;

drop index if exists public.profiles_phone_key;
alter table public.profiles drop constraint if exists profiles_phone_check;
alter table public.merchants drop constraint if exists merchants_phone_check;

update public.profiles
set phone = public.normalize_stored_phone(phone)
where phone is not null;

update public.merchants
set phone = public.normalize_stored_phone(phone)
where phone is not null;

alter table public.profiles
  add constraint profiles_phone_e164_check
  check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$');

alter table public.merchants
  add constraint merchants_phone_e164_check
  check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$');

create unique index profiles_phone_key
  on public.profiles (phone)
  where phone is not null;

create or replace function public.normalize_phone_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.phone is null or btrim(new.phone) = '' then
    new.phone := null;
    return new;
  end if;

  new.phone := public.normalize_stored_phone(new.phone);
  if new.phone is null then
    raise exception 'INVALID_DZ_PHONE' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger profiles_normalize_phone
  before insert or update of phone on public.profiles
  for each row execute function public.normalize_phone_columns();

create trigger merchants_normalize_phone
  before insert or update of phone on public.merchants
  for each row execute function public.normalize_phone_columns();

-- Un utilisateur peut corriger son numéro, mais seul Auth peut attester qu'il
-- contrôle ce numéro. Toute modification directe invalide donc la preuve.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Profondeur > 1 : mise à jour imbriquée depuis le déclencheur Auth qui
  -- vient de confirmer l'OTP. Un appel direct PostgREST reste à profondeur 1.
  if auth.uid() is null or pg_trigger_depth() > 1 or public.auth_is_platform_admin() then
    return new;
  end if;

  new.is_platform_admin := old.is_platform_admin;
  new.public_code       := old.public_code;
  new.deleted_at        := old.deleted_at;
  new.id                := old.id;

  if new.phone is distinct from old.phone then
    new.phone_verified_at := null;
  else
    new.phone_verified_at := old.phone_verified_at;
  end if;

  return new;
end;
$$;

-- Les inscriptions existantes conservent leur téléphone comme donnée non
-- vérifiée. Si Auth porte déjà un mobile confirmé, sa preuve est reprise.
update public.profiles p
set phone = public.normalize_stored_phone(u.phone),
    phone_verified_at = u.phone_confirmed_at
from auth.users u
where u.id = p.id
  and u.phone is not null
  and u.phone_confirmed_at is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_phone text;
begin
  v_phone := case
    when new.phone_confirmed_at is not null then public.normalize_stored_phone(new.phone)
    else public.normalize_stored_phone(new.raw_user_meta_data ->> 'phone')
  end;

  insert into public.profiles (
    id, first_name, last_name, phone, phone_verified_at, email
  ) values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'first_name'), ''), ''),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'last_name'),  ''), ''),
    v_phone,
    case when new.phone_confirmed_at is not null then new.phone_confirmed_at end,
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.handle_user_phone_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.phone is not null and new.phone_confirmed_at is not null then
    update public.profiles
    set phone = public.normalize_stored_phone(new.phone),
        phone_verified_at = new.phone_confirmed_at
    where id = new.id;
  elsif new.phone is distinct from old.phone then
    update public.profiles
    set phone = public.normalize_stored_phone(new.phone),
        phone_verified_at = null
    where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_phone_changed on auth.users;
create trigger on_auth_user_phone_changed
  after update of phone, phone_confirmed_at on auth.users
  for each row execute function public.handle_user_phone_change();

create or replace function public.lookup_login_email(p_phone text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select lower(p.email)
  from public.profiles p
  where p.deleted_at is null
    and p.email is not null
    and p.phone_verified_at is not null
    and p.phone = public.normalize_dz_phone(p_phone)
  limit 1;
$$;

comment on column public.profiles.phone_verified_at is
  'Date de preuve de possession du mobile par OTP Supabase. NULL interdit son usage pour connexion ou récupération.';
comment on function public.lookup_login_email(text) is
  'Résout uniquement un mobile algérien vérifié. Réservée au service_role.';

revoke all on function public.lookup_login_email(text) from public, anon, authenticated;
grant execute on function public.lookup_login_email(text) to service_role;
