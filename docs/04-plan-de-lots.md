# Plan de lots — découpage en petites tâches

Chaque tâche vise **un commit atomique**. Les étapes correspondent à la méthode de travail du cahier
des charges ; je m'arrête à la fin de chacune pour votre validation.

Légende : ⬜ à faire · 🟦 en cours · ✅ fait

---

## Étape 1 — Cadrage ✅

| # | Tâche | État |
|---|---|---|
| 1.1 | Décompresser et analyser `Waffiy App.html`, inventorier les 28 écrans | ✅ |
| 1.2 | Extraire les jetons visuels et les composants nommés | ✅ |
| 1.3 | Critique argumentée du stack, contradictions, questions ouvertes | ✅ |
| 1.4 | Modèle de données complet | ✅ |
| 1.5 | Arborescence de fichiers et conventions | ✅ |
| 1.6 | Ce plan de lots | ✅ |
| 1.7 | Arbitrage des 4 questions bloquantes et propagation dans les documents | ✅ |

---

## Étape 2 — Base de données

| # | Tâche | Livrable |
|---|---|---|
| 2.0 | Configurer un SMTP gratuit (Brevo) pour les codes de connexion par email | réglage projet |
| 2.1 | Initialiser Supabase local (`supabase init`), `config.toml` | commit |
| 2.2 | Migration `0001` — types énumérés et extensions | commit |
| 2.3 | Migration `0002` — `profiles` + déclencheur sur `auth.users` + génération du `public_code` | commit |
| 2.4 | Migration `0003` — `merchants` (`owner_id`, `join_code`, `timezone`, délai anti-fraude) | commit |
| 2.5 | Migration `0004` — `programs`, `memberships`, `program_progress` | commit |
| 2.6 | Migration `0005` — `transactions` (append-only), index, clé d'idempotence | commit |
| 2.7 | Migration `0006` — `notifications`, `push_tokens`, `app_settings` + valeurs initiales | commit |
| 2.8 | Migration `0007` — assistants RLS `auth_is_merchant_operator`, `auth_is_platform_admin` | commit |
| 2.9 | Migration `0008` — **toutes les politiques RLS, commentées ligne à ligne** | commit |
| 2.10 | Migration `0009` — `credit_visit` (idempotence, verrou, anti-fraude, notifications) | commit |
| 2.11 | Migration `0010` — `redeem_reward` (conservation du surplus) | commit |
| 2.12 | Migration `0011` — `join_merchant` (seule voie d'inscription), `resolve_client_for_scan`, `set_program_threshold` | commit |
| 2.13 | `seed.sql` — Burger House, Coffee Lab, Beauty Studio, Sarah et 4 clients, historique | commit |
| 2.14 | Tests SQL (pgTAP ou script) : les 7 règles métier vérifiées une par une | commit |

**Critère de sortie :** un client qui utilise la clé anonyme ne peut ni s'ajouter une visite, ni lire
la progression d'un autre client, ni consommer une récompense. Prouvé par un test.

---

## Étape 3 — Socle applicatif

| # | Tâche |
|---|---|
| 3.1 | `npx create-expo-app` (SDK 57), nettoyage du gabarit |
| 3.2 | TypeScript strict : `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, alias `@/*` |
| 3.3 | ESLint + Prettier + script `npm run check` |
| 3.4 | Thème : couleurs, typographie, espacements, rayons, ombres — extraits du prototype |
| 3.5 | Polices Manrope + écran de démarrage retenu jusqu'au chargement |
| 3.6 | Client Supabase avec stockage `expo-secure-store` |
| 3.7 | Génération des types (`npm run types:gen`) + contrôle de dérive |
| 3.8 | `QueryClient` + persistance + `app/_layout.tsx` avec les fournisseurs |
| 3.9 | Squelette de navigation : les 3 groupes de routes, écrans vides |
| 3.10 | Composants `ui/` de base : boutons, champ, carte, écran, barre |
| 3.11 | `.env.example` + `app.config.ts` + README installation |

---

## Étape 4 — Authentification

| # | Tâche |
|---|---|
| 4.1 | Écran `welcome` conforme au design |
| 4.2 | Écrans de choix de rôle (inscription et connexion) |
| 4.3 | Connexion par code à usage unique : saisie email → champ à 6 chiffres, renvoi, erreurs en français |
| 4.4 | Inscription client (2 étapes) + création du profil |
| 4.5 | Inscription commerçant étape 1 — commerce et catégorie |
| 4.6 | Inscription commerçant étape 2 — premier programme avec aperçu client |
| 4.7 | Inscription commerçant étape 3 — email du propriétaire, vérification, création transactionnelle |
| 4.8 | Gestion de session : reprise, rafraîchissement, déconnexion |
| 4.9 | Gardes de route et redirection selon le rôle |
| 4.10 | Téléversement du logo vers Storage |

---

## Étape 5 — Parcours client

| # | Tâche |
|---|---|
| 5.1 | Accueil — salutation, carte principale, statistiques |
| 5.2 | `LoyaltyCard` + `ProgressStampGrid` (pastilles ≤ 12) + `ProgressBar` (> 12) |
| 5.3 | Liste « Mes cartes » + état vide |
| 5.4 | Détail de carte + sélecteur d'autres programmes du commerce |
| 5.5 | QR plein écran + élévation de luminosité + accès en un appui depuis la barre d'onglets |
| 5.6 | Scanner le QR d'un commerce → `join_merchant` → la carte apparaît (unique voie d'inscription) |
| 5.7 | Écran « Récompense débloquée » |
| 5.8 | « Mes récompenses » — disponibles + historique |
| 5.9 | Liste des notifications + compteur de non-lues |
| 5.10 | Profil + déconnexion |
| 5.11 | Abonnement Realtime : la progression se met à jour pendant que le client regarde son écran |

---

## Étape 6 — Parcours commerçant

| # | Tâche |
|---|---|
| 6.1 | Dashboard — 4 statistiques + activité récente |
| 6.2 | Bouton SCAN dominant + barre d'onglets commerçant |
| 6.3 | Écran caméra (`CameraView`), cadre de visée, retour haptique |
| 6.4 | Recherche manuelle par code client (repli hors caméra) |
| 6.5 | Écran « Client identifié » + sélection du programme le plus avancé |
| 6.5b | État « Client non inscrit » → bouton d'ouverture directe du QR d'inscription |
| 6.6 | Modale de confirmation d'ajout + appel `credit_visit` |
| 6.7 | Écran « Récompense disponible » + « Plus tard » |
| 6.8 | Modale de confirmation de consommation + appel `redeem_reward` |
| 6.9 | Modales de succès et d'erreur réseau avec « Réessayer » |
| 6.10 | Liste des clients + filtres |
| 6.11 | Fiche client + historique horodaté et attribué |
| 6.12 | Flux d'activité du jour + filtres, dans le fuseau du commerce |
| 6.13 | Liste des programmes + création |
| 6.14 | Édition d'un programme + **avertissement de changement de seuil** (règle 4) |
| 6.15 | Écran « QR d'inscription » + impression et partage |
| 6.16 | Réglages du commerce (sans entrée « Équipe » — voir décision Q3) |

---

## Étape 7 — Notifications push

| # | Tâche |
|---|---|
| 7.1 | Enregistrement du jeton Expo + table `push_tokens` |
| 7.2 | Edge Function `send-push` — lot, réessais, gestion de `DeviceNotRegistered` |
| 7.3 | Webhook de base sur `notifications` → Edge Function |
| 7.4 | Liens profonds : ouvrir la bonne carte depuis une notification |
| 7.5 | Bannière en avant-plan conforme au design |
| 7.6 | Permissions et repli propre en cas de refus |

---

## Étape 8 — Finitions

| # | Tâche |
|---|---|
| 8.1 | Squelettes de chargement sur tous les écrans de liste |
| 8.2 | File d'attente hors ligne + rejeu idempotent + badge « En attente de synchronisation » |
| 8.3 | Bannière hors ligne et dégradation des actions indisponibles |
| 8.4 | Frontière d'erreur + messages en français pour chaque code serveur |
| 8.5 | Accessibilité : libellés, contrastes, cibles ≥ 44 pt, tailles de police système |
| 8.6 | Animations du design : `pop`, `rise`, `drop`, `sweep` |
| 8.7 | Relecture complète de la DA contre le prototype, écran par écran |
| 8.8 | README final : installation, variables, migrations, build de développement |

---

## Ce qui n'est pas dans cette phase

Back-office super admin, découverte de commerces par géolocalisation, statistiques avancées,
export comptable, multilingue, paiement. Le modèle de données les accueille, la phase 1 ne les code pas.
