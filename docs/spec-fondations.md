# Diez : spécification des phases 1 et 2

> **Statut :** prêt pour implémentation. Aucun code écrit à ce stade.
> **Portée :** phase 1 (tuyau de déploiement) et phase 2 (domaine) de `docs/roadmap.md`.
> **Pourquoi ces deux-là ensemble :** elles sont indépendantes l'une de l'autre, entièrement déterminées par les documents existants, et ne dépendent d'aucun résultat de la phase 0. Les phases 3 et suivantes ne seront spécifiées qu'une fois celles-ci faites, pour ne pas figer des choix que leurs résultats pourraient contredire.

Les sections *Mesure* et *Variantes de marché* du gabarit habituel sont absentes : l'analytique et l'internationalisation sont des non-objectifs déclarés (`architecture.md` §12). Le critère de réussite n'est pas instrumenté, il est dans `docs/recette.md`.

La revue anti-pattern a été menée dans `docs/audit-ux.md` et conclut à un verdict irréprochable, garanti structurellement par la liste des non-objectifs. Rien à réexaminer ici.

---

# Phase 1 : le tuyau de déploiement, à vide

## Ce que cette phase résout

Une seule question, mais elle casse la moitié des PWA déployées sur GitHub Pages : **les quatre réglages du chemin de base s'accordent-ils ?** La réponse ne s'obtient qu'en déployant réellement. Cette phase existe pour que la réponse arrive sur une page vide plutôt que sur une application complète.

## Décisions à prendre, avec recommandation

### Le chemin de base

Quatre valeurs, identiques, sans lesquelles l'application affiche une page blanche ou enregistre un service worker fantôme.

| Emplacement | Valeur |
|---|---|
| `base` dans `vite.config.ts` | `/diez/` |
| `start_url` du manifest | `/diez/` |
| `scope` du manifest | `/diez/` |
| `scope` du service worker | `/diez/` |

### Le manifest

| Champ | Valeur | Raison |
|---|---|---|
| `name` | `Diez` | |
| `short_name` | `Diez` | quatre caractères, aucun risque de troncature sous l'icône |
| `description` | `Jeu de questions coopératif` | |
| `display` | `standalone` | supprime la barre d'URL, seule raison d'être du service worker |
| `orientation` | `portrait` | la composition de l'écran THÈME repose sur du vide vertical |
| `background_color` | `#000000` | voir ci-dessous |
| `theme_color` | `#000000` | idem |

**Le couple `background_color` et `theme_color` est une vraie décision, pas un remplissage.** Le manifest n'accepte qu'une seule valeur, alors que l'application a deux modes à égalité. Cette couleur peint l'écran de démarrage avant que le CSS ne s'applique : un utilisateur en mode clair verra donc un flash noir, ou un utilisateur en mode sombre un flash blanc, selon le choix.

Recommandation : **`#000000`**. Le contexte d'usage est une soirée, et un bref écran noir y est nettement moins agressif qu'un écran blanc pleine luminosité, qui est précisément le problème déjà identifié sur l'écran THÈME.

La balise `theme-color` du HTML, elle, accepte des variantes conditionnelles et doit les utiliser :

```html
<meta name="theme-color" content="#F5F5F5" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
```

Le manifest reste sur une valeur unique, le HTML corrige au chargement.

### TypeScript

`strict: true`, plus **`noUncheckedIndexedAccess: true`**.

Ce second réglage n'est pas de la coquetterie sur ce projet précis. Le domaine manipule en permanence `questions[niveau - 1]`, un accès indexé dont TypeScript affirme par défaut qu'il rend une `Question`. Il rend en réalité `Question | undefined`, et c'est exactement la classe de bug qu'on veut voir à la compilation plutôt qu'un soir de soirée.

### Stratégie de mise à jour

`registerType: 'prompt'`, jamais `autoUpdate` (`architecture.md` §10). La proposition de mise à jour n'est présentée qu'en phase REPOS, ce qui relève de la phase 4 ; la phase 1 pose seulement la stratégie.

## Livrables

