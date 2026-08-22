# Diez : Architecture

> Document de référence. Il intègre les correctifs des quatre audits (`audit-ux.md`, `audit-robustesse.md`, `audit-accessibilite.md`, `audit-contenu.md`), qui ne servent plus que de trace du raisonnement.
> Le jeu implémenté est décrit dans `docs/modele-de-jeu.md` : une variante coopérative à narrateur, pas les règles de « Tu Te Mets Combien ? ».
> Aucun code écrit à ce stade.

## 1. Les quatre principes

**P1 : le contenu est une donnée, pas du code.**
La banque de questions est l'actif du projet ; l'app est jetable. Le corpus vit dans `content/`, versionné, validé par un schéma, éditable sans toucher au code. Si l'app est réécrite dans deux ans, le corpus survit intact.

> Ce principe a été mis à l'épreuve immédiatement : la constitution du corpus a été sortie du périmètre de la V1 (voir §8). Le report n'a rien cassé, précisément parce que le couplage n'existait pas. Un principe qui survit à son premier test réel.

**P2 : le cœur métier ignore React.**
Pioche, filtrage, anti-répétition, machine à états du tour : du TypeScript pur, sans un seul import de React. Testable en millisecondes, sans DOM. C'est ce qui rend le projet *fiable* plutôt que simplement *fonctionnel*.

**P3 : à chaque phase, l'état contient exactement ce qui peut être montré, et rien de plus.**
Les règles de discrétion du jeu ne sont pas des `if` dans des composants, ce sont des propriétés du modèle de données. En phase THÈME, aucun texte de question n'est atteignable. En phase QUESTION, l'énoncé l'est mais **pas la réponse**. Un bug d'affichage ne peut donc pas divulguer ce qui n'est pas encore dans l'état.

**P4 : l'app est un paquet de fichiers statiques.**
Pas de serveur, pas de base de données, pas d'API, pas de secret de build. Tout est résolu à la compilation, y compris le corpus. Conséquences : le déploiement se réduit à une copie de fichiers, l'hébergement est gratuit et interchangeable, et le fonctionnement hors-ligne devient un effet de bord gratuit plutôt qu'un objectif à défendre.

> **Note sur le hors-ligne.** Ce n'est plus une exigence : les parties se joueront principalement à la maison, en Wi-Fi. Le service worker et les polices locales sont conservés pour d'autres raisons (voir §10 et design-system §1), et le hors-ligne vient avec. Il ne dispose plus d'un droit de veto sur les autres décisions.

---

## 2. Lexique et conventions de nommage

**Règle :** l'échafaudage technique est en anglais, le vocabulaire du jeu en français.

**Règle stricte :** aucun accent ni cédille dans un identifiant. `ResumeCarte`, `Reponse`, `Theme`, `revele`. Les accents ne vivent que dans les chaînes affichées et les fichiers de contenu. Cela évite les incidents d'encodage, les problèmes d'auto-complétion et les doublons invisibles (`Réponse` contre `Reponse`).

| Français, domaine du jeu | Anglais, technique |
|---|---|
| `Carte`, `Question`, `Theme`, `Niveau` | `domain/`, `screens/`, `design/`, `storage/`, `tools/` |
| `Paquet`, `Domaine`, `Reponse`, `Narrateur` | `useReducer`, `Provider`, `dispatch` |
| `Historique`, `Signalement`, `Tour`, `EtatTour` | `state`, `action`, `hook`, `context` |
| `piocher()`, `annoncer()`, `choisir()` | `render`, `mount`, `serialize` |
| `reveler()`, `suivante()`, `terminer()` | `migrate`, `validate`, `compile` |

Termes **interdits** parce qu'ils ont déjà un équivalent français retenu : `card`, `deck`, `level`, `theme` (en tant que type), `draw`, `reveal`. Une occurrence de `deck` dans une revue est à corriger.

---

## 3. Arborescence

