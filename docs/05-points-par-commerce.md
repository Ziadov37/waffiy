# Points communs par commerce

Décision du 17 septembre 2026 : remplace les progressions indépendantes décrites
dans les documents initiaux. Un client a un portefeuille par commerce.

- `memberships.points` est le solde disponible ; `lifetime_points` est le cumul gagné.
- `programs.threshold` est le prix d'une récompense en points.
- Une visite créditée ajoute 1 point au commerce, quel que soit le choix affiché.
- Une utilisation retire `quantité × prix`. Le reste est conservé.
- Le client compose un choix indicatif. Le QR conserve uniquement son code public ;
  le commerçant lit le choix affiché et valide les récompenses, avec leur quantité.
- Les points de commerces différents ne sont jamais mélangés.

## Migration et intégrité

`20260917120000_shared_merchant_points.sql` initialise les portefeuilles à partir
de la somme des transactions existantes. Aucun historique n'est modifié et aucun
point n'est perdu. `program_progress` reste un historique de l'ancien modèle ;
les écrans utilisent désormais `memberships` et le catalogue actif complet.

Un déclencheur met à jour le portefeuille à chaque transaction. Les appels de
crédit et d'utilisation verrouillent la même adhésion pour empêcher une double
dépense sur deux récompenses différentes. Le délai entre crédits est commun au
commerce. Les clés de rejeu vérifient le client, le programme, l'action et la quantité.
Les clients ne peuvent pas écrire directement dans le portefeuille.

La migration est à appliquer avant la nouvelle application. Un nouveau nom de
cache évite d'afficher les anciens soldes par programme. Le temps réel surveille
les adhésions et les récompenses.

## Vérification

`npm run db:test` vérifie d'abord les règles historiques, migre cette base, puis
exécute `supabase/tests/20_shared_points.sql` : choix à 15 points, quantité,
surplus, solde insuffisant, rejeu, délai entre crédits et isolation des comptes.
Les données ajoutées par ces scénarios sont annulées à la fin.

`node scripts/test-points.cjs` vérifie les calculs de sélection côté client.
