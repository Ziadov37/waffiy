# WAFFIY — Backlog d’adaptation au marché algérien

Ce backlog transforme l’étude de marché du 22 septembre 2026 en tâches exécutables. Il ne remplace
pas l’étude : les choix de segment, de prix et de canaux restent des hypothèses à valider sur le
terrain. Les priorités ci-dessous visent un pilote de dix cafés et snacks indépendants dans une même
ville.

Légende : ⬜ à faire · 🟦 partiellement couvert · ✅ socle déjà présent. Les efforts sont relatifs :
S = limité, M = intermédiaire, L = structurant.

## Socle à conserver

- ✅ Solde de points séparé pour chaque commerce.
- ✅ Plusieurs récompenses par commerce et conservation du surplus de points.
- ✅ Crédit et débit validés côté serveur, avec idempotence contre les doubles envois.
- ✅ QR client sans nom ni identifiant séquentiel.
- ✅ File hors ligne et notifications dans l’application.

Ces éléments répondent déjà à des besoins importants du pilote. Les tâches suivantes doivent les
compléter sans affaiblir leurs garanties.

## P0 — Indispensable avant les dix premiers pilotes

### Acquisition et première carte

- [x] **ALG-01 — Créer un QR commerçant HTTPS et une page mobile publique** — L
  - Remplacer le contenu `WFY:J:…` de l’affiche par une URL courte appartenant à WAFFIY.
  - La page doit afficher le nom, le logo, la récompense principale et un bouton pour rejoindre le
    programme, puis ouvrir l’application si elle est déjà installée.
  - Prévoir une continuité web quand l’application n’est pas installée.
  - **Validation :** le QR scanné avec l’appareil photo normal de plusieurs Android et iPhone ouvre
    le bon commerce, sans saisir de code.
  - **État :** la page `/join/` est publiée sur GitHub Pages en HTTPS, charge le commerce depuis
    Supabase et conserve le sous-chemin d’hébergement dans les QR. L’URL Burger House a été vérifiée
    dans Chrome au format téléphone.

- [x] **ALG-02 — Donner accès à la première carte en moins de 30 secondes** — L
  - Permettre de rejoindre un commerce avant de demander le compte complet.
  - Concevoir la reprise de cette carte après création de compte ou changement de téléphone sans
    créer de doublon.
  - Ne vérifier le téléphone que lorsqu’il sert à identifier ou récupérer le compte.
  - **Dépendance :** ALG-01.
  - **Validation :** plus de 50 % des personnes qui commencent le parcours QR obtiennent leur carte,
    et le parcours nominal dure moins de 30 secondes.

- [ ] **ALG-03 — Normaliser et vérifier les numéros algériens** — M
  - Convertir de façon unique `05…`, `06…`, `07…`, `+213 5…`, `+213 6…` et `+213 7…`.
  - Détecter et traiter les doublons avant la migration.
  - Vérifier le numéro avant de l’utiliser pour la connexion ou la récupération.
  - **Validation :** un même numéro local et international résout le même compte ; aucun numéro non
    vérifié ne permet de récupérer un compte.
  - **État :** normalisation E.164, détection des doublons, preuve OTP et garde de connexion
    déployées. L’envoi réel du SMS attend les identifiants d’un fournisseur configuré dans Supabase.

- [ ] **ALG-04 — Ajouter la récupération de compte et une aide réellement joignable** — M
  - Ajouter « Mot de passe oublié », définition d’un nouveau mot de passe et reprise après changement
    de téléphone.
  - Rendre fonctionnelles les entrées « Mes informations », « Langue » et « Aide et support ».
  - Afficher un numéro professionnel ou un canal de support avec ses horaires.
  - **Validation :** un client et un commerçant récupèrent leur compte sans intervention en base.
  - **État :** écrans de récupération, modification du profil, langue et support implémentés ; la
    redirection de récupération est autorisée sur le projet Supabase. La validation réelle attend
    une adresse de support surveillée et un SMTP de production permettant de tester les emails de
    récupération de bout en bout.