```
diez/
├── content/                      # P1 : source de vérité, indépendante de l'app
│   ├── cartes/
│   │   ├── general/              # un fichier JSON par lot de production
│   │   ├── maison/               # cartes écrites à la main sur le groupe
│   │   └── _fixtures/            # cas de test, exclus des builds de production
│   ├── _dev/                     # jeux de stockage de développement
│   └── schema/lot.schema.json
│
├── tools/                        # scripts Node, hors bundle
│   ├── valider.ts                # contrôle du corpus (voir §8)
│   ├── generer.ts                # génération assistée, REPORTÉE
│   └── compiler.ts               # content/ vers src/data/cartes.gen.json
│
├── src/
│   ├── domain/                   # P2 : TypeScript pur, zéro React
│   │   ├── types.ts
│   │   ├── paquet.ts             # pioche, filtres, anti-répétition
│   │   ├── tour.ts               # machine à états du tour
│   │   └── __tests__/
│   ├── storage/                  # localStorage : accès, versionnage, migrations
│   ├── design/                   # système Nothing (voir design-system.md)
│   │   ├── fonts/                # .woff2 auto-hébergés
│   │   ├── tokens.css
│   │   ├── components/           # primitives : Bouton, Etiquette, Segment…
│   │   └── review/               # planche de contrôle des deux modes, dev uniquement
│   ├── screens/                  # Accueil, Theme, Niveau, Question, Reponse
│   ├── app/                      # composition, navigation, providers
│   └── data/cartes.gen.json      # GÉNÉRÉ, jamais édité à la main
│
├── public/                       # manifest PWA, icônes
├── .github/workflows/deploy.yml  # build et publication sur Pages
├── docs/
│
├── README.md                     # point d'entrée, ordre de lecture, non-affiliation
├── CLAUDE.md                     # conventions de travail, voyagent avec le dépôt
├── .gitattributes                # normalisation LF, voir §9
├── .editorconfig                 # UTF-8 et LF côté éditeur
└── .gitignore
```

Les fichiers marqués `REPORTÉE` ou situés sous `src/`, `tools/`, `public/` et `.github/` n'existent pas encore : l'arborescence décrit la cible. Tout ce qui est à la racine, plus `content/` et `docs/`, existe.

**Règle de dépendance, à sens unique et non négociable :**

```
screens  →  design  →  (rien)
   ↓
domain   →  (rien)
   ↓
storage  →  (rien)
```

`domain/` n'importe jamais depuis `screens/`, `design/` ou `storage/`. Une seule ligne violant cette règle et P2 est mort. C'est le point à surveiller en revue.

---

## 4. Modèle de données

```ts
type Niveau = 1|2|3|4|5|6|7|8|9|10

type Question = {
  niveau: Niveau
  q: string            // 140 caractères max
  r: string            // 60 caractères max
  note?: string        // précision d'arbitrage, affichée sous la réponse
}

type Carte = {
  id: string           // "cap-monde-001", stable, jamais réutilisé
  theme: string        // 40 caractères max
  paquet: PaquetId     // "general" | "maison" | "_fixtures"
  domaine: Domaine     // "geo" | "sciences" | "cinema" | …
  questions: Question[] // exactement 10, niveaux 1 à 10, chacun une seule fois
  source: "genere" | "manuel"
  valide: boolean      // relu par un humain ; les `false` sont exclus du build
}
```

Trois points de conception qui comptent :

- **`id` stable et jamais recyclé.** L'historique des parties référence des `id`. Renuméroter le corpus casserait l'anti-répétition sur les téléphones. Un id retiré du jeu reste retiré.
- **`valide: boolean`.** Le workflow de relecture devient mécanique : on génère avec `valide: false`, tu relis, tu bascules à `true`. Le compilateur ignore le reste. Aucune carte non relue ne peut atteindre une soirée.
- **Les trois plafonds de longueur sont des contraintes de mise en page**, pas des préférences éditoriales. Chacun protège un geste de design précis, détaillé en §8.

---

## 5. La machine à états du tour, cœur de fiabilité

```ts
type ResumeCarte    = { id: CarteId; theme: string; paquet: PaquetId }
type EnonceQuestion = { niveau: Niveau; q: string }
type Reponse        = { r: string; note?: string }

type EtatTour =
  | { phase: "REPOS" }
  | { phase: "THEME";    carte: ResumeCarte; depuis: number }
  | { phase: "NIVEAU";   carte: ResumeCarte; consommes: Niveau[]; depuis: number }
  | { phase: "QUESTION"; carte: ResumeCarte; enonce: EnonceQuestion; depuis: number }
  | { phase: "REPONSE";  carte: ResumeCarte; enonce: EnonceQuestion;
                         reponse: Reponse; depuis: number }
```

