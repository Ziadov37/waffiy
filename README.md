# Waffiy

Carte de fidélité digitale. Une application mobile, deux rôles : client et commerçant.

> **État : étape 1 (cadrage) terminée.** Aucun code applicatif n'est encore écrit — c'est
> volontaire, la méthode de travail impose une validation entre chaque étape.

## Documentation

| Document | Contenu |
|---|---|
| [`docs/00-inventaire-design.md`](docs/00-inventaire-design.md) | Les 28 écrans du prototype, jetons visuels, composants |
| [`docs/01-cadrage.md`](docs/01-cadrage.md) | Avis sur le stack, contradictions relevées, questions ouvertes |
| [`docs/02-modele-de-donnees.md`](docs/02-modele-de-donnees.md) | Tables, colonnes, index, fonctions, RLS |
| [`docs/03-arborescence.md`](docs/03-arborescence.md) | Arborescence de fichiers et conventions |
| [`docs/04-plan-de-lots.md`](docs/04-plan-de-lots.md) | Découpage en tâches et suivi d'avancement |

Le design de référence est le bundle `Waffiy App.html`, décompressé pour consultation dans
`docs/design/`.

## Stack

Expo SDK 57 · React Native · TypeScript strict · Expo Router · Supabase (Postgres, Auth, Realtime,
RLS, Edge Functions) · Zustand · TanStack Query · `expo-camera` · `react-native-qrcode-svg` ·
Expo Push Notifications.

## Installation

*À compléter à l'étape 3, quand le projet Expo sera initialisé.*

## Variables d'environnement

Copier `.env.example` en `.env` — *le fichier sera créé à l'étape 3.*

| Variable | Rôle |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme — **seule clé présente dans l'application mobile** |

La clé de service ne doit jamais apparaître dans le code mobile : elle ne vit que dans les secrets
des Edge Functions.
