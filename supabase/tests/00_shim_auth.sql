-- =============================================================================
-- Waffiy — banc d'essai : imitation du schéma auth de Supabase
-- =============================================================================
-- CE FICHIER N'EST PAS UNE MIGRATION. Il n'est jamais appliqué à un projet
-- Supabase : la plateforme fournit déjà tout ce qui suit. Il sert uniquement à
-- rejouer les migrations sur un Postgres nu, en local, pour tester les
-- politiques RLS et les règles métier sans lancer toute la pile Supabase.
--
-- Il reproduit fidèlement : le schéma auth, la table auth.users, la fonction
-- auth.uid(), les rôles applicatifs et les privilèges par défaut.

create schema if not exists auth;
create schema if not exists extensions;

-- Rôles applicatifs de Supabase.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

-- Table des comptes. Seules les colonnes dont dépendent nos déclencheurs.
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  phone text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Définition exacte de Supabase : lit le sujet du JWT injecté par PostgREST.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    'anon'
  );
$$;

grant usage on schema auth, extensions, public to anon, authenticated, service_role;

-- Supabase accorde tout sur public aux rôles applicatifs : c'est la RLS, et
-- elle seule, qui restreint. Reproduire ce réglage est indispensable, sinon
-- les tests passeraient pour de mauvaises raisons.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