Trois champs méritent une explication.

**`ResumeCarte` ne contient aucune question.** C'est P3 appliqué au début du tour.

**La réponse n'apparaît qu'en phase REPONSE.** C'est P3 appliqué à la fin, et c'est la moitié la plus importante depuis le passage au modèle du narrateur. Il lit la question à voix haute, à toute la table, en fixant son écran. Si la réponse vivait dans le même état, elle serait à un nœud du DOM de l'endroit qu'il est en train de prononcer. Le risque n'est pas théorique : c'est exactement comme ça qu'on lit une réponse par accident. L'invariant qui protégeait le joueur de la question protège maintenant le narrateur de la réponse.

**`consommes` porte les niveaux déjà brûlés de cette carte.** Une carte reste piochable tant qu'il lui reste des questions inédites (§6), donc elle revient avec des trous. Le sélecteur doit pouvoir les afficher, donc l'état doit les transporter. Sans ce champ, l'écran NIVEAU n'aurait aucun moyen de distinguer une carte neuve d'une carte entamée, ce qui est le cas normal dès la deuxième soirée.

**`depuis` est l'horodatage de l'entrée dans la phase.** Il sert au verrouillage d'entrée décrit en §10.

**Transitions autorisées :**

| Depuis | Action | Vers |
|---|---|---|
| REPOS | `piocher()` | THEME |
| THEME | `annoncer()` | NIVEAU |
| NIVEAU | `choisir(n)` | QUESTION |
| NIVEAU | `retour()` | THEME |
| QUESTION | `reveler()` | REPONSE |
| REPONSE | `suivante()` | THEME (nouvelle carte) |
| REPONSE | `terminer()` | REPOS |

Chaque transition reçoit un argument `maintenant: number`. Le réducteur **rejette toute action arrivant moins de 400 ms après l'entrée dans la phase courante** (§10). L'horloge étant un paramètre et non une lecture globale, la règle reste testable sans DOM et sans attente réelle, ce qui préserve P2.

**Transitions volontairement absentes :**

- **QUESTION vers NIVEAU.** *Décision confirmée sous le modèle du narrateur.* Elle avait été prise au motif que le chiffre engageait le joueur actif ; ce joueur n'existe plus, l'arbitrage a donc été rejoué et reconduit. La transition n'existe pas dans le type. Voir la discussion en fin de section.
- **REPONSE vers QUESTION.** Sans objet, et source de confusion.

**Gestion du bouton « retour » du téléphone.** Point de fiabilité souvent raté : en mode `standalone`, le geste de retour ferme l'app. Il faut le brancher sur la machine à états via l'History API (un `history.pushState` par phase) pour que « retour » signifie *étape précédente* et jamais *quitter la partie*.

En phase QUESTION, le geste est **absorbé sans effet**, et l'écran porte le label `NIVEAU 07 · VERROUILLÉ`. L'état est lisible, donc il n'a pas besoin d'être notifié.

### Discussion : le verrou, rejoué sous le modèle du narrateur

Le raisonnement d'origine portait sur un joueur actif qui n'existe plus. L'arbitrage a donc été refait de zéro, avec deux issues défendables.

Autoriser le retour en brûlant le niveau consulté aurait rendu la coquille réparable sans permettre le repérage des questions. C'est l'option cohérente sur le papier.

**Le verrou a été maintenu.** Sa justification n'est plus l'engagement du joueur mais la simplicité du modèle : aucune transition supplémentaire, aucun état intermédiaire, aucune règle à expliquer. Un narrateur qui se trompe de touche annonce son erreur à la table et lit la mauvaise question. Dans une variante coopérative sans score, ça ne coûte rien et ça produit un moment de soirée plutôt qu'un contretemps.