- `package.json`, `vite.config.ts`, `tsconfig.json`
- `index.html` avec les deux balises `theme-color`
- `public/manifest.webmanifest` et les icônes
- `.github/workflows/deploy.yml` : build sur push vers `main`, publication de `dist/` sur Pages
- Une page unique affichant `DIEZ`

## Critère de sortie, exécutable

1. `https://7nautilus.github.io/diez/` répond, la page affiche `DIEZ`.
2. Le service worker s'enregistre. Contrôle dans les outils de développement : portée `/diez/`, état `activated`.
3. L'application s'installe sur le téléphone et s'ouvre **sans barre d'URL**.
4. Une modification poussée sur `main` se retrouve en ligne sans intervention manuelle.
5. En mode avion, après une première visite, l'application s'ouvre encore.

Le point 5 n'est pas une exigence du projet, le hors-ligne ayant été rétrogradé. Il sert de contrôle que le précache fonctionne, ce qui est le signe que le service worker n'est pas fantôme.

## Les icônes

*Décision validée : la lettre `d` bas-de-casse, seule.* Un seul caractère règle le problème du masque, où le wordmark de quatre lettres se faisait rogner par la zone de sécurité circulaire.

Le bas-de-casse a été préféré à la capitale pour deux raisons. Il est **plus distinctif** : sa hampe crée une asymétrie qui se reconnaît plus vite dans une grille d'icônes, là où une capitale dans un carré noir est une forme déjà vue partout. Il est aussi **plus léger**, 16 points contre 18, donc le motif se bouche moins à la taille réelle d'un écran d'accueil.

Le choix règle par ailleurs un problème que la question de la lettre ne laissait pas prévoir : **l'icône n'a plus besoin de la police.** Un `d` matriciel se dessine en cercles explicites, ce qui supprime toute dépendance au rendu de Doto, tout risque de substitution silencieuse, et donne le contrôle exact de la géométrie. Le motif dot-matrix reste cité sans que rien ne dépende d'un fichier de police.

### Le motif

Matrice de 5 colonnes sur 7 rangées, 16 points allumés sur 35 :

```
○ ○ ○ ○ ●
○ ○ ○ ○ ●
○ ● ● ● ●
● ○ ○ ○ ●
● ○ ○ ○ ●
● ○ ○ ○ ●
○ ● ● ● ●
```

### La correction optique, obligatoire

**C'est la contrainte à ne pas perdre, et c'est celle qui saute quand on génère les fichiers sans relire.**

Un bas-de-casse ne remplit pas sa boîte de façon symétrique : sa hampe n'occupe qu'une colonne sur les deux premières rangées. Le centre de gravité des points allumés se trouve donc à **(2,500 ; 3,562)** en coordonnées de grille, alors que le centre de la boîte est à (2,0 ; 3,0).

Écart : **une demi-cellule vers la droite, 0,5625 cellule vers le bas.**

Centrer le glyphe sur sa boîte, comme on le ferait d'une capitale, le fait donc flotter visiblement en bas à droite. Le décalage n'est pas une impression, il est mesuré, et il vaut environ un quart de la largeur du glyphe.

Les décalages du tableau ci-dessous **intègrent déjà cette correction**. Ils ne sont pas le centrage géométrique.

### Géométrie

Fond `#000000` à fond perdu, points `#FFFFFF`, points centrés dans leur cellule.

| | `purpose: any` | `purpose: maskable` |
|---|---|---|
| Toile | 512 × 512 | 512 × 512 |
| Cellule | 58 px | 46 px |
| Diamètre du point | 44 px | 35 px |
| Décalage géométrique | 111, 53 | 141, 95 |
| **Décalage à appliquer** | **82, 20** | **118, 69** |
| Correction appliquée | 29 px à gauche, 33 px en haut | 23 px à gauche, 26 px en haut |

**D'où viennent les deux jeux de cellules.** La zone de sécurité d'une icône `maskable` est un cercle de 80 % du côté, soit un rayon de 204,8 px sur une toile de 512. Après correction optique, le point le plus éloigné du centre se trouve à **195,4 px**, soit neuf pixels sous la limite.