### Usage au comptoir

- [x] **ALG-05 — Terminer le kit de comptoir localisé** — M
  - Activer le logo du commerce et produire une affiche imprimable en A5 et A4.
  - Inclure le QR HTTPS, le nom du commerce, la récompense principale et des consignes courtes en
    français et en arabe.
  - Partager une vraie URL, pas seulement un texte et un code.
  - **Validation :** l’affiche est imprimée, lisible et scannée avec succès sur plusieurs téléphones.
  - **État :** ajout/changement du logo sécurisé par Storage RLS, URL HTTPS partageable et affiches
    A5/A4 français-arabe intégrés. Les deux PDF de démonstration ont été rendus et contrôlés
    visuellement ; le bucket accepte le propriétaire, sert le logo publiquement et refuse un
    téléversement anonyme. Le QR utilise désormais l’hébergement HTTPS public d’ALG-01.

- [x] **ALG-06 — Ajouter des accès caissiers séparés** — L
  - Prévoir un propriétaire et au moins deux caissiers, par PIN ou session dédiée.
  - Limiter les caissiers au scan, au crédit et à la consommation autorisée.
  - Permettre la révocation immédiate et enregistrer l’auteur de chaque opération.
  - **Validation :** un caissier ne modifie ni programme ni réglages ; son accès révoqué cesse de
    fonctionner ; l’historique indique l’opérateur.
  - **État :** tables, PIN hachés, sessions de 12 h, révocation serveur, audit, écran Équipe et mode
    caisse sont implémentés. La suite locale valide deux caissiers et la révocation immédiate. La
    migration `20260923100000_merchant_staff.sql` est appliquée au projet Supabase hébergé et son
    appel authentifié a été vérifié le 23 septembre 2026.

- [ ] **ALG-07 — Ramener le crédit d’un habitué sous cinq secondes** — M
  - Faire du crédit l’action principale après le scan.
  - Empêcher les doubles appuis et afficher immédiatement le résultat confirmé ou l’état provisoire.
  - Tester le parcours pendant une période de caisse chargée.
  - **Validation :** médiane sous 5 secondes et 90e percentile sous 8 secondes sur le matériel des
    pilotes.

- [ ] **ALG-08 — Sécuriser la consommation d’une récompense** — M/L
  - Ajouter une validation supplémentaire proportionnée à la valeur du cadeau.
  - Ne jamais demander au commerçant de remettre le cadeau avant confirmation du serveur.
  - Définir une correction traçable en cas d’erreur, sans modifier le registre existant.
  - **Validation :** photo du QR, double scan, deux appareils et coupure réseau ne produisent jamais
    deux consommations confirmées.

- [ ] **ALG-09 — Définir le comportement en réseau faible ou absent** — M
  - Garder accessibles le QR client et les cartes déjà chargées.
  - Présenter tout crédit hors ligne comme « en attente de synchronisation ».
  - Interdire la remise hors ligne d’une récompense qui n’est pas confirmée.
  - Expliquer chaque rejet lors de la reprise réseau.
  - **Validation :** scénarios testés sur Android d’entrée de gamme, iPhone et réseau limité, sans
    double crédit ni perte silencieuse.

### Langue et usages algériens

- [ ] **ALG-10 — Internationaliser le socle en français et en arabe** — L
  - Installer la structure i18n avant d’ajouter de nouveaux textes.
  - Faire traduire humainement les parcours inscription, carte, scan, récompense, récupération et
    aide ; prévoir de la darija dans l’aide seulement si les tests terrain la justifient.
  - Gérer le RTL, les mises en page mixtes, le dinar algérien, les numéros `+213` et les dates.
  - **Validation :** parcours principaux relus par des utilisateurs francophones et arabophones sur
    Android et iPhone, sans texte tronqué ni écran inversé incorrectement.