**Conséquence à ne pas négliger.** Le verrou étant conservé, la prévention du mistap repose entièrement sur l'ergonomie du sélecteur. Deux audits indépendants avaient convergé sur le même correctif, `evaluate` par le risque et `include` par la norme WCAG 2.2 : **8px d'espacement minimum entre les blocs de niveau**, en plus de leurs 64px de hauteur. Ce n'est plus une recommandation de confort, c'est le seul garde-fou restant.

---

## 6. Pioche et anti-répétition

L'historique ne stocke pas « carte vue ou pas vue » mais **quels niveaux ont été consommés sur quelle carte** :

```ts
type Historique = Record<CarteId, Niveau[]>
```

Ça colle au jeu physique : une carte reste jouable tant qu'il lui reste des questions inédites.

Algorithme de pioche :
1. filtrer sur les paquets actifs
2. exclure les cartes dont les 10 niveaux sont consommés
3. prioriser les cartes jamais sorties, puis les cartes partiellement entamées
4. tirage aléatoire dans le meilleur palier
5. pool vide : écran explicite proposant de réinitialiser l'historique, jamais de plantage silencieux

### Quand un niveau est-il consommé ?

*Spécification manquante relevée par l'audit, tranchée ici : **sur `choisir(n)`**, à l'entrée en phase QUESTION.*

Les deux options avaient un coût. Consommer à la fin du tour laisse une question rejouable si l'app meurt entre-temps, donc quelqu'un peut réentendre une question que la table a déjà entendue. Consommer à l'entrée brûle une question qui n'aura peut-être jamais été lue.

Le second coût est très inférieur : perdre une question sur les dix d'une carte est invisible, réentendre une question déjà posée casse la partie. On choisit donc le comportement conservateur.

### La réinitialisation ne concerne pas que le stock vide

L'historique est lié au **téléphone du narrateur**, pas au groupe. Si tu joues le mois suivant avec d'autres gens, l'app continuera d'éviter des cartes que ces personnes n'ont jamais vues, et servira en priorité les fonds de tiroir.

La réinitialisation doit donc être accessible **depuis l'accueil**, pas seulement depuis l'écran d'épuisement. Le motif « nouveau groupe » n'a rien à voir avec le motif « stock vide », et attendre le second pour offrir le premier est une erreur de conception.

Corollaire : le compteur de l'accueil affiche les **cartes restantes**, jamais le total du corpus. Un compteur qui annonce un stock dont on ne dispose plus est un mensonge, et il fait arriver l'écran d'épuisement sans prévenir.

---

## 7. Persistance

Tout accès à `localStorage` passe par `storage/`. Aucun composant n'y touche directement.

```
diez:v1:historique      # Record<CarteId, Niveau[]>
diez:v1:reglages        # paquets actifs, mode d'affichage (auto | sombre | clair)
diez:v1:signalements    # questions signalées comme douteuses
diez:v1:tour            # EtatTour en cours, plus son horodatage
```

Le préfixe `v1` est un choix de fiabilité : le jour où la forme change, on écrit une migration `v1` vers `v2` au lieu de faire planter le téléphone d'un ami sur une clé périmée. Chaque lecture est validée et retombe sur une valeur par défaut si le contenu est corrompu : jamais de crash au démarrage à cause d'un `JSON.parse`.

### Le tour en cours est persisté

*Correctif d'audit.* `EtatTour` vivait uniquement en mémoire React. Or le narrateur est désormais un **point de défaillance unique** : son écran se verrouille, il bascule sur ses messages, le système évince l'onglet sous pression mémoire, et toute la table s'arrête au milieu d'une question.

`diez:v1:tour` est donc écrit à chaque transition et relu au démarrage.

- Reprise directe dans la phase enregistrée, y compris QUESTION et REPONSE.
- Un tour **de plus de 12 heures est écarté** au démarrage : c'est une autre soirée, pas une reprise.
- La clé est effacée sur `terminer()`.

Le niveau étant consommé dès `choisir(n)` (§6), une reprise en phase QUESTION est cohérente avec l'historique : la question a bien été retirée du stock, qu'elle ait été lue ou non.

### Les signalements doivent pouvoir sortir du téléphone

