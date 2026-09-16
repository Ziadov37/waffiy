-- =============================================================================
-- Waffiy — 0008 · Politiques de sécurité au niveau ligne
-- =============================================================================
-- Deux invariants structurants, dont dépend la validité des règles métier :
--
--   1. AUCUN rôle applicatif ne peut écrire dans program_progress ni dans
--      transactions. Les seuls chemins d'écriture sont les fonctions
--      SECURITY DEFINER de la migration suivante. C'est ce qui rend la règle
--      métier 1 — « une visite ne peut être créditée que par un commerçant » —
--      vraie même si quelqu'un se munit de la clé anonyme et appelle l'API
--      directement.
--
--   2. Toute politique porte « or auth_is_platform_admin() ». Le back-office
--      de la phase 2 n'exigera donc aucune réécriture des politiques.
--
-- Le rôle anon n'obtient rien : toutes les politiques visent « authenticated ».

alter table public.profiles         enable row level security;
alter table public.merchants        enable row level security;
alter table public.programs         enable row level security;
alter table public.memberships      enable row level security;
alter table public.program_progress enable row level security;
alter table public.transactions     enable row level security;
alter table public.notifications    enable row level security;
alter table public.push_tokens      enable row level security;
alter table public.app_settings     enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
-- Volontairement limité à soi-même. Un commerçant a besoin du nom de ses
-- clients, mais pas de leur téléphone ni de leur email : la RLS filtre les
-- lignes, pas les colonnes. Cette lecture passe donc par la vue
-- merchant_customers, définie plus bas, qui ne sélectionne que le nécessaire.

create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.auth_is_platform_admin());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.auth_is_platform_admin())
  with check (id = auth.uid() or public.auth_is_platform_admin());

-- Pas de politique INSERT : le profil naît du déclencheur sur auth.users.
-- Pas de politique DELETE : la suppression de compte passe par une
-- anonymisation (deleted_at), pour ne pas trouer la comptabilité du commerçant.

-- -----------------------------------------------------------------------------
-- merchants
-- -----------------------------------------------------------------------------

-- Un commerce est visible de son exploitant et de ses clients encartés.
-- Il n'existe volontairement PAS d'annuaire public : la découverte de
-- commerces par géolocalisation est hors périmètre (Q11), et un annuaire
-- ouvert exposerait les join_code de tous les commerces.
create policy merchants_select on public.merchants
  for select to authenticated
  using (
    owner_id = auth.uid()
    or public.auth_is_member_of(id)
    or public.auth_is_platform_admin()
  );

-- Chacun crée son commerce, et uniquement le sien.
create policy merchants_insert_own on public.merchants
  for insert to authenticated
  with check (owner_id = auth.uid());

-- Les colonnes status et owner_id sont neutralisées par le déclencheur
-- merchants_guard_update : un commerce suspendu ne peut pas se réactiver.
create policy merchants_update_own on public.merchants
  for update to authenticated
  using (public.auth_is_merchant_operator(id) or public.auth_is_platform_admin())
  with check (public.auth_is_merchant_operator(id) or public.auth_is_platform_admin());

-- Pas de DELETE : un commerce se suspend, il ne s'efface pas.

-- -----------------------------------------------------------------------------
-- programs
-- -----------------------------------------------------------------------------

-- Le client ne voit que les programmes actifs des commerces où il est encarté :
-- un brouillon reste invisible jusqu'à sa publication (C8).
create policy programs_select on public.programs
  for select to authenticated
  using (
    public.auth_is_merchant_operator(merchant_id)
    or (status = 'active' and public.auth_is_member_of(merchant_id))
    or public.auth_is_platform_admin()
  );

create policy programs_insert on public.programs
  for insert to authenticated
  with check (public.auth_is_merchant_operator(merchant_id));

create policy programs_update on public.programs
  for update to authenticated
  using (public.auth_is_merchant_operator(merchant_id))
  with check (public.auth_is_merchant_operator(merchant_id));

-- La suppression n'est possible que tant qu'aucune transaction ne référence le
-- programme : la clé étrangère « on delete restrict » s'en charge. Au-delà,
-- il faut l'archiver.
create policy programs_delete on public.programs
  for delete to authenticated
  using (public.auth_is_merchant_operator(merchant_id));

-- -----------------------------------------------------------------------------
-- memberships — la carte
-- -----------------------------------------------------------------------------

create policy memberships_select on public.memberships
  for select to authenticated
  using (
    profile_id = auth.uid()
    or public.auth_is_merchant_operator(merchant_id)
    or public.auth_is_platform_admin()
  );

