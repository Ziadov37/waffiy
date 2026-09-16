# Inventaire du design de référence

Source : `Waffiy App.html` (bundle Claude Design). Décompressé en deux fichiers de référence,
à consulter pendant l'implémentation :

- `docs/design/prototype-markup.html` — le balisage des 28 écrans (templating `sc-if` / `sc-for`)
- `docs/design/prototype-logic.js` — l'état, les règles métier simulées et les jeux de données

Le prototype est la **source de vérité visuelle**. Le cahier des charges est la source de vérité
fonctionnelle. Là où les deux divergent, voir `01-cadrage.md` § Contradictions.

## Écrans recensés

### Parcours d'entrée (non connecté)
| Clé | Écran |
|---|---|
| `welcome` | Accueil marketing — « La fidélité digitale, dans une seule app. » |
| `role` | Inscription — étape 1 : choix du rôle (client / commerçant) |
| `roleLogin` | Connexion — choix du rôle |

### Client — 10 écrans
| Clé | Écran |
|---|---|
| `reg` | Créer mon compte — étape 1 sur 2 |
| `home` | Accueil — salutation, carrousel de cartes, bloc « Bientôt : découvrir des commerces » |
| `cards` | Mes cartes — liste compacte |
| `detail` | Détail carte — pastilles, récompense, **autres programmes du commerce**, liens |
| `qr` | Mon QR plein écran — ID public, bouton luminosité |
| `unlock` | Récompense débloquée 🎉 |
| `rewards` | Mes récompenses — disponibles + historique des utilisées |
| `notifs` | Notifications |
| `profile` | Profil — compteurs, informations, langue, aide, déconnexion |
| `empty` | État vide — « Scannez le QR code Waffiy d'un commerce » |

### Commerçant — 15 écrans
| Clé | Écran |
|---|---|
| `login` | Connexion commerçant |
| `reg` | Créer mon commerce — étape 1 sur 3 (logo, nom, catégorie, ville, téléphone) |
| `program` | Configurer le premier programme — étape 2 sur 3 (seuil, aperçu client, récompense) |
| `home` | Dashboard — 4 statistiques, bouton SCAN dominant, activité récente |
| `scan` | Caméra plein écran + « Recherche manuelle » |
| `scanned` | Client identifié — sélecteur de programme, progression, bouton « Ajouter une visite » |
| `reward` | Récompense disponible — « Utiliser la récompense » / « Plus tard » |
| `customers` | Clients — filtres (Tous, Actifs, Récompense disponible, Nouveaux) |
| `customer` | Fiche client — compteurs + historique horodaté avec nom du personnel |
| `activity` | Activité du jour — filtres (Tous, Visites, Récompenses) |
| `programs` | Mes programmes — liste avec statut et nombre d'inscrits |
| `progsettings` | Éditer un programme — **avertissement de changement de seuil** |
| `settings` | Réglages — commerce, programmes, QR d'inscription, **équipe**, notifications, compte, support |
| `enroll` | QR d'inscription clients — imprimer l'affiche / partager le lien |
| `empty` | État vide clients |

### Modales transverses
`confirmAdd`, `successAdd`, `confirmRedeem`, `successRedeem`, `error` (réseau, avec « Réessayer »),
plus la bannière de notification push simulée.

## Composants nommés par le design
`PrimaryButton`, `SecondaryButton`, `LoyaltyCard`, `RewardCard`, `CustomerCard`,
`ProgressStampGrid`, `ProgressBar`, `QRScanner`, `QRCodeCard`, `TransactionItem`,
`StatCard`, `NotificationItem`, `BottomNavigation`, `MerchantScanButton`,
`SuccessModal`, `ConfirmationModal`, `EmptyState`.

## Jetons visuels extraits du prototype

| Rôle | Valeur |
|---|---|
| Vert principal | `#16A36A` |
| Vert foncé (hover, texte sur fond clair) | `#0F7E51` |
| Vert surface | `#EFFBF4` — bordure `#C8EEDA` |
| Or récompense | `#B7791F` |
| Or surface | `#FFF8E8` — bordure `#F1DCA9` — texte `#8A6A1E` |
| Encre | `#0F172A` |
| Texte secondaire | `#56606F` |
| Texte tertiaire | `#9AA3B0` / `#8A93A3` |
| Bordure | `#E6E9F0` — bordure de champ `#DFE3EB` |
| Fond d'application | `#E7E9EE` |
| Surface neutre | `#F2F4F8` |
| Teintes de carte | 🍔 `#FDEEE3`/`#F6DCC8` · ☕ `#EDF1FA`/`#DCE3F2` · 💇 `#F3EDFA`/`#E4DAF2` |
| Police | Manrope 400/500/600/700/800 |
| Animations | `pop` (succès), `rise` (modale), `drop` (bannière push), `sweep` (ligne de scan) |

## Formats de QR du prototype
- QR client : `WFY:CUST:4182-0093:SARAH-BENALI` — ID affiché `WFY-4182-0093`
- QR d'inscription commerce : `WFY:JOIN:BURGER-HOUSE:ALG-0142`

Ces deux formats sont à revoir avant implémentation, voir `01-cadrage.md` § C4.
