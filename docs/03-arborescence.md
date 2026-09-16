# Étape 1 — Arborescence de fichiers

Convention : `app/` ne contient **que** des routes Expo Router — un fichier = un écran, le moins de
logique possible. Tout le reste vit dans `src/`, testable sans monter la navigation.

```
waffiy/
├── app/                                  # Expo Router — routage par fichiers
│   ├── _layout.tsx                       # racine : polices, thème, QueryClient, session, file hors ligne
│   ├── index.tsx                         # aiguillage : session ? rôle actif : accueil
│   ├── +not-found.tsx
│   │
│   ├── (auth)/                           # non connecté
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx                   # accueil marketing
│   │   ├── role.tsx                      # inscription — choix du rôle
│   │   ├── role-login.tsx                # connexion — choix du rôle
│   │   ├── login.tsx                     # email + mot de passe (les deux rôles)
│   │   ├── signup-client.tsx             # étape 1 sur 2
│   │   └── signup-merchant/              # étapes 1 à 3
│   │       ├── _layout.tsx               # porte l'état du formulaire multi-étapes
│   │       ├── commerce.tsx              # logo, nom, catégorie, ville, téléphone
│   │       ├── programme.tsx             # seuil, aperçu client, récompense
│   │       └── compte.tsx                # identifiants du propriétaire
│   │
│   ├── (client)/
│   │   ├── _layout.tsx                   # garde : session + carte(s) ; barre d'onglets
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx               # Accueil · Mes cartes · [QR] · Notifs · Profil
│   │   │   ├── index.tsx                 # accueil
│   │   │   ├── cards.tsx                 # mes cartes / état vide
│   │   │   ├── notifications.tsx
│   │   │   └── profile.tsx
│   │   ├── card/[merchantId].tsx         # détail carte — pastilles, autres programmes
│   │   ├── qr.tsx                        # QR plein écran (présentation modale)
│   │   ├── scan-merchant.tsx             # scanner le QR d'un commerce (voir C2)
│   │   ├── unlock/[programId].tsx        # récompense débloquée 🎉
│   │   └── rewards.tsx                   # disponibles + historique des utilisées
│   │
│   └── (merchant)/
│       ├── _layout.tsx                   # garde : membre du personnel actif ; barre d'onglets
│       ├── (tabs)/
│       │   ├── _layout.tsx               # Accueil · Clients · [SCAN] · Activité · Réglages
│       │   ├── index.tsx                 # dashboard
│       │   ├── customers.tsx
│       │   ├── activity.tsx
│       │   └── settings.tsx
│       ├── scan.tsx                      # caméra plein écran + recherche manuelle
│       ├── scanned/[clientCode].tsx      # client identifié — sélecteur de programme
│       ├── reward/[clientCode].tsx       # récompense disponible
│       ├── customer/[clientId].tsx       # fiche client + historique
│       ├── programs/
│       │   ├── index.tsx                 # mes programmes
│       │   ├── new.tsx
│       │   └── [id].tsx                  # édition + avertissement de seuil
│       ├── enroll-qr.tsx                 # QR d'inscription clients
│       └── team.tsx                      # équipe — sous réserve de Q3
│
├── src/
│   ├── components/
│   │   ├── ui/                           # socle neutre
│   │   │   ├── PrimaryButton.tsx  SecondaryButton.tsx  Chip.tsx
│   │   │   ├── TextField.tsx      Badge.tsx            Avatar.tsx
│   │   │   ├── Card.tsx           Screen.tsx           AppBar.tsx
│   │   │   └── Sheet.tsx          Divider.tsx          Skeleton.tsx
│   │   ├── loyalty/                      # métier client
│   │   │   ├── LoyaltyCard.tsx           ProgressStampGrid.tsx
│   │   │   ├── ProgressBar.tsx           RewardCard.tsx
│   │   │   ├── QRCodeCard.tsx            ProgramSwitcher.tsx
│   │   │   └── NotificationItem.tsx
│   │   ├── merchant/
│   │   │   ├── MerchantScanButton.tsx    StatCard.tsx
│   │   │   ├── CustomerCard.tsx          TransactionItem.tsx
│   │   │   ├── ProgramRow.tsx            ThresholdStepper.tsx
│   │   │   └── QRScanner.tsx             # enveloppe de CameraView
│   │   └── feedback/
│   │       ├── ConfirmationModal.tsx     SuccessModal.tsx
│   │       ├── ErrorModal.tsx            EmptyState.tsx
│   │       ├── OfflineBanner.tsx         PendingSyncBadge.tsx
│   │       └── PushToast.tsx
│   │
│   ├── features/                         # un dossier = un domaine
│   │   ├── auth/       api.ts  hooks.ts  schemas.ts  guards.ts
│   │   ├── cards/      api.ts  hooks.ts  selectors.ts
│   │   ├── programs/   api.ts  hooks.ts  schemas.ts
│   │   ├── scan/       api.ts  hooks.ts  useCreditVisit.ts  useRedeemReward.ts
│   │   ├── customers/  api.ts  hooks.ts
│   │   ├── activity/   api.ts  hooks.ts
│   │   └── notifications/ api.ts  hooks.ts  register.ts
│   │
│   ├── lib/
│   │   ├── supabase.ts                   # client + stockage SecureStore
│   │   ├── queryClient.ts                # défauts, persistance, invalidations
│   │   ├── qr.ts                         # encodage / parsing défensif des charges WFY:
│   │   ├── errors.ts                     # codes serveur → messages français
│   │   ├── format.ts                     # dates fr, pluriels, initiales
│   │   ├── brightness.ts                 # élévation temporaire sur l'écran QR
│   │   └── offline/
│   │       ├── queue.ts                  # file d'intentions + clés d'idempotence
│   │       ├── replay.ts                 # rejeu au retour du réseau
│   │       └── network.ts                # NetInfo → état en ligne
│   │
│   ├── stores/                           # Zustand — volontairement mince
│   │   ├── session.ts                    # rôle actif, commerce sélectionné
│   │   ├── scanDraft.ts                  # client scanné + programme choisi
│   │   └── ui.ts                         # modale ouverte, bannières
│   │
│   ├── theme/
│   │   ├── colors.ts  typography.ts  spacing.ts  radius.ts  shadows.ts
│   │   └── index.ts
│   │
│   └── types/
│       ├── database.types.ts             # GÉNÉRÉ — ne jamais éditer à la main
│       └── app.ts                        # types dérivés et types de vue
│
├── supabase/
│   ├── config.toml
│   ├── migrations/                       # 0001_types.sql … 0009_seed_policies.sql
│   ├── functions/
│   │   └── send-push/index.ts            # Edge Function — dispatch Expo Push
│   └── seed.sql                          # jeu de démonstration (Burger House & co.)
│
├── assets/
│   ├── fonts/                            # Manrope 400/500/600/700/800
│   ├── icon.png  splash.png  adaptive-icon.png
│   └── illustrations/
│
├── docs/                                 # ce cadrage + design de référence
├── app.config.ts                         # variables d'environnement, plugins, permissions
├── tsconfig.json                         # strict + noUncheckedIndexedAccess
├── eslint.config.js  .prettierrc
├── .env.example
├── .gitignore
└── README.md
```

## Conventions

- **Aucune requête Supabase dans `app/`.** Un écran appelle un hook de `src/features/*`, jamais le
  client Supabase directement. Cela rend le passage au hors ligne et les tests possibles.
- **Les couleurs ne sont jamais écrites en dur** dans un composant : elles viennent de
  `src/theme/colors.ts`. L'or `#B7791F` est exposé sous le nom `reward`, pour rendre visible à la
  relecture qu'il ne sert qu'à la récompense (contrainte de la DA).
- `src/types/database.types.ts` est régénéré par `npm run types:gen`. Un contrôle CI échoue si le
  fichier diffère du schéma.
- Un composant de `components/ui/` n'importe jamais de `features/`. La dépendance va dans un seul sens.