*Correctif d'audit.* Le corpus vit dans un dépôt Git, les signalements dans le `localStorage` d'un téléphone, et aucun pont n'existait entre les deux. La fonctionnalité collectait donc une donnée que personne n'aurait jamais lue.

L'accueil expose une action `COPIER LES SIGNALEMENTS` en couche tertiaire, **visible uniquement s'il en existe**, qui place la liste en JSON dans le presse-papier. Il n'en faut pas plus : coller dans une conversation ou dans le dépôt suffit à fermer la boucle.

---

## 8. Pipeline de contenu

```
content/cartes/**.json
        │
        ├─ tools/valider.ts    ← lancé en pre-commit et en CI
        │
        └─ tools/compiler.ts   ← ne retient que valide: true
                │
                └→ src/data/cartes.gen.json  (bundlé dans l'app)
```

| Contrôle | Raison |
|---|---|
| exactement 10 questions, niveaux 1 à 10 sans doublon | intégrité de la carte |
| `id` unique sur tout le corpus | l'historique en dépend |
| `q` et `r` non vides | évidence |
| **`r` de 60 caractères maximum** | force la règle « réponse courte et indiscutable » |
| **`q` de 140 caractères maximum** | garantit le vide de sécurité de 96px avant `RÉVÉLER` |
| `theme` de 40 caractères maximum | tient à l'écran en taille display |
| pas de thème dupliqué | évite les cartes jumelles |
| build : au moins 5 cartes valides | interdit de déployer une app vide |

Deux de ces contrôles méritent d'être compris plutôt que subis.

**La contrainte sur `r`** rend structurellement impossible la réponse à débat, qui est le seul défaut vraiment grave dans ce jeu.

**La contrainte sur `q`** protège un geste de design. Le vide de 96px avant le bouton de révélation est un dispositif de sécurité contre le tap parasite ; sans plafond sur la longueur de l'énoncé, ce vide disparaît exactement quand la question est longue, donc quand le narrateur lit lentement, donc quand le risque est maximal. Le garde-fou s'effaçait précisément dans le cas qu'il devait couvrir.

### Le contenu est différé, le pipeline ne l'est pas

*Décision validée : la constitution du corpus sort du périmètre de la V1* et fera l'objet d'un chantier distinct, une fois l'app jugée concluante. `tools/generer.ts` est donc reporté. `valider.ts` et `compiler.ts` restent, parce qu'ils constituent la frontière entre le contenu et l'app, et qu'une frontière qu'on installe après coup n'est jamais étanche.

C'est le principe P1 qui rend ce report gratuit : le corpus n'ayant jamais été couplé au code, le retirer ne casse rien. La décision valide l'architecture au lieu de la contredire.

**Le risque réel n'est pas technique, il est calendaire.** « On fera le contenu plus tard » est la façon habituelle dont un projet finit avec une app et jamais de contenu. La parade n'est pas une promesse, c'est le jeu de fixtures ci-dessous : si l'app est construite contre du contenu volontairement hostile, alors n'importe quel corpus produit plus tard y entrera sans retouche.

### Jeu de développement

**Les dix cartes pilotes**, pour le ressenti réel. Leur gradation est défectueuse (voir `audit-contenu.md`), ce qui est sans effet sur ce qu'elles servent à tester ici.

**Deux cartes de fixture** dans `content/cartes/_fixtures/`, et non six comme prévu initialement.

*Correction de spécification, apparue à l'écriture.* Six cartes éparses supposent qu'on puisse atteindre celle qu'on veut éprouver, or la pioche est aléatoire : on ne choisit pas sa fixture. Une carte dense dont chaque niveau teste une limite différente se parcourt au contraire d'un bout à l'autre, en dix taps. Deux cartes couvrent donc plus de cas que six, et de façon déterministe.

`_fixture-limites-001` porte un thème de 40 caractères et éprouve, niveau par niveau, chaque borne du modèle :

| Niveau | Ce qu'il éprouve | Mesure |
|---|---|---|
| 1 | réponse d'un seul caractère, qui flotte dans le vide | 1 |
| 2 | réponse à la limite haute | 60 |
| 3 | question à la limite haute, contre le vide de sécurité de 96px | 140 |
| 4 | `note` d'arbitrage à la limite haute | 159 |
| 5 | nombre long en Space Mono à taille display | 24 |
| 6 | accents, apostrophes et traits d'union | 15 |
| 7 | mot unique très long, insécable | 25 |
| 8 | borne haute du palier `--display-lg` | 13 |
| 9 | borne du palier `--display-md` | 30 |
| 10 | borne basse du palier `--display-lg` | 12 |

