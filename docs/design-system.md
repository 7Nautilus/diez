# Diez : système de design (Nothing)

> Document de référence. Il intègre les correctifs des quatre audits, qui ne servent plus que de trace du raisonnement.
> Fondé sur la skill `nothing-design`. Il dit *comment* le système s'applique à Diez ; il ne recopie pas les tokens, qui font foi dans la skill.
> Le jeu implémenté est décrit dans `docs/modele-de-jeu.md`.

## 1. Polices, à auto-héberger

| Rôle | Police | Usage dans Diez |
|---|---|---|
| Display | **Doto** | Le wordmark `DIEZ` sur l'accueil. **Nulle part ailleurs.** |
| UI et corps | **Space Grotesk** | Thèmes, questions, réponses |
| Data et labels | **Space Mono** | Tous les labels, tous les chiffres, tous les boutons |

**Décision structurante :** ces polices ne sont pas chargées depuis Google Fonts. On télécharge les `.woff2` dans `src/design/fonts/`, on les déclare en `@font-face`, on les précharge.

Deux raisons, aucune ne concerne le hors-ligne :

1. **Le flash de substitution.** L'écran THÈME n'affiche qu'un thème, en grand, sur un fond vide. Un FOUT y est spectaculairement visible, là où il passerait inaperçu dans une interface dense.
2. **Une origine unique.** Servies depuis GitHub Pages avec le reste du bundle, elles n'exigent ni résolution DNS ni négociation TLS vers un tiers.

Graisses à embarquer, au strict nécessaire : Doto (1 fichier variable), Space Grotesk 300/400/500, Space Mono 400/700. Sous-ensemble `latin` uniquement, il couvre les accents français. Budget attendu : environ 200 Ko.

---

## 2. Les deux modes, à égalité

*Décision validée : sombre et clair sont composés et vérifiés tous les deux.* C'est le choix le plus exigeant du projet. Ce qui suit sert à le rendre tenable.

### Trois états, pas deux

| État | Comportement |
|---|---|
| `AUTO` | suit `prefers-color-scheme` du téléphone. **Valeur par défaut.** |
| `SOMBRE` | forcé, quel que soit le système |
| `CLAIR` | forcé, quel que soit le système |

`AUTO` par défaut répond à un problème réel : l'écran THÈME est aux deux tiers vide, et en mode clair ce vide devient une surface blanche pleine luminosité braquée sur une table à 23 h. Le téléphone du narrateur sait déjà s'il fait nuit. Le choix est persisté (`diez:v1:reglages.mode`).

### Stratégie de tokens

Trois blocs, dans cet ordre :

1. `:root` : la palette **claire** complète. Aucun token n'est défini uniquement dans un bloc conditionnel.
2. `@media (prefers-color-scheme: dark) { :root:not([data-mode="clair"]) { … } }` : la palette sombre pour `AUTO`.
3. `:root[data-mode="sombre"] { … }` : la palette sombre forcée.

Ce triptyque est ce qui fait que la bascule manuelle gagne **dans les deux sens**, y compris quand elle contredit le système. Un token défini seulement sous une media query est un bug qui n'apparaîtra que sur le téléphone d'un ami.

### Ce qui traverse sans retouche, et ce qui ne traverse pas

Identiques par construction : polices, échelle typographique, espacements, formes, labels, couleurs de statut.

**La rampe d'opacité du sélecteur traverse proprement**, à condition de l'exprimer en opacité appliquée à `--text-display`, blanc en sombre et noir en clair. Codée en gris fixes, elle s'inverserait perceptuellement en mode clair.

À vérifier séparément : l'écran THÈME pour la raison ci-dessus, le rouge accent (voir §5), et le wordmark Doto qui passe d'un affichage matriciel lumineux à quelque chose de proche d'un ticket imprimé.

### Comment tenir la parité

Une **planche de contrôle** dans `src/design/review/`, en développement uniquement : l'inventaire complet des composants et des cinq écrans, rendu dans les deux modes côte à côte sur une seule page. Sans ça, « les deux modes à égalité » redevient « un mode soigné et un mode approximatif » en trois semaines.

---

