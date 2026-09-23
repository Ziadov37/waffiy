# Waffiy

Carte de fidélité digitale. Une application mobile, deux rôles : client et commerçant.

Le client cumule **un solde de points par commerce**. Les programmes sont les
récompenses de son catalogue, chacune avec un coût. Avec 15 points : 3 burgers
à 5 points, ou un menu à 10 + un burger, ou une pizza à 15. Le client compose
son choix ; seul le commerçant valide le débit. Voir [le modèle de points](docs/05-points-par-commerce.md).

> **État : le socle, l'authentification et les parcours client et commerçant sont opérationnels.**
> Le QR public HTTPS, les affiches de comptoir, le logo commerce et les accès caissiers séparés sont
> en place. Voir le suivi précis dans `docs/07-backlog-adaptation-algerie.md`.

## Documentation

| Document                                                       | Contenu                                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [`docs/00-inventaire-design.md`](docs/00-inventaire-design.md) | Les 28 écrans du prototype, jetons visuels, composants                               |
| [`docs/01-cadrage.md`](docs/01-cadrage.md)                     | Avis sur le stack, contradictions relevées, **décisions prises**, questions ouvertes |
| [`docs/02-modele-de-donnees.md`](docs/02-modele-de-donnees.md) | Tables, colonnes, index, fonctions, RLS                                              |
| [`docs/03-arborescence.md`](docs/03-arborescence.md)           | Arborescence de fichiers et conventions                                              |
| [`docs/04-plan-de-lots.md`](docs/04-plan-de-lots.md)           | Découpage en tâches et suivi d'avancement                                            |

Le design de référence est le bundle `Waffiy App.html`, décompressé pour consultation dans
`docs/design/`.

## Décisions structurantes

- **Inscription confirmée une seule fois par code email**, puis connexion par email ou téléphone et
  mot de passe. Le téléphone facultatif est un alias résolu côté serveur et l'email associé n'est
  jamais exposé au client.
- **Le rôle est une capacité dérivée** : tout compte est client, et devient commerçant dès qu'il
  possède un commerce. Un même compte peut donc porter les deux.
- **Le QR client ne contient qu'un code aléatoire**, ni nom ni identifiant séquentiel.
- **Un client obtient sa carte en scannant le QR du commerce**, et lui seul. Il est alors inscrit à
  tous les programmes actifs de ce commerce d'un coup.
- **Accès caissiers séparés** : le propriétaire crée des PIN individuels, peut les révoquer
  immédiatement et retrouve l'opérateur dans l'historique de chaque action.

## Stack

Expo SDK 57 · React Native · TypeScript strict · Expo Router · Supabase (Postgres, Auth, Realtime,
RLS, Edge Functions) · Zustand · TanStack Query · `expo-camera` · `react-native-qrcode-svg` ·
Expo Push Notifications.

## Base de données

Le schéma complet vit dans `supabase/` : migrations, tables, fonctions métier et politiques RLS.
Toute la logique sensible est côté serveur — l'application mobile ne calcule aucun solde.

```bash
# Rejouer les migrations, le jeu de démonstration et les tests sur un Postgres jetable.
# Ne nécessite que Docker : le script utilise le client psql de l'image s'il n'est pas installé.
supabase/tests/run.sh

# Garder la base debout après les tests, pour l'inspecter :
supabase/tests/run.sh --keep    # puis psql -h 127.0.0.1 -p 55432 -U postgres -d waffiy
```

**62 tests** couvrent les sept règles métier et l'isolation des données. Ils se font passer pour de
vrais utilisateurs (`set role authenticated` plus un JWT simulé) : sans cela ils s'exécuteraient en
superutilisateur, contourneraient la RLS et passeraient pour de mauvaises raisons.

### Fonctions serveur

