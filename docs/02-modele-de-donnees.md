# Étape 1 — Modèle de données

Postgres 15 (Supabase). Tout est en `public`, sauf mention contraire. Les identifiants sont des
`uuid` générés par `gen_random_uuid()`. Toutes les tables portent `created_at timestamptz not null
default now()`, et `updated_at` là où une mise à jour est possible (maintenu par déclencheur).

Le modèle est conçu pour que le **back-office super admin de la phase 2 s'y greffe sans refonte** :
voir § 9.

---

## 0. Décisions d'architecture validées

| # | Décision | Effet sur le schéma |
|---|---|---|
| D1 | **Authentification par code à usage unique envoyé par email**, sans mot de passe | Aucune colonne mot de passe ; `auth.users.email` est l'identifiant unique. Voir § 15. |
| D2 | **Le rôle est une capacité dérivée**, pas une colonne | Pas de `profiles.role` ; commerçant ⇔ `merchants.owner_id = auth.uid()` |
| D3 | **Code client aléatoire et statique, sans donnée personnelle** | `profiles.public_code`, 10 caractères aléatoires ; le QR ne porte que ce code |
| D4 | **Pas de gestion d'équipe** | Pas de table `merchant_staff` ; `merchants.owner_id` ; `transactions.actor_profile_id` en audit seul |

---

## 1. Types énumérés

```
merchant_category : restaurant | cafe | fast_food | bakery | beauty | retail | other
program_status    : draft | active | archived
transaction_kind  : credit | redeem | adjust
notification_kind : visit_credited | reward_unlocked | reward_redeemed | almost_there | system
merchant_status   : active | suspended          -- levier super admin
```

`archived` plutôt qu'une suppression : un programme supprimé casserait l'historique des transactions
qui le référencent.

---

## 2. `profiles` — un compte, client comme commerçant

Extension 1–1 de `auth.users`. Créée par un déclencheur `on auth.users insert`.

| Colonne | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | → `auth.users(id)` `on delete cascade` |
| `first_name` | `text` not null | |
| `last_name` | `text` not null | |
| `phone` | `text` unique | nullable — non vérifié en phase 1 (voir C1) |
| `email` | `text` | copie dénormalisée de `auth.users.email`, pour l'affichage |
| `avatar_url` | `text` | |
| `public_code` | `text` not null unique | identifiant du QR client — **aléatoire**, pas séquentiel (voir C3) |
| `locale` | `text` not null default `'fr'` | |
| `is_platform_admin` | `boolean` not null default `false` | crochet phase 2 |
| `deleted_at` | `timestamptz` | anonymisation RGPD sans perte du registre |

Index : `unique(public_code)`, `unique(phone) where phone is not null`.

`public_code` : 10 caractères en base32 sans caractères ambigus (`0`, `O`, `1`, `I`, `L`), soit
environ 5 × 10¹⁴ combinaisons. Affiché `WFY-XXXXX-XXXXX`. Assez d'entropie pour rendre l'énumération
inutile, assez court pour être dicté au téléphone en cas de panne de caméra (le design prévoit une
« Recherche manuelle »).

**Pas de colonne `role`.** Le rôle est dérivé : tout compte est client ; un compte est commerçant s'il
est propriétaire d'un commerce (`merchants.owner_id = auth.uid()`). **Décision validée : le rôle est
une capacité dérivée** (C4), ce qui permet à un commerçant de collecter aussi des tampons ailleurs.

---

## 3. `merchants` — le commerce