## 3. Discipline typographique

Budget imposé par le système : **2 familles, 3 tailles, 2 graisses maximum par écran.**

### L'échelle est en `rem`, pas en pixels

*Correctif d'audit.* Les tailles exprimées en pixels ignorent le réglage de taille de texte du téléphone, qui est le premier réglage que touche toute personne qui voit mal. L'échelle typographique passe donc en `rem` ; les espacements et les bordures restent en `px`.

### Les labels se traitent par fonction, pas uniformément

*Correctif d'audit.* Le label `--label` était défini à 11px, Space Mono, capitales, interlettrage 0,08em. C'est juste pour de la métadonnée et mauvais pour une instruction : les capitales suppriment la silhouette du mot, sur laquelle l'œil s'appuie pour lire vite, et l'effet se cumule à 11px en monospace.

| Fonction | Traitement |
|---|---|
| Métadonnée (`CARTE 042`, `NIVEAU 07`) | 11px, capitales, `--text-secondary` |
| État (`VERROUILLÉ`, `[ SIGNALÉE ]`) | 12px, capitales, `--text-primary` |
| **Instruction** | **13px minimum, sans capitales**, `--text-primary` |

Le système reste intact, il gagne une règle de granularité.

### Deux règles propres à Diez

**Les labels sont toujours Space Mono.** C'est la voix « panneau d'instruments » du jeu.

**Une réponse numérique se compose en Space Mono, une réponse textuelle en Space Grotesk.** « 206 » et « 1997 » sont de la donnée, « Yamoussoukro » est du texte. Le système traite les chiffres comme un objet visuel à part entière, autant s'en servir.

### Zones sûres, et la balise sans laquelle elles ne servent à rien

*Correctif d'audit.* Les ancrages en bord bas tombent sur l'indicateur d'accueil iOS et sur la barre de gestes Android ; les ancrages hauts croisent l'encoche. Tous les bords utilisent `env(safe-area-inset-*)`.

*Correctif de prototype.* Deux attributs conditionnent tout le reste, et leur absence ne produit aucune erreur :

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

Sans `width=device-width`, le téléphone rend la page dans une fenêtre virtuelle de **980 px** puis la réduit : toute l'interface apparaît minuscule. Mesuré sur le prototype, la fenêtre faisait bien 980 px.

Sans `viewport-fit=cover`, `env(safe-area-inset-*)` vaut **toujours zéro**, donc toute la gestion des zones sûres ci-dessus est un décor sans effet.

---

## 4. Hiérarchie écran par écran

Chaque écran a exactement trois couches, et **une seule** rupture de motif.

### ACCUEIL

| Couche | Contenu | Traitement |
|---|---|---|
| Primaire | `DIEZ` | Doto, `--display-xl` |
| Secondaire | Sélection des paquets | Chips, Space Grotesk 400 |
| Tertiaire | compteur, sélecteur de mode, ligne d'apprentissage, actions | Space Mono, bord bas |

Action : `PIOCHER`, bouton pill primaire, pleine largeur.

**La rupture :** le wordmark en Doto. Seul moment dot-matrix de toute l'app ; sa rareté fait sa force.

Quatre correctifs d'audit atterrissent sur cet écran :

- **Le compteur affiche les cartes restantes**, jamais le total : `142 CARTES RESTANTES`. Un compteur qui annonce un stock dont on ne dispose plus fait arriver l'épuisement sans prévenir.
- **`PIOCHER` est désactivé si aucun paquet n'est coché**, avec la raison en label d'instruction : `SÉLECTIONNE AU MOINS UN PAQUET`. Un bouton désactivé sans explication est une impasse.
- **Réinitialiser l'historique est accessible ici**, pas seulement depuis l'écran d'épuisement. Le motif « on joue avec un autre groupe » n'a rien à voir avec « le stock est vide ».
- **`COPIER LES SIGNALEMENTS`** en tertiaire, visible uniquement s'il en existe.

**Aucune consigne sur l'accueil.** *Décision validée, contre une recommandation d'audit.* Une ligne d'instruction permanente y figurait, en réponse au P1 « aucun apprentissage ». Elle a été retirée pour épurer l'écran.

