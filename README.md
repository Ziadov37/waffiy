# Waffiy

Carte de fidélité digitale. Une application mobile, deux rôles : client et commerçant.

> **État : étapes 1 (cadrage) et 2 (base de données) terminées.** L'application Expo n'est pas
> encore initialisée : c'est l'étape 3, qui attend votre validation.

## Documentation

| Document | Contenu |
|---|---|
| [`docs/00-inventaire-design.md`](docs/00-inventaire-design.md) | Les 28 écrans du prototype, jetons visuels, composants |
| [`docs/01-cadrage.md`](docs/01-cadrage.md) | Avis sur le stack, contradictions relevées, **décisions prises**, questions ouvertes |
| [`docs/02-modele-de-donnees.md`](docs/02-modele-de-donnees.md) | Tables, colonnes, index, fonctions, RLS |
| [`docs/03-arborescence.md`](docs/03-arborescence.md) | Arborescence de fichiers et conventions |
| [`docs/04-plan-de-lots.md`](docs/04-plan-de-lots.md) | Découpage en tâches et suivi d'avancement |

Le design de référence est le bundle `Waffiy App.html`, décompressé pour consultation dans
`docs/design/`.

## Décisions structurantes

- **Connexion par code à usage unique reçu par email**, sans mot de passe — l'OTP SMS du design
  imposait un fournisseur payant. Nécessite un SMTP externe gratuit (Brevo) côté Supabase.
- **Le rôle est une capacité dérivée** : tout compte est client, et devient commerçant dès qu'il
  possède un commerce. Un même compte peut donc porter les deux.
- **Le QR client ne contient qu'un code aléatoire**, ni nom ni identifiant séquentiel.
- **Un client obtient sa carte en scannant le QR du commerce**, et lui seul. Il est alors inscrit à
  tous les programmes actifs de ce commerce d'un coup.
- **Pas de gestion d'équipe** : un commerce égale un compte. Cette décision écarte l'attribution des
  actions à un membre du personnel prévue par la règle métier 5 ; voir `docs/01-cadrage.md` § 3.

## Stack

Expo SDK 57 · React Native · TypeScript strict · Expo Router · Supabase (Postgres, Auth, Realtime,
RLS, Edge Functions) · Zustand · TanStack Query · `expo-camera` · `react-native-qrcode-svg` ·
Expo Push Notifications.

## Base de données

Le schéma complet vit dans `supabase/` : 11 migrations, 9 tables, 6 fonctions métier et les
politiques RLS. Toute la logique sensible est côté serveur — l'application mobile ne calcule
aucun solde.

```bash
# Rejouer les migrations, le jeu de démonstration et les tests sur un Postgres jetable.
# Ne nécessite que Docker et psql : la pile Supabase complète n'est pas requise.
supabase/tests/run.sh

# Garder la base debout après les tests, pour l'inspecter :
supabase/tests/run.sh --keep    # puis psql -h 127.0.0.1 -p 55432 -U postgres -d waffiy
```

**62 tests** couvrent les sept règles métier et l'isolation des données. Ils se font passer pour de
vrais utilisateurs (`set role authenticated` plus un JWT simulé) : sans cela ils s'exécuteraient en
superutilisateur, contourneraient la RLS et passeraient pour de mauvaises raisons.

### Fonctions serveur

| Fonction | Rôle |
|---|---|
| `credit_visit` | Crédite une visite. Atomique, réservée au commerçant, idempotente, bornée par le délai anti-fraude. |
| `redeem_reward` | Consomme une récompense. Jamais automatique. Déduit le seuil exact, conserve le surplus. |
| `join_merchant` | Seule voie de création d'une carte. Appelée par le client après scan du QR du commerce. |
| `resolve_client_for_scan` | Vue restreinte du client scanné, programmes triés par avancement. |
| `program_threshold_impact` | Chiffre l'effet d'un changement de seuil, sans rien modifier. |
| `set_program_threshold` | Refuse le changement tant que l'avertissement n'est pas confirmé. |

### Comptes de démonstration

| Compte | Email | Code |
|---|---|---|
| Karim — Burger House | `karim@burgerhouse.dz` | QR d'inscription `BURGER23` |
| Nadir — Coffee Lab | `nadir@coffeelab.dz` | QR d'inscription `CAFE2345` |
| Sarah Benali — cliente | `sarah.benali@example.dz` | QR client `SARAH23456` |
| Amine Kaci — récompense disponible | `amine.kaci@example.dz` | QR client `AMNE234567` |

## Installation de l'application

*À compléter à l'étape 3, quand le projet Expo sera initialisé.*

## Variables d'environnement

Copier `.env.example` en `.env` — *le fichier sera créé à l'étape 3.*

| Variable | Rôle |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme — **seule clé présente dans l'application mobile** |
| `BREVO_SMTP_USER` / `BREVO_SMTP_PASS` | SMTP des codes de connexion. Côté Supabase uniquement, jamais dans l'application. |

La clé de service ne doit jamais apparaître dans le code mobile : elle ne vit que dans les secrets
des Edge Functions.