À 58 px de cellule, ce même point tomberait à 246,5 px et **sortirait de la zone** : un masque circulaire mangerait la hampe. D'où le second jeu, plus resserré, réservé au masque.

L'icône `any` garde la cellule de 58 px, sans quoi le glyphe n'occuperait que 63 % de la hauteur et paraîtrait timide sur une toile jamais rognée.

Le 192 × 192 se dérive du 512 `any` par mise à l'échelle, les proportions étant identiques.

### L'icône iOS, ajoutée en phase 1

**Lacune de cette spécification, trouvée en l'implémentant :** elle prévoyait les trois icônes du manifest et rien d'autre. Or **iOS ignore les icônes du manifest** pour l'écran d'accueil. Sans `apple-touch-icon`, un iPhone y place une capture de la page, c'est-à-dire un rectangle presque vide. Le narrateur pouvant avoir un iPhone, l'icône devient illisible sur l'appareil qui compte le plus.

S'ajoute donc `apple-touch-icon.png`, **180 × 180**, dérivée du 512 `any` par mise à l'échelle comme le 192. Elle est déclarée dans `index.html` par `<link rel="apple-touch-icon">`, la seule voie qu'iOS lise. Aucune géométrie nouvelle : mêmes proportions, même correction optique.

Un quatrième point de recette en découle :

- [ ] sur iPhone, l'icône de l'écran d'accueil est bien le `d` matriciel, et non une capture de la page.

### Ce qui reste à produire

Les fichiers relèvent de la phase 1. La géométrie ci-dessus suffit à les générer mécaniquement, sans arbitrage supplémentaire, à trois conditions de recette :

- [ ] les décalages employés sont ceux de la ligne **Décalage à appliquer**, pas le centrage géométrique ;
- [ ] sur la variante `maskable`, aucun point n'est rogné par un masque circulaire de rayon 204,8 ;
- [ ] à 56 px, les points ne se touchent pas et la contreforme de la panse reste ouverte.

---

# Phase 2 : le domaine

## Ce que cette phase résout

Toute la logique du jeu, prouvée sans DOM. Elle ne dépend de rien et rien ne dépend d'elle avant la phase 4, donc elle peut être faite en parallèle de la phase 1.

## Trois décisions de conception apparues en spécifiant

Aucune n'est dans `architecture.md`. Elles découlent des principes mais n'en avaient jamais été tirées.

### 1. Le corpus est injecté, jamais importé

La règle de dépendance interdit à `domain/` d'importer quoi que ce soit. Or la pioche a besoin du corpus, qui vit dans `src/data/cartes.gen.json`.

Un `import` depuis `domain/` créerait exactement la dépendance que P2 interdit, et rendrait les tests dépendants du contenu réel.

**Le corpus est donc un paramètre**, de type `readonly Carte[]`, passé par l'appelant. Le domaine ne sait pas d'où il vient.

### 2. L'aléatoire et l'horloge sont injectés

Même raisonnement, pour la même raison. `piocher()` a besoin d'aléatoire et le réducteur a besoin de l'heure pour le verrouillage de 400 ms.

```ts
type Aleatoire = () => number   // dans [0, 1)
```

L'horloge passe déjà par le paramètre `maintenant: number` prévu en `architecture.md` §5. Avec ces deux injections, **toute la phase 2 est testable sans attente réelle et sans hasard**, ce qui est la condition pour que les tests soient rapides et déterministes.

### 3. Les actions portent ce qu'elles révèlent

C'est la décision la plus importante, et elle découle directement de P3.

Le problème : en phase QUESTION, l'état doit contenir l'énoncé mais pas la réponse. D'où vient l'énoncé ? Si le réducteur conservait la carte complète dans un champ interne pour aller y chercher, la réponse serait dans l'état, et P3 tomberait en silence.

**La solution : la recherche a lieu chez l'appelant, qui possède le corpus, et l'action transporte la donnée révélée.**