Le P1 repose donc désormais **entièrement sur le menu**, dont la première section s'appelle « Les règles ». C'est tenable parce que l'accueil ne porte que deux contrôles, `PIOCHER` et le burger : quelqu'un de bloqué n'a qu'un seul endroit où aller, et la découvrabilité est meilleure sur un écran nu que sur un écran chargé.

C'est un arbitrage assumé, pas un oubli. Si un narrateur bloque pendant la recette de jeu, c'est le premier endroit à regarder.

**Le menu n'existe que sur l'accueil.** Pendant un tour, rien ne doit concurrencer l'écran : c'est la même règle que « à chaque phase, exactement ce qui peut être montré ». Il prend la forme d'une feuille du bas plutôt que d'un panneau latéral, parce qu'elle arrive dans l'arc du pouce.

### THÈME

| Couche | Contenu | Traitement |
|---|---|---|
| Primaire | **Le thème**, seul | Space Grotesk 300, taille par palier, aligné à gauche, ancré haut |
| Secondaire | *rien* | |
| Tertiaire | `PAQUET GÉNÉRAL` (haut), `CARTE 042` (bas) | métadonnée |

Action : `ANNONCER LES CHIFFRES`, en bas. *Correctif d'audit :* `ANNONCER` seul ne disait ni quoi ni qui. Le libellé porte maintenant le geste du modèle, où tout le monde annonce.

**Taille par palier** plutôt que fixe, pour absorber un thème long sans casser la composition :

| Longueur du thème | Taille |
|---|---|
| 20 caractères ou moins | `--display-lg` |
| 21 à 32 | `--display-md` |
| plus de 32 | `--heading` |

Le dernier palier est un avertissement, pas une cible : un thème qui y tombe doit être raccourci plutôt que la mise en page pliée. Le lot pilote plafonne à 26 caractères, donc le cas est rare.

**La rupture :** le vide. Le thème en haut, deux tiers de l'écran vides en dessous.

*La justification de cette composition a changé avec le modèle du narrateur.* Elle reposait sur un écran brandi au-dessus de la table, lu à bout de bras ; plus personne ne brandit rien. Le geste survit pour une raison plus solide : **le narrateur lit à voix haute en relevant la tête vers la table**, et perd sa ligne à chaque regard. Une typographie large isolée dans le vide se retrouve instantanément. C'est la logique du prompteur.

### NIVEAU

*Deux sélecteurs coexistent. La **molette** est le défaut à éprouver, la **grille** est conservée et reste commutable. Le choix se tranchera en soirée, pas par argument : les deux raisonnements sont bons et pointent en sens inverse.*

| | Molette (défaut) | Grille (conservée) |
|---|---|---|
| Geste | défiler, puis valider | taper |
| Engagement | **séparé de la désignation** | immédiat |
| Mistap | sans conséquence | irréversible |
| Rampe visible | 5 crans à la fois | les 10 d'un coup |
| Vitesse à cible connue | plus lente | directe |

**Ce que la molette gagne.** Faire défiler ne commet rien ; seul `VOIR LA QUESTION` engage. Le risque de mistap **disparaît** au lieu d'être atténué par la taille des cibles, ce qui est la seule compensation dont disposait la grille puisqu'il n'y a pas de retour depuis QUESTION.

**Ce qu'elle perd.** La grille montre les dix crans d'un coup, donc la progression de 0,45 à 1,00 se lit comme un objet. La molette n'en montre que cinq : on sent l'intensité monter en défilant, mais l'échelle entière n'est jamais visible. Un niveau déjà joué y interrompt aussi la lecture, là où la grille le met de côté sans casser la montée.

**À observer pendant la recette de jeu :** combien de fois le narrateur se trompe de cran avec chacun, et s'il ralentit avec la molette. Si personne ne se trompe avec la grille, sa simplicité gagne. Si les erreurs arrivent, la molette les rend gratuites.

#### La molette