`_fixture-minimal-001` fait l'inverse : thème de 7 caractères, réponses d'un ou deux caractères partout. Elle éprouve le cas où tout est court, où le risque n'est plus le débordement mais une mise en page qui paraît vide ou cassée.

**L'état partiel du sélecteur ne peut pas être une carte.** La consommation d'un niveau vit dans `Historique`, en `localStorage`, pas dans les données de la carte. Ce cas relève donc d'un jeu de **stockage**, `content/_dev/historique-partiel.json`, qui brûle neuf niveaux sur `_fixture-limites-001` : seul le 10 doit rester sélectionnable, les neuf autres s'affichant en bordure seule avec un point médian.

Aucune de ces données n'est du contenu. Elles sont exclues des builds de production par leur paquet dédié.

**Contrôle spécifique au paquet `maison`.** Le dépôt étant public (§9), le validateur relève chaque nom propre détecté dans les cartes `maison`, c'est-à-dire chaque mot capitalisé hors début de phrase, et les liste en avertissement. Il ne bloque pas et ne devine rien : distinguer un prénom d'un nom de famille par programme produirait surtout des faux positifs. Son rôle est de forcer un regard humain sur la liste avant chaque publication. La règle éditoriale reste une décision d'écriture, pas un test automatique.

---

## 9. Déploiement : GitHub Pages

*Décision validée.* HTTPS fourni, gratuit, et parfaitement adapté à P4.

Publication par GitHub Actions sur push vers `main` : build Vite, puis publication de `dist/` sur Pages. Aucun secret, aucune variable d'environnement.

### Le piège du chemin de base

C'est **le** point qui casse systématiquement une PWA sur GitHub Pages. Le site est servi depuis un sous-chemin :

```
https://<utilisateur>.github.io/diez/
```

Quatre réglages doivent s'accorder, sous peine d'écran blanc ou de service worker qui n'enregistre jamais :

| Réglage | Valeur |
|---|---|
| `base` dans `vite.config.ts` | `/diez/` |
| `start_url` du manifest | `/diez/` |
| `scope` du manifest | `/diez/` |
| `scope` du service worker | `/diez/` |

**Alternative propre :** nommer le dépôt `<utilisateur>.github.io`, ce qui sert le site à la racine du domaine et fait disparaître le problème. Écartée : ça consomme le domaine GitHub personnel pour un jeu de soirée.

### Visibilité du dépôt et règle éditoriale du paquet `maison`

GitHub Pages sur un dépôt **privé** exige un plan payant. *Décision validée : le dépôt sera public*, et le corpus avec.

Le contenu généré ne pose aucun problème, il est original. Le point d'attention porte sur `content/cartes/maison/`, les cartes écrites sur le groupe d'amis, qui deviennent publiques et indexables.

**Règle éditoriale du paquet `maison`**, à respecter à l'écriture et à contrôler à la relecture :

- prénoms uniquement, jamais de noms de famille ;
- aucune donnée personnelle : ni adresse, ni numéro, ni employeur, ni pseudo réutilisé ailleurs ;
- rien qui puisse blesser la personne concernée si elle tombe dessus.

Le troisième point est le vrai. Un dépôt public est permanent et indexé : une vanne écrite un soir de 2026 reste lisible en 2031, par l'intéressé, ou par quelqu'un qui cherche son prénom. Le critère d'écriture est donc « est-ce que je lui montrerais ? », pas « est-ce que ça fait rire ce soir ? ».

Le validateur assiste cette relecture sans prétendre l'automatiser (voir §8).

### Conventions Git appliquées

Trois réglages posés au moment du commit initial, chacun corrigeant un défaut de la configuration par défaut sous Windows.

**Branche `main`, pas `master`.** Le `master` proposé venait du fichier de configuration **système** de Git for Windows, pas d'un choix. La branche a été renommée pour s'accorder avec la publication décrite ci-dessus et avec les conventions GitHub.