| Fonction                   | Rôle                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| `credit_visit`             | Ajoute des points au solde commun du commerce. Atomique, réservée au commerçant et idempotente. |
| `redeem_reward`            | Consomme une récompense. Jamais automatique. Déduit le seuil exact, conserve le surplus.            |
| `redeem_points`            | Valide une quantité de récompenses et débite leur coût du portefeuille commun. |
| `join_merchant`            | Seule voie de création d'une carte. Appelée par le client après scan du QR du commerce.             |
| `resolve_client_for_scan`  | Vue restreinte du client scanné, solde commun et récompenses triées par coût. |
| `program_threshold_impact` | Chiffre l'effet d'un changement de seuil, sans rien modifier.                                       |
| `set_program_threshold`    | Refuse le changement tant que l'avertissement n'est pas confirmé.                                   |
| `create_merchant_staff`    | Crée un accès caissier avec un PIN haché, sans exposer le hash.                                      |
| `open_merchant_staff_session` | Ouvre une session caisse de 12 h, révocable à chaque opération.                                  |

### Comptes de démonstration

Tous les comptes ci-dessous utilisent le mot de passe `WaffiyDemo2026!`. Ces identifiants sont
strictement réservés aux environnements de démonstration et de développement.

| Compte                             | Email                     | Code                        |
| ---------------------------------- | ------------------------- | --------------------------- |
| Karim — Burger House               | `karim@burgerhouse.dz`    | QR d'inscription `BURGER23` |
| Nadir — Coffee Lab                 | `nadir@coffeelab.dz`      | QR d'inscription `CAFE2345` |
| Sarah Benali — cliente             | `sarah.benali@example.dz` | QR client `SARAH23456`      |
| Amine Kaci — récompense disponible | `amine.kaci@example.dz`   | QR client `AMNE234567`      |

Sarah possède trois cartes : **Burger House**, **Coffee Lab** et **Beauty Studio**.
Après préparation, Burger House propose **Burger gratuit** (5 points), **Menu offert**
(10 points), **Pizza offerte** (15 points) et **Boisson offerte** (brouillon).
Pour préparer ce test sur une
base déjà initialisée, sans ajouter de visites ni remettre les soldes à zéro :

```bash
node --env-file=.env scripts/prepare-demo.mjs
```

Ce script configure ces trois récompenses, puis inscrit Sarah aux programmes actifs des
trois commerces. Il peut être relancé sans dupliquer les cartes ou les visites.
Dans Réglages → Programmes de fidélité, le bouton **+** reste fixe en bas à droite.
Ouvrir un programme donne accès à **Supprimer ce programme** avec confirmation :
les programmes sans historique sont supprimés ; ceux déjà utilisés sont archivés
pour conserver le registre et les soldes acquis.

## Installation de l'application

Prérequis : Node.js LTS, npm et une application Supabase configurée. Pour exécuter les tests SQL
locaux, Docker et `psql` sont également nécessaires.

```bash
npm install
cp .env.example .env
# Renseigner les deux variables EXPO_PUBLIC_* dans .env
npm start
```

Depuis le terminal Expo, ouvrir l'application dans un simulateur iOS, un émulateur Android ou Expo
Go. Pour vérifier le projet sans le démarrer :

```bash
npm run check
npx expo export --platform web
```

La page QR publique est hébergée sur GitHub Pages :
`https://seifbgr.github.io/waffiy-web/join/?code=BURGER23`. Pour la republier :

```bash
npm run deploy:web
```

Pour travailler avec Supabase en local :

```bash
npx supabase start
npx supabase db reset   # migrations + seed.sql
```

Avant de tester l'authentification sur un projet hébergé, appliquer les migrations, déployer la
fonction `login-with-phone`, activer **Confirm email**, utiliser le code `{{ .Token }}` dans le
modèle de confirmation et configurer un SMTP externe. Aucun code n'est envoyé lors des connexions
ordinaires.

```bash
npx supabase db push
npx supabase functions deploy login-with-phone --no-verify-jwt
```

## Variables d'environnement

Copier `.env.example` en `.env`. Le fichier `.env` est local et ne doit jamais être committé.

| Variable                              | Rôle                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `EXPO_PUBLIC_APP_URL`                 | Origine web publique utilisée par les QR commerçants (`https://…` en production)           |
| `EXPO_PUBLIC_SUPABASE_URL`            | URL du projet Supabase                                                                     |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`       | Clé anonyme — **seule clé présente dans l'application mobile**                             |
| `BREVO_SMTP_USER` / `BREVO_SMTP_PASS` | SMTP des confirmations d'inscription. Côté Supabase uniquement, jamais dans l'application. |

La clé de service ne doit jamais apparaître dans le code mobile : elle ne vit que dans les secrets
des Edge Functions.