| Paramètre | Valeur |
|---|---|
| Hauteur d'un cran | 56px |
| Fenêtre visible | 280px, soit 5 crans |
| Bande de lecture | fixe, centrée, filets `--border-visible` et deux repères `--text-secondary` |
| Ancrage | en bas, comme la grille |
| Validation | `VOIR LA QUESTION`, bouton primaire distinct |

L'opacité s'applique ici **au texte**, le chiffre n'ayant pas de bloc derrière lui : c'est le modèle que l'audit avait calculé, sans le piège de contraste de la grille. Vérifié, 3,31 en clair et 4,41 en sombre au niveau 1.

Un niveau déjà joué s'affiche en point médian. Si la bande tombe dessus, le bouton se désactive **en disant pourquoi** (`NIVEAU 7 DÉJÀ JOUÉ`). Pas de saut automatique : une molette qui esquive des crans toute seule est incompréhensible.

#### La grille

| Couche | Contenu | Traitement |
|---|---|---|
| Primaire | La grille de **1 à 10** | Space Mono, `--display-md`, blocs techniques (rayon 4px) |
| Secondaire | | |
| Tertiaire | Rappel du thème | métadonnée, haut |

**La rupture :** la rampe d'opacité. Le 1 s'efface, le 10 s'impose, progression régulière entre les deux. La difficulté devient *physique* : on voit la montée avant de la choisir. On encode par **opacité, jamais par couleur** ; un dégradé vert vers rouge serait exactement l'anti-pattern, et illisible pour les 8 % d'hommes atteints de déficience de la vision des couleurs.

**La rampe part de 0,45.** *Correctif d'audit.* Les chiffres sont en grand texte, donc soumis au seuil de 3:1, et les blocs étant des cibles tactiles leur bordure l'est aussi. L'opacité minimale pour tenir 3:1 est de 0,35 sur noir et **0,42 sur `#F5F5F5`**. C'est le mode clair qui contraint, ce qui est contre-intuitif : on imagine le fond blanc plus permissif, c'est l'inverse.

| Niveau | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Opacité | 0,45 | 0,51 | 0,57 | 0,63 | 0,69 | 0,76 | 0,82 | 0,88 | 0,94 | 1,00 |

Le coût est réel : la rampe va de 45 % à 100 % au lieu de « presque effacé » à 100 %. Elle reste parfaitement lisible comme progression, elle est moins spectaculaire. C'est le prix d'un niveau 1 choisissable par quelqu'un qui voit mal, dans un salon sombre.

**L'opacité s'applique au remplissage, jamais à l'élément.** *Correctif de prototype, et c'est le plus important de la série.*

L'audit avait calculé le seuil de 0,45 en modélisant la rampe comme du **texte sur un fond**. Le sélecteur affiche en réalité des **blocs remplis contenant un chiffre inversé**. En atténuant l'élément entier, le chiffre s'estompe avec son bloc : les deux convergent vers le fond et l'écart entre eux s'effondre.

| Niveau 1 | Bloc contre fond | Chiffre contre bloc |
|---|---|---|
| `opacity` sur l'élément, clair | 3,30 conforme | **1,83 échec** |
| `opacity` sur l'élément, sombre | 4,43 conforme | **2,22 échec** |
| Opacité sur le remplissage, clair | 3,31 conforme | **3,31 conforme** |
| Opacité sur le remplissage, sombre | 4,41 conforme | **4,41 conforme** |

Les chiffres 1, 2 et 3 étaient difficilement lisibles. En n'atténuant que le fond du bloc, le chiffre reste opaque et les deux rapports deviennent identiques, ce qui est logique puisque le chiffre est exactement la couleur du fond.

Le seuil de 0,45 tient, c'est le modèle de calcul qui était faux.

Implémentation : `color-mix(in srgb, var(--text-display) calc(var(--op) * 100%), transparent)` sur le fond, jamais `opacity` sur le bloc.

**Les niveaux déjà consommés changent de forme, pas d'opacité.** *Correctif d'audit.* L'opacité encode déjà la difficulté ; le système encode aussi l'état désactivé en opacité. Le canal est saturé, un niveau 2 disponible et un niveau 9 brûlé se ressembleraient. Le système recommande « opacité, puis motif » : un niveau consommé **perd son remplissage, ne garde que sa bordure, et son chiffre est remplacé par un point médian**. Deux informations, deux canaux, aucune couleur introduite.