**`.gitattributes` avec `* text=auto eol=lf`, dès le commit initial.** C'est le pendant Git du `.editorconfig`, et il est indispensable : `core.autocrlf` vaut `true` dans la configuration système de Git for Windows, ce qui reconvertirait la copie de travail en CRLF à chaque checkout, exactement contre le `end_of_line = lf` déclaré côté éditeur. Sur un corpus JSON chargé d'accents, ce genre de conversion silencieuse est précisément le mode de défaillance qu'on ne veut pas.

Le fichier **devait** figurer dans le commit initial : ajouté ensuite, il aurait produit un commit de conversion touchant tous les fichiers d'un coup.

**Auteur des commits : l'adresse de substitution GitHub**, `ID+pseudo@users.noreply.github.com`, réglée en portée locale au dépôt. Le dépôt étant public, l'adresse personnelle serait autrement gravée dans l'historique, dans les miroirs et dans les moteurs de recherche, de façon permanente. La substitution ne coûte rien : GitHub rattache quand même les commits au compte, donc le graphe de contributions reste correct.

Le réglage durable correspondant est côté GitHub, dans les paramètres *Emails* : **« Block command line pushes that expose my email »** transforme un oubli silencieux en échec de push.

---

## 10. Comportements d'exécution

Cinq comportements sans lesquels l'app fonctionne en démonstration et échoue en soirée. Tous viennent des audits.

### Verrouillage d'entrée de 400 ms

**Le problème.** `RÉVÉLER LA RÉPONSE` est en bas de l'écran QUESTION, `SUIVANTE` est en bas de l'écran REPONSE, et la transition dure 200 ms. Un double tap, par impatience ou par tremblement, révèle puis enchaîne : la réponse s'affiche 200 ms et la carte est perdue. Sous le modèle du narrateur c'est pire, puisque personne d'autre n'a l'écran sous les yeux.

**Le correctif.** Le réducteur rejette toute action arrivant moins de 400 ms après l'entrée dans la phase (§5). Invisible, uniforme, testable, et cohérent avec le rythme « percussif » revendiqué par le système de design. Il est doublé côté design par un décalage de position entre les deux boutons.

### Maintien de l'écran allumé

Entre la lecture de la question et le verdict du groupe, il s'écoule facilement une minute. Le téléphone se met en veille, et c'est celui du narrateur, donc celui dont dépend toute la table.

`navigator.wakeLock` est maintenu dans toute phase autre que REPOS, et relâché au retour au repos. Repli silencieux si l'API est indisponible : la fonctionnalité est un confort, jamais une dépendance.

### Orientation verrouillée en portrait

Toute la composition de l'écran THÈME repose sur deux tiers de vide vertical. En paysage il n'y a plus de vide vertical, donc plus de composition. `"orientation": "portrait"` dans le manifest.

### Mise à jour du service worker

Stratégie `prompt`, **jamais** `autoUpdate`. Une mise à jour qui recharge la page en phase QUESTION fait disparaître la carte au milieu d'une phrase.

La proposition de mise à jour n'est de surcroît présentée **qu'en phase REPOS**. Une app de soirée n'a aucune raison de se mettre à jour pendant qu'on joue.

### Reprise après interruption

Décrite en §7. Au démarrage, `storage/` relit `diez:v1:tour` et la machine à états reprend dans la phase enregistrée, à moins que le tour n'ait plus de 12 heures.

---

## 11. Stack et décisions

