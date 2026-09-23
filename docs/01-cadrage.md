# Étape 1 — Cadrage

## 1. Avis sur le stack imposé

Le stack tient. Trois réserves argumentées et une liste d'ajouts indispensables.

### 1.1 Réserve majeure — Edge Functions pour les transactions

La règle 7 impose des transactions atomiques côté serveur. Une Edge Function Deno **n'est pas
atomique par nature** : elle ouvre une connexion, enchaîne des requêtes, et un crash entre deux
appels laisse la base incohérente. Il faudrait y réimplémenter à la main ce que Postgres fait
gratuitement.

**Recommandation : fonctions `plpgsql` en `SECURITY DEFINER`, appelées en RPC.**

- atomicité native — la fonction est une transaction
- verrouillage de ligne (`SELECT … FOR UPDATE`) pour empêcher deux commerçants de créditer en même temps
- pas de démarrage à froid : ~20 ms contre 300 à 800 ms pour une Edge Function
- moins de surface d'attaque : aucune clé de service ne circule
- l'anti-fraude (règle 6) se lit et s'applique dans la même transaction que le crédit

**Les Edge Functions restent utiles pour un seul cas : l'envoi des notifications push.** Cela exige
un appel HTTP sortant vers l'API Expo avec la clé de service, ce qui n'a pas sa place dans une
fonction SQL. Elle sera déclenchée par un webhook de base sur la table `notifications`.

### 1.2 Réserve mineure — Zustand

Avec TanStack Query pour les données serveur et Supabase Auth pour la session, Zustand ne garde
que trois choses : le rôle actif (client / commerçant), le brouillon de scan en cours, et l'état
d'UI transverse. Je le garde, mais **délibérément mince**. Dupliquer des données serveur dans
Zustand est le premier piège de cette architecture : deux sources de vérité qui divergent.

### 1.3 Réserve — ce que le palier gratuit implique réellement

- **Supabase gratuit** : le projet est mis en pause après 7 jours sans requête. À savoir avant une
  démo client. 500 Mo de base, 2 projets gratuits, 500 000 invocations d'Edge Functions par mois.
- **Notifications push** : depuis le SDK 53, le push distant ne fonctionne plus dans Expo Go sur
  Android. Il faut une **build de développement**. Elle se construit gratuitement en local
  (`npx expo run:android`) ; EAS Build a un palier gratuit mais avec file d'attente.
- **Vérification par SMS** : voir contradiction C1 — c'est le seul vrai blocage payant.

### 1.4 Dépendances à ajouter (toutes gratuites)