L'état vient du champ `consommes` porté par la phase NIVEAU (`architecture.md` §5). C'est le cas normal dès la deuxième soirée, pas un cas limite.

**Ergonomie, devenue critique.** Il n'y a pas de retour arrière après le choix : la prévention du mistap repose **entièrement** sur ce sélecteur.

| Paramètre | Valeur | Origine |
|---|---|---|
| Hauteur des blocs | 64px | bien au-delà du minimum de 44px |
| Disposition | grille 2 colonnes | demi-largeur par bloc |
| **Espacement entre blocs** | **8px minimum** | WCAG 2.2, et convergence de deux audits |
| **Ancrage vertical** | **en bas** | correctif de prototype, voir ci-dessous |

L'espacement est le paramètre à ne pas sacrifier. Dix blocs jointifs produisent exactement le type de cible où le pouce dérape d'une case.

**La grille est ancrée en bas, pas en haut.** *Correctif de prototype.* Ancrée en haut, elle finissait à **52 % de la hauteur d'écran**, avec **315 px de vide en dessous**. C'est le seul écran à visée précise et sans retour possible, et il plaçait ses cibles hors de l'arc naturel du pouce. Ancrée en bas, la grille occupe 45 % à 88 % de la hauteur. Aucune autre valeur ne change.

Le vide reste, mais au-dessus de la grille et non en dessous, ce qui est aussi plus cohérent avec le reste du système : l'espace y sert toujours à isoler, jamais à combler.

### QUESTION

| Couche | Contenu | Traitement |
|---|---|---|
| Primaire | L'énoncé | Space Grotesk 400, `--heading` |
| Secondaire | | |
| Tertiaire | `NIVEAU 07 · VERROUILLÉ` | label d'état, haut |

Action : `RÉVÉLER LA RÉPONSE`, bouton secondaire, bas.

**Contrainte de lecture orale.** Cet écran n'est pas lu, il est *dit*. Le narrateur le prononce à toute la table en relevant les yeux et doit retrouver sa ligne à chaque fois. Deux règles de prompteur en découlent :

- interlignage de 1,5 au minimum, contre 1,2 pour un texte simplement lu ;
- longueur de ligne plafonnée autour de 45 caractères, au-delà de quoi l'œil ne retrouve plus le début de la ligne suivante.

Le mot `VERROUILLÉ` fait à lui seul tout le travail d'explication : le geste de retour est absorbé sans effet, et aucun mécanisme de feedback n'est construit pour le signaler. **L'état est lisible, il n'a donc pas besoin d'être notifié.**

**La rupture :** un vide de 96px (`--space-4xl`) entre l'énoncé et le bouton de révélation. Partout ailleurs l'app est dense ; ici l'espace est un dispositif de sécurité, on ne révèle pas la réponse par un pouce mal placé. La contrainte fonctionnelle *est* le geste de design.

Ce vide est **incompressible** : si l'énoncé est long, c'est lui qui défile, jamais le vide qui se réduit. Le plafond de 140 caractères sur `q` (`architecture.md` §8) existe pour que ce cas reste théorique.

### RÉPONSE

| Couche | Contenu | Traitement |
|---|---|---|
| Primaire | **La réponse** | taille par palier ; Space Mono si numérique, Space Grotesk 300 sinon |
| Secondaire | Rappel de la question, puis `note` si présente | `--body-sm`, `--text-secondary` |
| Tertiaire | `NIVEAU 07`, actions | métadonnée |

Actions : `CARTE SUIVANTE` (primaire) et `SIGNALER` (ghost). *Correctif d'audit :* `SUIVANTE` ne disait pas suivante quoi.

**Taille par palier.** *Correctif d'audit.* `--display-lg` sur une réponse de 60 caractères donne cinq lignes de typographie display sur un écran de 320px : ce n'est plus « data as beauty », c'est un mur.

| Longueur de `r` | Taille |
|---|---|
| 12 caractères ou moins | `--display-lg` |
| 13 à 30 | `--display-md` |
| plus de 30 | `--heading` |