| Sujet | Choix | Pourquoi | Écarté |
|---|---|---|---|
| Build | Vite + React + TypeScript `strict` | rapide, PWA bien outillé | Next.js, un serveur pour zéro besoin serveur |
| Styles | CSS custom properties + CSS Modules | le système Nothing *est* un jeu de variables CSS ; Tailwind obligerait à réencoder les tokens deux fois, et le double mode clair/sombre en ferait quatre | Tailwind, CSS-in-JS |
| État | `useReducer` + Context, réducteur importé du domaine | l'état tient en une machine à états et trois réglages | Redux, Zustand, surdimensionnés |
| Navigation | History API branchée sur la machine à états | 5 écrans, un flux linéaire ; un routeur n'apporterait rien mais coûterait une dépendance | React Router |
| PWA | `vite-plugin-pwa`, stratégie `prompt` | obtenir `display: standalone`, donc supprimer la barre d'URL ; le hors-ligne vient avec, gratuitement | `autoUpdate`, qui recharge en pleine partie |
| Polices | .woff2 auto-hébergés | supprime le flash de substitution sur l'écran THÈME, et évite un DNS et un TLS vers un tiers | `<link>` Google Fonts |
| Tests | Vitest sur `domain/` et `tools/` uniquement | c'est là qu'est la logique ; tester les écrans coûterait plus qu'il ne rapporte pour un usage privé | Playwright, tests de composants |
| Hébergement | GitHub Pages, publication par Actions | gratuit, HTTPS, aucun serveur à administrer | Netlify, Vercel, équivalents mais une dépendance de plus |

---

## 12. Non-objectifs

Écrits noir sur blanc pour éviter la dérive :

- pas de comptes, pas d'authentification
- pas de backend, pas de base de données
- pas de plateau, pas de pions, pas de score, même coopératif
- pas de notion de joueur : ni nombre, ni noms, ni ordre
- pas d'outil de calcul de moyenne, la moyenne est un jugement (`modele-de-jeu.md`)
- pas de synchronisation multi-appareils
- pas d'analytics, pas de télémétrie
- pas d'internationalisation, le jeu est français
- pas de publication sur un store

Toute demande future qui contredit cette liste est un changement d'architecture, pas une fonctionnalité.

---

## Annexe : traçabilité des correctifs d'audit

| Finding | Origine | Traité en |
|---|---|---|
| Passage du téléphone non modélisé | `audit-ux` P0 | dissous par `modele-de-jeu.md` |
| Jeu oral rendu visuel | `audit-accessibilite` P0 | dissous par `modele-de-jeu.md` |
| Tour de rôle absent | `audit-ux` P2 | dissous par `modele-de-jeu.md` |
| État du tour non persisté | `audit-ux` P1 | §7 |
| Moment de consommation du niveau non spécifié | `audit-ux` P1 | §6 |
| Double tap sur `RÉVÉLER` | `audit-robustesse` P0 | §5, §10 |
| Niveaux consommés indiscernables | `audit-robustesse` P0 | §5 (`consommes`), design §4 |
| Mise à jour en pleine partie | `audit-robustesse` P0 | §10 |
| `q` sans plafond de longueur | `audit-robustesse` P1 | §4, §8 |
| Écran en veille | `audit-robustesse` P1 | §10 |
| Compteur trompeur, réinitialisation tardive | `audit-robustesse` P1 | §6 |
| Corpus vide au build | `audit-robustesse` P2 | §8 |
| Orientation non verrouillée | `audit-robustesse` P2 | §10 |
| Signalement sans issue | `audit-ux` P1 | §7 |
| Espacement du sélecteur | `audit-ux` P2, `audit-accessibilite` P2 | §5, design §4 |
| Anti-répétition liée au téléphone | `audit-ux` P2 | §6 |
| Rampe d'opacité sous le seuil | `audit-accessibilite` P0 | design §4 |
| Contraste de `[ SIGNALÉE ]` | `audit-accessibilite` P1 | design §5 |
| Labels d'instruction à 11px | `audit-accessibilite` P1 | design §3 |
| Échelle typographique en px | `audit-accessibilite` P1 | design §3 |
| `prefers-reduced-motion` absent | `audit-accessibilite` P1 | design §7 |
| Safe areas | `audit-robustesse` P1 | design §3 |
| Réponse et thème débordants | `audit-robustesse` P1 | design §4 |
| Aucun paquet sélectionné | `audit-robustesse` P1 | design §4 |
| Apprentissage absent | `audit-ux` P1 | design §4 |
| Annonce des changements de phase, structure | `audit-accessibilite` P2 | design §9 |
| Libellés `ANNONCER` et `SUIVANTE` | `audit-ux` P3 | design §4 |
| Gradation plate du lot pilote | `audit-contenu` | hors périmètre V1, chantier contenu |
