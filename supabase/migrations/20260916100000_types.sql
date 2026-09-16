-- =============================================================================
-- Waffiy — 0001 · Extensions, types énumérés et utilitaires partagés
-- =============================================================================
-- Ce fichier ne crée aucune table : uniquement le vocabulaire commun dont
-- dépendent toutes les migrations suivantes.

-- pgcrypto fournit gen_random_bytes(), utilisé pour tirer les codes publics.
-- gen_random_uuid() est natif depuis Postgres 13 et ne nécessite rien.
create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Types énumérés
-- -----------------------------------------------------------------------------

-- Catégories proposées à l'inscription du commerce (écran « Créer mon commerce »).
create type public.merchant_category as enum (
  'restaurant', 'cafe', 'fast_food', 'bakery', 'beauty', 'retail', 'other'
);

-- 'suspended' est le levier de modération du back-office super admin (phase 2).
-- Il est déjà vérifié par credit_visit() : la phase 2 n'aura rien à recâbler.
create type public.merchant_status as enum ('active', 'suspended');

-- 'archived' plutôt qu'une suppression : un programme effacé casserait
-- l'historique des transactions qui le référencent.
create type public.program_status as enum ('draft', 'active', 'archived');

-- 'adjust' couvre la correction d'une erreur de caisse par transaction
-- compensatoire, le registre étant immuable.
create type public.transaction_kind as enum ('credit', 'redeem', 'adjust');

-- L'emoji et la teinte affichés côté client se déduisent de ce type.
create type public.notification_kind as enum (
  'visit_credited', 'reward_unlocked', 'reward_redeemed', 'almost_there', 'system'
);

-- -----------------------------------------------------------------------------
-- Utilitaires partagés
-- -----------------------------------------------------------------------------

-- Maintient updated_at sans faire confiance au client.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at is
  'Déclencheur BEFORE UPDATE : force updated_at à now(), quelle que soit la valeur envoyée.';

-- Tire un code aléatoire dans un alphabet sans caractères ambigus.
-- Exclus : 0/O, 1/I/L — pour qu'un code puisse être dicté au téléphone
-- lors d'une recherche manuelle en caisse, sans erreur de transcription.
create or replace function public.random_code(p_length int)
returns text
language plpgsql
volatile
set search_path = public, extensions, pg_temp
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; -- 31 caractères
  bytes bytea;
  out_code text := '';
  i int;
begin
  if p_length < 4 or p_length > 32 then
    raise exception 'random_code: longueur hors bornes (%).', p_length;
  end if;

  -- gen_random_bytes est cryptographiquement sûr, contrairement à random().
  -- Le modulo introduit un biais négligeable (256 % 31 = 8) sans conséquence
  -- ici : le code n'est pas un secret, il doit seulement être imprévisible.
  bytes := extensions.gen_random_bytes(p_length);
  for i in 0 .. p_length - 1 loop
    out_code := out_code || substr(alphabet, 1 + (get_byte(bytes, i) % 31), 1);
  end loop;

  return out_code;
end;
$$;

comment on function public.random_code is
  'Code aléatoire en alphabet non ambigu (ni 0/O ni 1/I/L), pour les codes clients et commerces.';