**`CARTE SUIVANTE` n'occupe pas la position de `RÉVÉLER LA RÉPONSE`.** *Correctif d'audit.* Deux boutons successifs au même endroit transforment un double tap en réponse jamais lue. Le décalage de position double le verrouillage d'entrée de 400 ms décrit dans `architecture.md` §10 : une protection dans le domaine, une dans la mise en page.

**Concrètement : l'action primaire passe avant le ghost**, contre l'ordre habituel. *Correctif de prototype.* Placés dans l'ordre naturel, `SIGNALER` puis `CARTE SUIVANTE`, les deux boutons sont chacun le dernier enfant ancré en bas de leur écran : mesuré, ils tombaient à **1 px l'un de l'autre**. La règle ci-dessus était donc écrite et violée en même temps. En inversant l'ordre, l'écart passe à 83 px.

C'est le genre de contrainte qui ne se vérifie pas en relisant : il faut mesurer les deux écrans successifs.

**Le contrôle se fait sur toute la chaîne, pas écran par écran.** *Correctif de prototype.* Tous les écrans ancrent leur dernier bouton au même endroit, donc les superpositions sont la règle et non l'exception. Ce qui compte n'est pas qu'il y ait superposition, c'est qu'un second tap **détruise de l'information**.

| Transition | Écart | Verdict |
|---|---|---|
| REPOS `PIOCHER` vers THÈME `ANNONCER` | 33px | décalés |
| THÈME `ANNONCER` vers NIVEAU `RETOUR` | **0px** | superposés, mais la boucle revient à THÈME sans perte |
| NIVEAU `VOIR LA QUESTION` vers QUESTION `RÉVÉLER` | 64px | décalés, sinon la réponse serait révélée |
| QUESTION `RÉVÉLER` vers RÉPONSE `CARTE SUIVANTE` | 64px | décalés, sinon la réponse serait sautée |
| RÉPONSE `CARTE SUIVANTE` vers THÈME `ANNONCER` | 64px | décalés |

**Et le verrou protège la phase, pas seulement les transitions.** Cette même mesure a montré que `SIGNALER` occupe exactement la position de `RÉVÉLER` de l'écran précédent : un double tap signalait la question par accident. Ce bouton n'étant pas une transition, il échappait au verrou de 400 ms. Toute action utilisateur, transition ou non, passe désormais par le même contrôle de délai.

**La rupture :** la réponse en taille display. `YAMOUSSOUKRO` en 48px n'a besoin d'aucun décor.

---

## 5. Le rouge, une seule affectation dans toute l'app

`--accent` (`#D71921`) est un signal d'interruption, pas une couleur de palette. Il est réservé au **signalement d'une question douteuse et aux états d'erreur.** Rien d'autre.

En particulier, **le niveau 10 n'est pas rouge.** Un niveau élevé n'est pas une urgence, c'est une valeur haute sur une échelle, et ça s'encode en opacité (§4).

**Correctif de contraste.** *Correctif d'audit.*

| Combinaison | Ratio | Seuil | Verdict |
|---|---|---|---|
| `#D71921` sur `#000000` | **4,05:1** | 4,5:1 (texte normal) | échec |
| `#D71921` sur `#F5F5F5` | 4,76:1 | 4,5:1 | conforme |

Le statut `[ SIGNALÉE ]` est du texte normal et échoue donc en mode sombre. Correctif sans toucher au rouge : **le texte du statut passe en `--text-primary`, le rouge ne subsiste que sur les crochets**, qui relèvent alors du seuil de 3:1 en tant qu'élément non textuel. Le rouge garde son rôle de signal, le texte redevient lisible.

À noter : `--text-disabled` (`#666666`) sur noir donne **3,66:1**, pas les 4,0:1 annoncés dans la table de tokens de la skill. Utilisable pour du grand texte et des bordures, jamais pour du texte courant.

---

## 6. Inventaire des composants