- [ ] **ALG-11 — Adapter les règles de fidélité aux cafés et snacks pilotes** — M
  - Permettre au commerçant de définir clairement une visite admissible et, si nécessaire, un ticket
    minimum en DA.
  - Afficher qui finance le cadeau et les conditions d’utilisation.
  - Prévoir les changements d’horaires et messages pendant le Ramadan à partir des horaires réels du
    commerce.
  - **Validation :** le personnel explique la règle sans aide et l’applique de la même façon pendant
    une semaine.

### Confiance, mesure et exploitation

- [ ] **ALG-12 — Formaliser les données personnelles et les conditions du programme** — M + expertise locale
  - Documenter finalités, rôles du commerce et de WAFFIY, sous-traitants, conservation, hébergement,
    transferts et procédures d’accès, rectification et suppression.
  - Ajouter une information claire et un consentement promotionnel séparé, facultatif et révocable.
  - Définir le sort des points et récompenses si un commerce ferme ou résilie.
  - **Validation :** dossier et parcours validés avant toute collecte réelle par le conseil local ou
    l’autorité compétente au regard des lois 18-07 et 25-11.

- [ ] **ALG-13 — Instrumenter le parcours et la valeur économique** — M
  - Mesurer séparément : proposition du programme en caisse, ouverture du QR, début et fin de création
    de carte, premier crédit, deuxième achat, récompense utilisée et erreurs.
  - Ajouter le coût réel des cadeaux et la marge contributive renseignés par le commerçant.
  - Calculer le retour à 30 jours sur des cohortes dont la fenêtre est complète.
  - Ne pas présenter les ventes associées aux scans comme des ventes causées par WAFFIY.
  - **Validation :** un bilan hebdomadaire par commerce permet d’estimer visites supplémentaires,
    coût des cadeaux et seuil de rentabilité avec hypothèses visibles.

- [ ] **ALG-14 — Fiabiliser recherche, pagination et export** — M
  - Remplacer la limite pratique de 200 clients par une recherche et une pagination serveur.
  - Fournir un historique complet et un export limité aux données autorisées.
  - **Validation :** un client ancien reste trouvable dans une base de plus de 200 clients ; les droits
    et consentements sont respectés à l’export.

- [ ] **ALG-15 — Préparer un environnement pilote récupérable** — M
  - Séparer démonstration, test et production.
  - Finaliser SMTP, connexion par téléphone, stockage des logos et configuration d’authentification.
  - Tester sauvegarde, restauration, journal d’incidents et procédure de support.
  - **Validation :** restauration effectuée sur un environnement de test et checklist de déploiement
    exécutée avant le premier commerce réel.

- [ ] **ALG-16 — Définir et encaisser l’offre pilote en dinars** — S/M
  - Tester 1 990, 2 490 et 2 990 DA par mois avec 30 jours d’essai et un périmètre identique.
  - Inclure carte personnalisée, quelques récompenses, propriétaire, deux caissiers, affiche et aide
    au démarrage seulement lorsque ces fonctions sont opérationnelles.
  - Émettre une facture et accepter d’abord un règlement explicite par virement/CCP ; vérifier ensuite
    l’éligibilité et les frais d’un lien CIB/Edahabia.
  - **Validation :** premier paiement réel encaissé, échéance enregistrée et renouvellement mesuré.

## P1 — À lancer pendant les 30 à 60 jours du pilote

- [ ] **ALG-17 — Envoyer des relances utiles et consenties** — M/L
  - Terminer les notifications push pour récompense disponible, deuxième visite et inactivité.
  - Ajouter plafond de fréquence, désinscription et suivi du coût par canal.
  - Prévoir un canal adapté aux utilisateurs web après vérification de son coût et de sa disponibilité
    en Algérie.
  - **Validation :** chaque campagne ne cible que les clients consentants et mesure un groupe témoin
    comparable.