```ts
type Action =
  | { type: "piocher";  carte: ResumeCarte; consommes: Niveau[] }
  | { type: "annoncer" }
  | { type: "retour" }
  | { type: "choisir";  niveau: Niveau; enonce: EnonceQuestion }
  | { type: "reveler";  reponse: Reponse }
  | { type: "suivante"; carte: ResumeCarte; consommes: Niveau[] }
  | { type: "terminer" }
```

Le réducteur ne voit jamais une carte complète. Il ne peut donc structurellement pas fuiter, quel que soit le bug commis plus tard dans les écrans.

**Contrepartie assumée :** l'appelant pourrait passer un énoncé qui ne correspond pas au niveau choisi. Le réducteur pose donc une seule garde, `enonce.niveau === action.niveau`, et lève sinon. C'est une erreur de câblage, pas un état de jeu, et elle doit être bruyante.

## Surface d'API

```ts
// domain/paquet.ts
function cartesRestantes(corpus, historique, paquetsActifs): readonly Carte[]
function piocher(corpus, historique, paquetsActifs, aleatoire): Carte | null
function niveauxConsommes(historique, carteId): readonly Niveau[]
function consommer(historique, carteId, niveau): Historique
function resumer(carte: Carte): ResumeCarte

// domain/tour.ts
function initial(): EtatTour
function reduire(etat: EtatTour, action: Action, maintenant: number): EtatTour
```

`piocher` rend `null` quand le vivier est vide, jamais une exception : l'épuisement est un état de jeu normal, prévu par un écran dédié.

Toutes les fonctions sont pures et rendent de nouvelles valeurs. `Historique` n'est jamais muté.

## Plan de tests

La phase est finie quand ces cas passent. Ils sont tirés des décisions déjà arbitrées, pas inventés ici.

**Machine à états**

- chaque transition autorisée de la table de `architecture.md` §5 mène à la phase attendue
- **QUESTION vers NIVEAU n'existe pas** : l'action `retour` en phase QUESTION laisse l'état inchangé
- une action inapplicable à la phase courante laisse l'état inchangé, sans lever
- `choisir` avec un `enonce.niveau` discordant lève
- en phase QUESTION, l'état ne contient aucune réponse : contrôle structurel sur l'objet
- en phase THÈME et NIVEAU, l'état ne contient aucun énoncé

**Verrouillage d'entrée**

- une action à `maintenant - depuis < 400` est rejetée, l'état est inchangé
- à exactement 400, elle passe
- le rejet ne consomme rien et ne réinitialise pas `depuis`

**Pioche et historique**

- une carte dont les dix niveaux sont consommés n'est jamais tirée
- les cartes jamais sorties passent avant les cartes entamées
- avec un `aleatoire` déterministe, deux appels identiques rendent la même carte
- vivier vide : `piocher` rend `null`
- les paquets non actifs sont exclus
- `consommer` ne mute pas l'historique reçu
- le niveau est consommé sur `choisir`, jamais sur `suivante` (`architecture.md` §6)

**Cas limites du corpus**

- corpus vide : `piocher` rend `null`, aucune exception
- carte à neuf niveaux consommés : `niveauxConsommes` en rend neuf, le dixième reste piochable

## Critère de sortie

`npm test` passe, et `domain/` ne contient aucun `import` autre que depuis `domain/` lui-même. Ce second point se vérifie mécaniquement et mérite de l'être : c'est le principe P2 qui meurt à la première violation.

## Questions en attente

**Technique.** La forme exacte de `Historique` pour le stockage n'est pas figée. `Record<CarteId, Niveau[]>` est spécifié en `architecture.md` §6, mais la sérialisation, sa validation à la lecture et la migration `v1` restent à concevoir en phase 5. La phase 2 ne dépend pas de ce choix, elle manipule la structure en mémoire.

---

## Ce que ces spécifications ne font pas

Elles ne décident rien de neuf sur le jeu, le design ou l'architecture. Les trois décisions de la phase 2 sont des conséquences tirées de principes existants, pas des ajouts. Si l'une d'elles contredit `architecture.md`, c'est `architecture.md` qui fait foi et la spécification qui est fausse.