| Composant | Réf. système | Usage |
|---|---|---|
| `Bouton` (primaire, secondaire, ghost) | Composants §2 | pill, Space Mono capitales 13px, hauteur de 44px minimum |
| `Etiquette` | Tokens §1 | les trois variantes par fonction (§3) |
| `Chip` | Composants §7 | sélection des paquets ; actif : bordure `--text-display` |
| `SelecteurMode` | Composants §8 | segmenté 3 positions `AUTO / SOMBRE / CLAIR`, accueil, tertiaire |
| `SelecteurNiveau` | spécifique | grille de 1 à 10, rampe d'opacité, niveaux consommés en bordure seule |
| `EtatVide` | Composants §15 | pioche épuisée : titre `--text-secondary`, une phrase, 96px de marge, aucun dessin |
| `Statut` | Composants §14 | `[ SIGNALÉE ]` en ligne. **Jamais de toast.** |
| `Confirmation` | Composants §14 | seul usage : réinitialiser l'historique |

---

## 7. Mouvement

- Transitions entre phases : **fondu d'opacité, 200 ms**, `cubic-bezier(0.25, 0.1, 0.25, 1)`. Aucun glissement.
- Aucun ressort, aucun rebond. Rythme « percussif, pas fluide » : un clic, pas un swoosh.
- Le sélecteur de niveau ne s'anime pas à la pression, la bordure passe à `--text-display`, point.
- La bascule de mode ne s'anime pas. C'est un interrupteur, pas une transition.
- **Sous `prefers-reduced-motion: reduce`, toutes les transitions passent à 0 ms.** *Correctif d'audit.* Le changement d'écran reste instantané et parfaitement lisible, ce qui est d'ailleurs cohérent avec le rythme revendiqué.

---

## 8. Anti-patterns à surveiller sur ce projet

Ceux qui ont une chance réelle d'apparaître ici :

- une échelle de couleur du vert au rouge sur les niveaux, **le piège numéro un** ;
- une rampe d'opacité ramenée sous 0,45 parce que « c'est plus joli » ;
- `opacity` posée sur un bloc de niveau plutôt que sur son remplissage, ce qui efface le chiffre en même temps que le bloc ;
- un `display` d'auteur sur un élément piloté par l'attribut `hidden` : `[hidden]{display:none}` vient de la feuille du navigateur avec une spécificité nulle et se fait écraser en silence, l'élément restant affiché en permanence. Poser `[hidden]{display:none!important}` une fois pour tout le document ;
- l'état consommé encodé en opacité, ce qui le rendrait indiscernable de la difficulté ;
- un mode clair traité comme un dérivé du sombre, avec des gris simplement inversés ;
- un token de couleur défini uniquement dans un bloc `@media` ;
- un toast « Question signalée ! » au lieu d'un `[ SIGNALÉE ]` en ligne ;
- une ombre portée sur les cartes pour « faire carte à jouer » ;
- un skeleton au chargement, alors que tout est déjà local ;
- une illustration ou une mascotte sur l'écran de pioche épuisée ;
- un rebond sur les touches du sélecteur, parce que « ça fait vivant » ;
- une interface de saisie des chiffres de chacun pour calculer la moyenne (`modele-de-jeu.md`).

---

## 9. Accessibilité

Les correctifs de contraste et de typographie sont intégrés dans les sections concernées. Trois exigences restent transverses.

**Annonce des changements de phase.** Le parcours change d'écran sans rechargement, donc un lecteur d'écran ne signale rien. Un conteneur en `aria-live="polite"` autour de la zone de phase suffit.

**Structure sémantique.** Un `h1` par écran, portant le contenu primaire : le thème, puis l'énoncé, puis la réponse. Gratuit, et ça donne une structure navigable.

**Cibles tactiles.** 64px sur le sélecteur, 44px minimum partout ailleurs, 8px d'espacement entre cibles adjacentes. Le bouton ghost `SIGNALER` n'ayant pas de bordure, sa zone tactile doit être garantie par le remplissage.

Rappel de ce qui est déjà acquis et qu'il ne faut pas casser : aucune information portée par la couleur seule, aucun clignotement, aucune lecture automatique, aucune limite de temps. Et le modèle du narrateur rend le jeu **plus oral que la boîte du commerce**, donc jouable par une personne aveugle en tant que participante.