| Colonne | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text` not null | |
| `category` | `merchant_category` not null | |
| `city` | `text` not null | |
| `phone` | `text` | |
| `logo_url` | `text` | Supabase Storage, bucket public `merchant-logos` |
| `join_code` | `text` not null unique | charge utile du QR d'inscription en vitrine |
| `status` | `merchant_status` not null default `'active'` | suspension par le super admin |
| `timezone` | `text` not null default `'Africa/Algiers'` | compteurs « du jour » (C9) |
| `min_credit_interval_seconds` | `int` | `null` = hérite du réglage global (règle 6) |
| `owner_id` | `uuid` not null → `profiles(id)` | **le compte unique du commerce** (voir § 4) |

Index : `unique(join_code)`, `(owner_id)` — lu par **chaque** vérification RLS —, `(status)`,
`(city, category)` pour la découverte future.

---

## 4. Équipe — écartée par décision

Le cahier des charges prévoyait une attribution des actions à un membre du personnel (règle 5). Vous
avez tranché pour la suppression : **un commerce = un compte**, porté par `merchants.owner_id`.

Conséquences assumées :
- l'historique de la fiche client perd sa colonne « Karim / Amina » par rapport au prototype ;
- l'entrée « Équipe — 3 membres » disparaît de l'écran Réglages ;
- en caisse, plusieurs personnes partagent le même compte.

Ce qui est malgré tout conservé : `transactions.actor_profile_id`, colonne d'**audit pure, jamais
affichée dans l'application**. Elle vaudra toujours `owner_id` en phase 1, et permettra au super
admin d'enquêter sur une fraude en phase 2 sans migration du registre.

Réintroduire une équipe plus tard restera une migration additive : une table pivot
`merchant_staff(merchant_id, profile_id, role)`, et `auth_is_merchant_operator()` interroge la table
au lieu de `merchants.owner_id`. Aucune donnée historique n'est perdue puisque `actor_profile_id`
existe déjà.

---

## 5. `programs` — les programmes de fidélité

| Colonne | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `merchant_id` | `uuid` not null → `merchants` `on delete cascade` | |
| `name` | `text` not null | « Burger gratuit » — c'est le libellé de la récompense |
| `emoji` | `text` not null default `'🎁'` | |
| `description` | `text` | |
| `threshold` | `int` not null | `check between 2 and 50` |
| `status` | `program_status` not null default `'draft'` | |
| `surface_color` / `border_color` | `text` | « Apparence de la carte » du design |
| `sort_order` | `int` not null default 0 | |

Index : `(merchant_id, status)`, `(merchant_id, sort_order)`.

---

## 6. `memberships` — la carte de fidélité

Une ligne par couple (client, commerce). **C'est l'objet « carte » de l'interface** : le design
montre une carte par commerce, qui agrège plusieurs programmes.

| Colonne | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `profile_id` | `uuid` not null → `profiles` | |
| `merchant_id` | `uuid` not null → `merchants` | |
| `joined_at` | `timestamptz` not null default `now()` | « Cliente depuis mars 2026 » |
| `last_activity_at` | `timestamptz` | tri de « Mes cartes » et de « Clients » |

Contrainte : `unique(profile_id, merchant_id)`.
Index : `(profile_id, last_activity_at desc)`, `(merchant_id, last_activity_at desc)`.

---

## 7. `program_progress` — le solde de tampons

Une ligne par couple (client, programme). **Aucune écriture directe : uniquement par les fonctions.**

| Colonne | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `profile_id` | `uuid` not null → `profiles` | |
| `program_id` | `uuid` not null → `programs` | |
| `merchant_id` | `uuid` not null → `merchants` | dénormalisé : évite une jointure dans **chaque** politique RLS |
| `stamps` | `int` not null default 0 | `check (stamps >= 0)` — solde courant |
| `lifetime_stamps` | `int` not null default 0 | cumul, jamais décrémenté (statistique « Total visites ») |
| `rewards_redeemed` | `int` not null default 0 | |
| `last_credit_at` | `timestamptz` | **c'est la colonne que lit l'anti-fraude** (règle 6) |

Contrainte : `unique(profile_id, program_id)`.
Index : `(merchant_id, program_id)`, `(profile_id)`, et un index partiel
`(merchant_id) where stamps > 0` pour le filtre « Récompense disponible » de la liste clients.

La dénormalisation de `merchant_id` est un choix assumé : sans elle, chaque vérification RLS
déclencherait une jointure sur `programs`, sur le chemin critique de tous les écrans commerçant.
Un déclencheur garantit sa cohérence avec `programs.merchant_id`.

---

## 8. `transactions` — le registre, source de vérité

**Append-only.** Aucune politique `update` ni `delete`, pour personne. Le solde de
`program_progress` est un cache dérivable de cette table — en cas de doute, c'est le registre qui
fait foi, et il est rejouable.

| Colonne | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `merchant_id` | `uuid` not null → `merchants` | |
| `program_id` | `uuid` not null → `programs` | |
| `profile_id` | `uuid` not null → `profiles` | le client |
| `actor_profile_id` | `uuid` not null → `profiles` | **audit uniquement, jamais affiché** (voir § 4) |
| `kind` | `transaction_kind` not null | |
| `delta` | `int` not null | `+1` au crédit, `-seuil` à la consommation |
| `stamps_before` / `stamps_after` | `int` not null | audit, et reconstruction sans rejeu |
| `threshold_at_time` | `int` not null | **instantané du seuil** — l'historique reste vrai si le seuil change (règle 4) |
| `reward_label` | `text` | instantané du nom de la récompense, au `redeem` |
| `client_request_id` | `uuid` not null unique | **clé d'idempotence** — le cœur du hors ligne (C5) |
| `source` | `text` not null default `'scan'` | `scan`, `manual`, `offline_sync` |
| `note` | `text` | motif d'un `adjust` |
| `created_at` | `timestamptz` not null default `now()` | horodatage (règle 5) |

Index :
- `unique(client_request_id)` — **c'est cette contrainte qui rend le rejeu hors ligne inoffensif**
- `(merchant_id, created_at desc)` — flux d'activité
- `(profile_id, created_at desc)` — historique client
- `(program_id, profile_id, created_at desc)` — fiche client
- `(merchant_id, kind, created_at)` — statistiques du dashboard

Les instantanés (`threshold_at_time`, `reward_label`) sont volontairement
redondants. Un registre qui se relit à travers des jointures vers des lignes modifiables depuis
raconte une histoire fausse.

---

## 9. `notifications`

| Colonne | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `profile_id` | `uuid` not null → `profiles` | destinataire |
| `merchant_id` / `program_id` | `uuid` | contexte, nullable |
| `transaction_id` | `uuid` → `transactions` | trace vers l'action d'origine |
| `kind` | `notification_kind` not null | l'emoji et la teinte en découlent côté client |
| `title` / `body` | `text` not null | rendus en français côté serveur |
| `data` | `jsonb` not null default `'{}'` | charge de lien profond |
| `read_at` | `timestamptz` | |
| `pushed_at` | `timestamptz` | date d'envoi effectif à Expo |

Index : `(profile_id, created_at desc)`, `(profile_id) where read_at is null` (le compteur du
badge), `(id) where pushed_at is null` (la file d'envoi push).

---

## 10. `push_tokens`

| Colonne | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `profile_id` | `uuid` not null → `profiles` `on delete cascade` | |
| `token` | `text` not null unique | `ExponentPushToken[…]` |
| `platform` | `text` not null | `ios` / `android` |
| `device_id` | `text` | |
| `last_seen_at` | `timestamptz` not null default `now()` | |
| `disabled_at` | `timestamptz` | mis à jour quand Expo renvoie `DeviceNotRegistered` |

---

## 11. `app_settings` — paramétrage serveur global

| Colonne | Type |
|---|---|
| `key` | `text` PK |
| `value` | `jsonb` not null |
| `updated_at` | `timestamptz` |

Valeurs initiales :

| Clé | Valeur | Rôle |
|---|---|---|
| `min_credit_interval_seconds` | `300` | délai anti-fraude par défaut (règle 6), surchargeable par commerce |
| `almost_there_remaining` | `1` | déclenche la notification « Plus qu'une visite ! » |
| `max_credit_per_call` | `1` | plafond de visites par appel (voir Q7) |

Aucune politique RLS : la table n'est lisible que par les fonctions `SECURITY DEFINER` et, en
phase 2, par le super admin. C'est le sens de « paramétrable côté serveur ».

---

## 12. Fonctions Postgres — toute la logique sensible

Toutes en `SECURITY DEFINER`, `search_path = public, pg_temp`, propriétaire dédié.

### Assistants de RLS
```
auth_is_merchant_operator(p_merchant uuid) → boolean  -- STABLE, vrai si auth.uid() = merchants.owner_id
auth_is_platform_admin()          → boolean      -- crochet phase 2
```

### `credit_visit(p_client_code text, p_program uuid, p_request_id uuid, p_count int default 1)`

1. résout le client depuis son `public_code` ;
2. vérifie que l'appelant exploite bien le commerce du programme — **sinon `FORBIDDEN`**
   (règle 1 : jamais le client) ;
3. vérifie `programs.status = 'active'` et `merchants.status = 'active'` (C8) ;
4. **idempotence** : si une transaction porte déjà `p_request_id`, elle est renvoyée telle quelle,
   sans second crédit ;
5. crée `membership` et `program_progress` si absents (première visite en caisse, Q5) ;
6. `select … for update` sur la ligne de progression ;
7. **anti-fraude** : si `now() - last_credit_at < intervalle` → `RATE_LIMITED` avec le temps restant ;
8. insère la transaction, met à jour le solde, met à jour `membership.last_activity_at` ;
9. insère la notification `visit_credited`, ou `reward_unlocked` si le seuil est franchi, ou
   `almost_there` s'il reste exactement une visite ;
10. renvoie `{stamps_after, threshold, reward_available, transaction_id}`.

Le tout dans **une seule transaction** : une erreur à l'étape 9 annule le crédit de l'étape 8.

### `redeem_reward(p_client_code text, p_program uuid, p_request_id uuid)`

Mêmes contrôles d'accès et même idempotence, puis :
- refuse si `stamps < threshold` → `INSUFFICIENT_STAMPS` ;
- `delta = -threshold` — **le surplus est conservé** : 11 tampons sur un seuil de 10 laissent 1
  (règle 3) ;
- jamais appelée automatiquement : seul un geste du commerçant la déclenche (règle 2) ;
- notification `reward_redeemed`.

### `join_merchant(p_join_code text)`

Appelée par le **client** quand il scanne le QR de la vitrine. Crée la `membership` et une ligne de
`program_progress` pour chaque programme `active` (sous réserve de Q6). Idempotente.

### `resolve_client_for_scan(p_client_code text, p_merchant uuid)`

Renvoie une **vue restreinte** du client scanné : prénom, initiales, date d'adhésion, et la
progression sur chaque programme actif du commerce, triée par ratio `stamps/threshold` décroissant
(C6). Ne renvoie ni téléphone, ni email, ni les commerces concurrents. Protégée par le délai
anti-fraude sur les appels répétés, pour ne pas devenir un oracle d'énumération.

### `set_program_threshold(p_program uuid, p_threshold int)`

Renvoie d'abord le nombre de clients ayant une progression en cours — c'est ce qui alimente
l'avertissement de la règle 4. L'appel effectif exige un drapeau `p_confirmed`.

---

## 13. Sécurité au niveau ligne — principes

| Table | Client | Exploitant du commerce | Écriture directe |
|---|---|---|---|
| `profiles` | la sienne | vue restreinte via fonction | soi-même |
| `merchants` | lecture publique des `active`, colonnes limitées | son commerce | le propriétaire |
| `programs` | les `active` des commerces où il est inscrit | les siens | le propriétaire |
| `memberships` | les siennes | celles de son commerce | fonctions uniquement |
| `program_progress` | les siennes | celles de son commerce | **aucune** — fonctions uniquement |
| `transactions` | les siennes | celles de son commerce | **aucune** — append-only par fonction |
| `notifications` | les siennes | ✗ | `update read_at` sur les siennes |
| `push_tokens` | les siens | ✗ | les siens |
| `app_settings` | ✗ | ✗ | ✗ |

Deux règles structurantes :
1. **Aucun rôle applicatif ne peut écrire dans `program_progress` ni `transactions`.** Les seuls
   chemins d'écriture sont les fonctions `SECURITY DEFINER`. C'est ce qui rend la règle 1 vraie
   même si un client bricole la clé anonyme.
2. Les politiques passent toutes par `auth_is_merchant_operator()`, déclarée `STABLE SECURITY
   DEFINER`, pour éviter qu'une politique sur `merchants` ne relise `merchants` récursivement.

---

## 14. Greffe du back-office super admin (phase 2)

Prévu sans refonte :
- `profiles.is_platform_admin` + `auth_is_platform_admin()` : chaque politique reçoit une clause
  `or auth_is_platform_admin()` ajoutée en une migration, sans toucher au schéma ;
- `merchants.status = 'suspended'` : le levier de suspension existe déjà et est vérifié par
  `credit_visit` ;
- `app_settings` : les paramètres globaux sont déjà externalisés, pas codés en dur ;
- `transactions` immuable et attribuée : la piste d'audit que réclamera l'administration est déjà
  produite par la phase 1 ;
- `programs.status = 'archived'` : désactivation sans suppression, donc sans trou dans l'historique ;
- `transactions.actor_profile_id` : le registre sait déjà quel compte a agi, même si l'application ne
  l'affiche jamais.

Ce qu'il restera à ajouter en phase 2 : une table `audit_log` pour les actions de l'administrateur
lui-même, et des vues matérialisées pour les statistiques agrégées inter-commerces.

---

## 15. Authentification — code à usage unique par email (D1)

Flux retenu : `signInWithOtp({ email })` puis `verifyOtp({ email, token, type: 'email' })`.
**Code à 6 chiffres, pas de lien magique** — un lien magique impose un lien profond, fragile sur
mobile et cassé si l'email s'ouvre dans un autre navigateur que celui de l'appareil.

Conséquences sur le design :
- les champs « Mot de passe » et le lien « Mot de passe oublié ? » disparaissent des écrans de
  connexion client et commerçant ;
- l'inscription client reste en 2 étapes, mais l'étape 2 devient la saisie du code reçu par email
  au lieu du code SMS ;
- l'inscription commerçant reste en 3 étapes, la dernière ne demandant plus qu'un email.

**Point de vigilance sur le palier gratuit.** Le serveur d'email intégré à Supabase est bridé à
quelques envois par heure et explicitement réservé au développement : en l'état, une connexion par
code échouerait dès les premiers utilisateurs réels. Il faut donc configurer un **SMTP externe
gratuit** dès l'étape 2 :

| Fournisseur | Palier gratuit | Remarque |
|---|---|---|
| Brevo | 300 emails/jour, permanent | recommandé — le quota quotidien ne s'épuise pas |
| Resend | 3 000 emails/mois | quota mensuel, plus vite atteint |
| Mailjet | 200 emails/jour | fiable, interface plus austère |

La configuration SMTP vit dans les réglages du projet Supabase, jamais dans le code mobile.

Table de session : aucune. Supabase gère `auth.sessions` ; le jeton de rafraîchissement est stocké
côté appareil dans `expo-secure-store`, chiffré par le trousseau système.