-- Aucune écriture. Une carte naît exclusivement de join_merchant(), appelée
-- par le client lui-même après avoir scanné le QR du commerce (décision D5).
-- Sans cette absence de politique, un commerçant pourrait inscrire des clients
-- à leur insu.

-- -----------------------------------------------------------------------------
-- program_progress — le solde
-- -----------------------------------------------------------------------------

create policy program_progress_select on public.program_progress
  for select to authenticated
  using (
    profile_id = auth.uid()
    or public.auth_is_merchant_operator(merchant_id)
    or public.auth_is_platform_admin()
  );

-- AUCUNE politique d'écriture, pour personne. Invariant n° 1.
revoke insert, update, delete on public.program_progress from anon, authenticated;

-- -----------------------------------------------------------------------------
-- transactions — le registre
-- -----------------------------------------------------------------------------

create policy transactions_select on public.transactions
  for select to authenticated
  using (
    profile_id = auth.uid()
    or public.auth_is_merchant_operator(merchant_id)
    or public.auth_is_platform_admin()
  );

-- AUCUNE politique d'écriture. Le déclencheur transactions_immutable interdit
-- en plus toute modification, y compris au propriétaire de la base.
revoke insert, update, delete on public.transactions from anon, authenticated;

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (profile_id = auth.uid());

-- Seul read_at est réellement modifiable : le reste est neutralisé par le
-- déclencheur notifications_guard_update.
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

revoke insert, delete on public.notifications from anon, authenticated;

-- -----------------------------------------------------------------------------
-- push_tokens
-- -----------------------------------------------------------------------------
-- L'appareil enregistre et retire son propre jeton.

create policy push_tokens_select_own on public.push_tokens
  for select to authenticated
  using (profile_id = auth.uid());

create policy push_tokens_insert_own on public.push_tokens
  for insert to authenticated
  with check (profile_id = auth.uid());

create policy push_tokens_update_own on public.push_tokens
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy push_tokens_delete_own on public.push_tokens
  for delete to authenticated
  using (profile_id = auth.uid());

-- -----------------------------------------------------------------------------
-- app_settings
-- -----------------------------------------------------------------------------
-- RLS activée, aucune politique : personne n'y accède par l'API. Seules les
-- fonctions SECURITY DEFINER la lisent. C'est le sens de « paramétrable côté
-- serveur » de la règle métier 6 — un commerçant ne peut pas raccourcir
-- lui-même son délai anti-fraude.

revoke all on public.app_settings from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Vue : les clients d'un commerce
-- -----------------------------------------------------------------------------
-- Alimente l'écran « Clients » et la fiche client. Sélectionne délibérément
-- un sous-ensemble de colonnes : le commerçant obtient le nom et la
-- progression, jamais le téléphone, l'email, ni les commerces concurrents
-- fréquentés par son client.
--
-- security_invoker = false (défaut en Postgres 15+) : la vue contourne la RLS
-- des tables sous-jacentes. C'est voulu, et c'est pourquoi elle porte sa
-- propre garde dans le WHERE. Sans cette garde, elle exposerait tout.

create view public.merchant_customers
with (security_invoker = false)
as
select
  mb.merchant_id,
  mb.profile_id,
  mb.joined_at,
  mb.last_activity_at,
  p.first_name,
  p.last_name,
  p.public_code,
  p.avatar_url,
  coalesce(sum(pr.lifetime_stamps), 0)::int   as total_visits,
  coalesce(sum(pr.rewards_redeemed), 0)::int  as rewards_redeemed,
  coalesce(bool_or(pr.stamps >= pg.threshold), false) as has_reward_available
from public.memberships mb
join public.profiles p
  on p.id = mb.profile_id
left join public.program_progress pr
  on pr.profile_id = mb.profile_id
 and pr.merchant_id = mb.merchant_id
left join public.programs pg
  on pg.id = pr.program_id
 and pg.status = 'active'
where public.auth_is_merchant_operator(mb.merchant_id)   -- ← la garde
   or public.auth_is_platform_admin()
group by
  mb.merchant_id, mb.profile_id, mb.joined_at, mb.last_activity_at,
  p.first_name, p.last_name, p.public_code, p.avatar_url;

comment on view public.merchant_customers is
  'Vue commerçant de ses clients. Ni téléphone, ni email, ni commerces concurrents.';

revoke all on public.merchant_customers from anon;
grant select on public.merchant_customers to authenticated;