| Paquet                                     | Raison                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `expo-secure-store`                        | Sans lui, le refresh token Supabase est stocké **en clair** dans AsyncStorage. Non négociable.                      |
| `zod`                                      | Validation des formulaires **et** parsing défensif des charges utiles QR (données non fiables venant d'une caméra). |
| `react-hook-form`                          | 5 formulaires multi-étapes dans le design ; le faire à la main coûterait plus cher.                                 |
| `@tanstack/query-async-storage-persister`  | Cache hors ligne persistant — le commerçant en sous-sol voit ses données.                                           |
| `@react-native-community/netinfo`          | Détection réseau fiable pour la file d'attente hors ligne.                                                          |
| `date-fns` + locale `fr`                   | « 12 septembre 2026 », « à l'instant », « hier ».                                                                   |
| `react-native-svg`                         | Dépendance de `react-native-qrcode-svg`.                                                                            |
| `expo-font` + `@expo-google-fonts/manrope` | Manrope, imposée par la DA.                                                                                         |
| `expo-brightness`                          | Le design promet « la luminosité augmente automatiquement » sur l'écran QR.                                         |
| `expo-haptics`                             | Retour tactile à la détection du QR — un commerçant ne regarde pas l'écran en scannant.                             |

Versions stables au 15/09/2026 : Expo SDK **57.0.23**, `expo-router` 57.0.21, `expo-camera` 57.0.5,
`@supabase/supabase-js` 2.116.0, `@tanstack/react-query` 5.102.8, `zustand` 5.0.15,
`react-native-qrcode-svg` 6.3.24.

Note : `expo-barcode-scanner` est obsolète, le scan passe par `CameraView` d'`expo-camera`.

---

## 2. Contradictions et ambiguïtés relevées

Classées par gravité. Celles marquées ✅ ont été tranchées, voir § 3.

### C1 — Vérification par SMS contre palier gratuit — ✅ résolu (Q1)

Le design annonce « Un code de vérification sera envoyé par SMS au numéro indiqué ». L'authentification
par téléphone de Supabase délègue à un fournisseur SMS externe — Twilio, MessageBird, Vonage — et
**aucun n'a de palier gratuit durable**. C'est en contradiction directe avec « aucun service hors du
palier gratuit ».

La vérification est donc envoyée une seule fois par email à l'inscription. Les connexions suivantes
utilisent l'email ou le téléphone avec le mot de passe et ne consomment aucun envoi.

### C2 — Le client a besoin d'une caméra, absente de la liste d'écrans — ✅ résolu (Q5)

Le cahier des charges ne donne pas d'écran de scan au client. Mais l'état vide du design affiche
« Scannez le QR code Waffiy d'un commerce » avec un bouton **« Scanner un commerce → »**, et le
commerçant dispose d'un écran « QR d'inscription clients ».

Il y a donc **deux QR qui circulent en sens inverse** :

- le QR **du client**, que le commerçant scanne pour créditer
- le QR **du commerce**, que le client scanne pour s'inscrire au programme

Le second écran manquait à la liste. Sans lui, un client ne pouvait jamais obtenir sa première carte.
**L'écran `(client)/scan-merchant.tsx` est donc ajouté au périmètre** — c'est l'unique porte d'entrée
vers une nouvelle carte.

### C3 — Le QR client est statique et porte des données personnelles — ✅ résolu (Q4)

Le prototype encode `WFY:CUST:4182-0093:SARAH-BENALI`. Deux problèmes :

1. **Rejeu** : le QR ne change jamais. Une photo prise par-dessus l'épaule suffit à se faire créditer
   à la place du client. Le délai anti-fraude de la règle 6 limite les dégâts sans les empêcher.
2. **Fuite de données** : le nom en clair dans le QR est inutile — le serveur le connaît. Et
   `4182-0093` ressemble à un identifiant séquentiel, donc énumérable : on peut deviner les codes
   voisins et sonder la base des clients.

Voir la question Q4.

### C4 — Exclusivité des rôles : le cahier des charges contredit le design — ✅ résolu (Q2)

- Cahier des charges : « Deux rôles dans une seule application, **séparés à la connexion** ».
- Design, écran de choix du rôle : « Un compte client peut créer un commerce plus tard depuis son
  profil. **Le même numéro de téléphone peut porter les deux rôles.** »

Ce sont deux modèles de données différents. Soit `profiles.role` est une colonne exclusive, soit le
rôle est une **capacité dérivée** : tout compte est client, et devient commerçant dès qu'il est
membre du personnel d'un commerce. Voir Q2.

### C5 — Hors ligne contre atomicité serveur 🟠 architectural

La règle 7 exige que tout crédit soit calculé côté serveur. L'exigence de qualité veut que « le
commerçant puisse se trouver en sous-sol sans réseau ». **Les deux sont inconciliables au sens strict :**
on ne peut pas exécuter une transaction serveur sans serveur.

La seule résolution honnête :

- le scan **hors ligne** met l'intention en file d'attente locale avec une **clé d'idempotence** (UUID
  généré sur l'appareil) ;
- l'écran affiche explicitement **« En attente de synchronisation »**, jamais « +1 visite ajoutée » ;
- au retour du réseau, la file est rejouée ; la fonction Postgres déduplique sur la clé d'idempotence,
  donc un rejeu double ne crédite qu'une fois ;
- une intention peut être **refusée à la synchronisation** (délai anti-fraude, programme passé en
  brouillon entre-temps) ; le commerçant doit en être informé.

Je propose de coder cela, mais le point mérite votre validation : l'alternative est d'interdire
purement le crédit hors ligne, ce qui est plus simple et plus sûr, mais laisse le commerçant bloqué.

### C6 — « La progression la plus avancée » est ambiguë 🟡

Au scan, le programme proposé par défaut est celui « dont la progression du client est la plus
avancée ». Deux lectures :

- **absolue** : 8 visites l'emporte sur 4 visites
- **relative** : 4/5 (80 %) l'emporte sur 8/10 (80 %)… et surtout 3/4 l'emporte sur 8/12

Le prototype tranche pour le **ratio** (`stamps/threshold`). C'est le bon choix métier — on propose le
programme le plus proche de la récompense — mais je le confirme plutôt que de le supposer.

### C7 — L'attribution au personnel suppose une équipe — ✅ tranché (Q3), avec une conséquence

La règle 5 impose que chaque action soit « attribuée à un membre du personnel », et l'historique du
design affiche bien « Karim », « Amina ». L'écran Réglages liste « **Équipe — 3 membres** ». Mais la
liste des écrans commerçant du cahier des charges ne contient aucun écran d'équipe.

La base de données doit prévoir la table dès maintenant (la rétro-ajouter casserait l'historique),
mais les écrans d'invitation sont-ils dans le périmètre de la phase 1 ? Voir Q3.

### C8 — Programme en brouillon 🟢 tranché par défaut

Un programme en brouillon n'apparaît pas au client et **ne peut pas être crédité**. Le prototype ne
le sélectionne jamais au scan (`status === 'Actif'` filtré). Je l'implémente ainsi sauf objection.

### C9 — Fuseau horaire des compteurs « du jour » 🟢 tranché par défaut

« Scans aujourd'hui » et « activité du jour » doivent se calculer dans le fuseau **du commerce**, pas
de l'appareil : un commerçant en déplacement ne doit pas voir ses compteurs se décaler. J'ajoute
`merchants.timezone`.

### C10 — Pas de table « récompenses » 🟢 choix assumé

Une récompense n'a pas d'état propre : elle est **disponible** quand `tampons ≥ seuil`, et
**utilisée** quand une transaction de type `redeem` existe. Créer une table `rewards` introduirait un
état à synchroniser avec le solde, donc une source de désynchronisation. Tout est dérivé du registre
de transactions. L'historique « Mes récompenses utilisées » est une simple lecture des transactions.

---

## 3. Décisions prises (validées le 16/09/2026)

| #   | Question                   | Décision                                                                                                         | Contradiction résolue                                                                           |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Q1  | Authentification           | **Code email à l'inscription, puis email/téléphone + mot de passe**                                              | C1 — plus de dépendance SMS payante                                                             |
| Q2  | Rôles                      | **Capacité dérivée** : tout compte est client, commerçant s'il possède un commerce                               | C4 — le design l'emporte sur le cahier des charges                                              |
| Q3  | Équipe                     | **Supprimée.** Un commerce = un compte                                                                           | C7 — mais crée une nouvelle contradiction, ci-dessous                                           |
| Q4  | QR client                  | **Code aléatoire statique, sans nom ni identifiant séquentiel**                                                  | C3 — énumération et fuite de données écartées ; le rejeu reste couvert par le délai anti-fraude |
| Q5  | Inscription à un commerce  | **Uniquement par scan du QR du commerce par le client.** La carte du commerce apparaît alors dans « Mes cartes » | C2 — l'écran de scan client est confirmé nécessaire                                             |
| Q6  | Programmes à l'inscription | **Tous les programmes actifs d'un coup.** La carte porte le commerce, pas le programme                           | cohérent avec « 3 programmes » affiché sur la carte du prototype                                |

### Conséquence de la décision Q5 — première visite en caisse

L'inscription passe **exclusivement** par le client qui scanne le QR du commerce. Le commerçant ne
peut donc pas inscrire un inconnu en le scannant : `credit_visit` refusera avec `NOT_ENROLLED`.

Effet concret : à la toute première visite, le commerçant scanne, l'écran affiche « Ce client n'a pas
encore votre carte » et propose un bouton qui ouvre directement son QR d'inscription. Le client le
scanne, puis le commerçant scanne à nouveau. **Deux scans au lieu d'un, une seule fois par client.**

C'est le prix d'une règle simple et d'un consentement explicite du client à rejoindre le programme —
personne ne se retrouve inscrit quelque part sans l'avoir voulu.

### ⚠️ Nouvelle contradiction créée par la décision Q3

La suppression de l'équipe **invalide la règle métier 5** de votre cahier des charges : « toute action
est horodatée, **attribuée à un membre du personnel**, et génère une notification ». L'horodatage et
la notification restent ; l'attribution disparaît de l'interface.

Effets concrets, pour qu'ils soient explicites :

- l'historique de la fiche client perd sa colonne « Karim / Amina » visible dans le prototype ;
- l'entrée « Équipe — 3 membres » disparaît de l'écran Réglages commerçant ;
- plusieurs personnes en caisse partageront le même compte, donc la même session.

Ce que je conserve malgré tout : une colonne `transactions.actor_profile_id`, **purement technique et
jamais affichée**, qui enregistre le compte à l'origine de l'action. Elle vaut toujours le
propriétaire en phase 1, mais elle évite de devoir migrer le registre le jour où le back-office super
admin devra enquêter sur une fraude, ou le jour où vous réintroduiriez une équipe.

### Conséquence de la décision Q1 sur le palier gratuit

Le serveur d'email intégré à Supabase est bridé à quelques envois par heure et réservé au
développement. Un **SMTP externe gratuit** reste donc requis pour confirmer les inscriptions et
récupérer les mots de passe, mais une connexion quotidienne n'envoie plus d'email. Je recommande
**Brevo, 300 emails par jour, en permanence**. C'est une configuration dans le tableau de bord
Supabase, aucun secret SMTP ne vit dans l'application mobile.

---

## 4. Questions ouvertes restantes

Q1 à Q6 sont tranchées ci-dessus. Restent celles qui n'engagent pas le schéma :

**Q7 — Nombre de visites par scan.** Toujours +1, ou le commerçant peut-il créditer plusieurs visites
(commande de 3 burgers) ? Le prototype ne propose que +1.

**Q8 — Annulation.** Un commerçant peut-il annuler une visite créditée par erreur ? Le registre étant
immuable, cela se fait par une transaction compensatoire de type `adjust`. À prévoir ou non.

**Q9 — Multi-commerce.** Un même compte peut-il gérer plusieurs commerces (une chaîne) ? Le modèle le
permet naturellement — un compte peut être `owner_id` de plusieurs commerces ; la question porte
sur l'interface (sélecteur de commerce dans la barre du haut).

**Q10 — Langue.** L'écran profil propose « Langue — Français ». Y aura-t-il de l'arabe ou de l'anglais ?
Cela change le choix d'une bibliothèque i18n dès le socle, et l'arabe imposerait la gestion du RTL.

**Q11 — Géolocalisation.** L'accueil client affiche « Bientôt — Découvrir des commerces près de vous ».
Je le traite comme un bloc décoratif désactivé en phase 1 ; confirmez-vous ?

**Q12 — Rétention.** Les transactions sont-elles conservées indéfiniment ? Le RGPD impose une réponse
au moment de la suppression de compte : anonymiser le client dans le registre plutôt que supprimer,
pour ne pas fausser la comptabilité du commerçant.
