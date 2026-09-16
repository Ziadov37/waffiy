-- =============================================================================
-- Waffiy — 0007 · Assistants de sécurité
-- =============================================================================
-- Ces fonctions sont appelées par presque toutes les politiques RLS. Elles sont
-- déclarées SECURITY DEFINER pour une raison précise : une politique sur
-- merchants qui relirait merchants déclencherait une récursion infinie. En
-- passant par une fonction qui contourne la RLS, on coupe le cycle.
--
-- STABLE permet à Postgres de mémoriser le résultat pour la durée de la
-- requête : l'assistant n'est évalué qu'une fois, pas une fois par ligne.

-- -----------------------------------------------------------------------------
-- Le compte connecté exploite-t-il ce commerce ?
-- -----------------------------------------------------------------------------
-- Décision D4 : un commerce = un compte. Le jour où une équipe serait
-- réintroduite, seule cette fonction changerait — aucune politique à réécrire.

create or replace function public.auth_is_merchant_operator(p_merchant uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.merchants m
    where m.id = p_merchant
      and m.owner_id = auth.uid()
  );
$$;

comment on function public.auth_is_merchant_operator is
  'Vrai si le compte connecté exploite ce commerce. Seul point à modifier pour réintroduire une équipe.';

-- -----------------------------------------------------------------------------
-- Le compte connecté est-il administrateur de la plateforme ?
-- -----------------------------------------------------------------------------
-- Crochet du back-office de la phase 2. Chaque politique porte déjà la clause
-- « or auth_is_platform_admin() » : le back-office n'exigera aucune migration
-- des politiques existantes.

create or replace function public.auth_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select p.is_platform_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

comment on function public.auth_is_platform_admin is
  'Crochet du back-office super admin (phase 2). Aucune politique ne permet de se l''attribuer.';

-- -----------------------------------------------------------------------------
-- Le compte connecté possède-t-il une carte chez ce commerce ?
-- -----------------------------------------------------------------------------

create or replace function public.auth_is_member_of(p_merchant uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships m
    where m.merchant_id = p_merchant
      and m.profile_id = auth.uid()
  );
$$;

comment on function public.auth_is_member_of is
  'Vrai si le client connecté possède une carte chez ce commerce.';

-- Ces assistants ne doivent pas être appelables par un client curieux pour
-- sonder l'existence d'un commerce : ils ne servent qu'aux politiques.
revoke all on function public.auth_is_merchant_operator(uuid) from public;
revoke all on function public.auth_is_platform_admin()        from public;
revoke all on function public.auth_is_member_of(uuid)         from public;
grant execute on function public.auth_is_merchant_operator(uuid) to authenticated;
grant execute on function public.auth_is_platform_admin()        to authenticated;
grant execute on function public.auth_is_member_of(uuid)         to authenticated;

-- -----------------------------------------------------------------------------
-- Garde-fous d'élévation de privilèges
-- -----------------------------------------------------------------------------
-- La RLS contrôle QUELLES lignes on peut modifier, jamais QUELLES COLONNES.
-- Sans ces déclencheurs, un client autorisé à mettre à jour son propre profil
-- pourrait s'attribuer is_platform_admin, et un commerçant suspendu par la
-- modération pourrait se réactiver lui-même.

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- auth.uid() est NULL pour le jeu de démonstration et les tâches serveur :
  -- on ne bride que les appels venant réellement d'un utilisateur.
  if auth.uid() is null or public.auth_is_platform_admin() then
    return new;
  end if;

  -- Colonnes que leur propriétaire ne décide pas.
  new.is_platform_admin := old.is_platform_admin;
  new.public_code       := old.public_code;  -- changerait le QR de tous ses commerces
  new.deleted_at        := old.deleted_at;
  new.id                := old.id;

  return new;
end;
$$;

create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.guard_merchant_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or public.auth_is_platform_admin() then
    return new;
  end if;

  -- status est le levier de modération : un commerce suspendu ne doit pas
  -- pouvoir se réactiver. owner_id ne se cède pas depuis l'application.
  new.status   := old.status;
  new.owner_id := old.owner_id;
  new.id       := old.id;

  return new;
end;
$$;

create trigger merchants_guard_update
  before update on public.merchants
  for each row execute function public.guard_merchant_update();

-- Une notification est écrite par le serveur : le destinataire ne peut
-- qu'en changer l'état de lecture.
create or replace function public.guard_notification_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  new.id             := old.id;
  new.profile_id     := old.profile_id;
  new.merchant_id    := old.merchant_id;
  new.program_id     := old.program_id;
  new.transaction_id := old.transaction_id;
  new.kind           := old.kind;
  new.title          := old.title;
  new.body           := old.body;
  new.data           := old.data;
  new.pushed_at      := old.pushed_at;
  new.created_at     := old.created_at;

  return new;  -- seul read_at reste modifiable
end;
$$;

create trigger notifications_guard_update
  before update on public.notifications
  for each row execute function public.guard_notification_update();