- [ ] **ALG-18 — Ajouter des règles fondées sur le montant quand le terrain les exige** — L
  - Gérer montant en DA, ticket minimum, remboursements et points liés à la dépense.
  - Garder les soldes séparés par commerce et toutes les écritures côté serveur.
  - **Validation :** règles et remboursements sont reproductibles et audités sur des cas réels.

- [ ] **ALG-19 — Construire un tableau de rentabilité compréhensible** — M
  - Afficher cohortes de retour, coût des récompenses, abonnement et estimation de marge.
  - Rendre toutes les hypothèses visibles et modifiables.
  - **Validation :** le commerçant peut expliquer si le programme couvre son coût sans confondre
    corrélation et impact mesuré.

- [ ] **ALG-20 — Tester le parrainage après achat** — M
  - Déclencher l’avantage seulement après le premier achat confirmé du filleul.
  - Plafonner les avantages et bloquer auto-parrainage et doublons évidents.
  - **Validation :** conversion et coût sont mesurés séparément des inscriptions ordinaires.

- [ ] **ALG-21 — Tester Apple Wallet et Google Wallet comme options** — M
  - Conserver la carte web comme solution de repli.
  - Vérifier ajout, mise à jour et récupération sur appareils et comptes réellement utilisés en
    Algérie avant toute annonce.
  - **Validation :** tests réussis sur les appareils pilotes et documentation des cas non compatibles.

## P2 — Après preuve de paiement et de renouvellement

- [ ] **ALG-22 — Gérer plusieurs établissements** avec rôles, règles de partage entre succursales et
      reporting par caisse.
- [ ] **ALG-23 — Intégrer une caisse réellement utilisée par les pilotes** pour éviter la double
      saisie et réconcilier achats, remboursements et points.
- [ ] **ALG-24 — Ajouter la découverte locale de commerces** seulement lorsque la densité du réseau
      est utile, avec localisation facultative.
- [ ] **ALG-25 — Étudier cartes cadeaux et partenariats de quartier** après validation économique et
      juridique, avec responsabilités, consentements et soldes clairement séparés.

## Travail terrain à mener en parallèle

- [ ] Choisir une seule ville selon la capacité du fondateur à accompagner les commerces chaque
      semaine, puis deux quartiers proches.
- [ ] Constituer une liste de 200 cafés et snacks qualifiés ; viser 40 démonstrations et 10 pilotes.
- [ ] Réaliser 20 entretiens commerçants, 30 échanges clients et des observations aux heures chargées.
- [ ] Relever chaque refus : prix, temps, équipement, peur de la remise, manque d’intérêt ou outil
      existant.
- [ ] Mesurer deux semaines avant le lancement : achats admissibles, retours habituels, coût des
      cadeaux et temps en caisse.
- [ ] Suivre pendant quatre semaines l’usage au moins trois jours d’ouverture par semaine.
- [ ] Demander un paiement après l’essai puis mesurer le renouvellement effectif.

## Ordre d’exécution recommandé

1. ALG-01 QR web, puis ALG-02 inscription courte.
2. ALG-03 récupération par téléphone et ALG-04 récupération de compte.
3. ALG-05 affiche et logo, puis ALG-06 accès caissiers.
4. ALG-07 rapidité du crédit, ALG-08 récompenses et ALG-09 réseau dégradé.
5. ALG-10 français/arabe et ALG-12 protection des données, en parallèle du socle précédent.
6. ALG-13 instrumentation, ALG-15 exploitation et ALG-16 offre avant le début du pilote payant.
7. ALG-14 recherche complète, puis les tâches P1 selon les résultats observés.

Les critères de sortie du P0 sont atteints lorsque dix commerces peuvent utiliser le service en
caisse, que la première carte prend moins de 30 secondes, que le crédit médian prend moins de cinq
secondes, qu’aucune double consommation n’est reproductible et que les paiements et renouvellements
sont suivis réellement.
