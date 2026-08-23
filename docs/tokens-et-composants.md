# Diez : variables, composants et variantes

> **La source unique.** Toute valeur du système vit ici et nulle part ailleurs. Les autres documents citent des **noms**, jamais des nombres.
> `design-system.md` dit *pourquoi* une valeur est ce qu'elle est. Ce document dit *ce qu'elle est* et *comment on l'appelle*.
> Modèle repris de Figma : des variables en collections avec modes, des composants, et des variantes.

## La règle de dérivation

Une valeur littérale n'a le droit d'apparaître qu'**une fois**, dans la collection où elle est définie. Partout ailleurs, on référence.

| Endroit | A le droit d'écrire |
|---|---|
| `tokens.css`, collection Primitives | des littéraux |
| `tokens.css`, collections Sémantique et Composant | des références à Primitives |
| Modules CSS des composants | des références aux collections Sémantique et Composant |
| Documentation | des **noms** de variables, et la raison d'être de leur valeur |
| Code TypeScript | des constantes nommées renvoyant à leur section de documentation |
| `lot.schema.json` | les plafonds de longueur du contenu, qui n'ont pas de forme CSS |

Contrôle mécanique, dans le même esprit que celui des cadratins :

```bash
rg -n '#[0-9a-fA-F]{3,8}\b' src --glob '!tokens.css'
```

Doit ne rien renvoyer.

---

# Variables

Trois collections, comme dans Figma : des primitives sans signification, une couche sémantique qui leur donne un rôle, une couche composant qui nomme les décisions locales.

## Collection 1 : Primitives

Des valeurs brutes, sans sens attaché. On ne les utilise jamais directement dans un composant.

**Échelle de gris et signal.** Reprise telle quelle de la skill `nothing-design`, qui fait autorité.

| Nom | Valeur |
|---|---|
| `--noir` | `#000000` |
| `--gris-950` | `#111111` |
| `--gris-900` | `#1A1A1A` |
| `--gris-850` | `#222222` |
| `--gris-800` | `#333333` |
| `--gris-500` | `#666666` |
| `--gris-400` | `#999999` |
| `--gris-200` | `#CCCCCC` |
| `--gris-100` | `#E8E8E8` |
| `--gris-050` | `#F5F5F5` |
| `--blanc` | `#FFFFFF` |
| `--rouge` | `#D71921` |

**Espacement**, base 8.

`--esp-2xs` 2px · `--esp-xs` 4px · `--esp-sm` 8px · `--esp-md` 16px · `--esp-lg` 24px · `--esp-xl` 32px · `--esp-2xl` 48px · `--esp-3xl` 64px · `--esp-4xl` 96px

**Typographie**, en `rem` pour suivre le réglage de taille de texte du téléphone.

`--txt-display-xl` 4.5 · `--txt-display-lg` 3 · `--txt-display-md` 2.25 · `--txt-heading` 1.5 · `--txt-body` 1 · `--txt-body-sm` .875 · **`--txt-body-xs` .8125** · `--txt-caption` .75 · `--txt-label` .6875

**Graisses.** `--graisse-legere` 300 · `--graisse-normale` 400 · `--graisse-forte` 700

Les trois graisses que le système emploie, chacune servie par une face réelle de `fonts.css` : Space Grotesk 300, la normale des deux familles, et 700 pour Doto comme pour Space Mono. Écrites en chiffres dans huit modules, elles rendaient invisible le budget de **deux graisses par écran** que pose `design-system.md` §3 ; nommées, ce budget se compte à la lecture.

Space Grotesk 500 est déclarée dans `fonts.css` mais n'est employée nulle part. Elle n'aura de token que le jour où elle aura un emploi : un token sans usage est une invitation à lui en trouver un, ce qui est exactement la façon dont un budget de deux graisses en devient trois.

**Interlignage.** `--interligne-serre` 1

Pour un libellé qui tient sur une ligne, et pour lui seul : `Chip`, `Segment`, cran du `SelecteurNiveau`, wordmark de l'accueil, planche de contrôle. Il vaut 1 et non l'interlignage du corps de texte parce qu'il n'y a **aucune ligne suivante à espacer** : au-delà de 1, le surplus se répartit en blanc au-dessus et en dessous du libellé, entre dans la boîte du contrôle et fausse son centrage vertical. Un texte qui se lit vraiment a le sien, `--prompteur-interligne`.

**Mouvement.** `--duree-courte` 200ms · `--courbe-transition` `cubic-bezier(0.25, 0.1, 0.25, 1)`

La courbe est un token et non une valeur de module : `design-system.md` §7 la prescrit pour tout le système, la Feuille s'en sert déjà et les transitions entre phases s'en serviront. Recopiée dans deux modules, elle diverge au premier réglage.

## Collection 2 : Sémantique, avec modes

Une variable, deux valeurs, comme un mode Figma. **Résolu par `light-dark()`**, ce qui supprime la triple répétition de la palette.

| Variable | Clair | Sombre |
|---|---|---|
| `--ground` | `--gris-050` | `--noir` |
| `--surface` | `--blanc` | `--gris-950` |
| `--surface-haute` | `--gris-050` | `--gris-900` |
| `--border` | `--gris-100` | `--gris-850` |
| `--border-visible` | `--gris-200` | `--gris-800` |
| `--border-controle` | `--gris-500` | `--gris-400` |
| `--text-disabled` | `--gris-400` | `--gris-500` |
| `--text-secondary` | `--gris-500` | `--gris-400` |
| `--text-primary` | `--gris-900` | `--gris-100` |
| `--text-display` | `--noir` | `--blanc` |
| `--accent` | `--rouge` | `--rouge` |

**Ces noms sont ceux de la skill et ne sont pas traduits.** Ils constituent un vocabulaire importé ; les renommer romprait la correspondance avec le document qui fait autorité. Les variables que nous inventons, en revanche, suivent le lexique du projet.

### Deux bordures, deux rôles

`--border-controle` n'est pas un `--border-visible` plus foncé : c'est **une autre fonction**, et les deux coexistent.

WCAG 1.4.11 demande 3:1 pour la bordure d'un contrôle. Mesuré au navigateur contre `--ground`, `--border-visible` donne **1,47 en clair et 1,66 en sombre** : il ne le tient dans aucun des deux modes. Or un `Chip` inactif n'a que sa bordure pour exister, et un `Bouton` secondaire n'a qu'elle pour ressembler à un bouton. `--border-controle` tient le seuil largement, **5,27 en clair et 7,37 en sombre**.

| Le token | Ce qu'il fait | Où |
|---|---|---|
| `--border-visible` | **dessiner** un filet, un séparateur | trait haut de la `Feuille`, poignée, filets de la bande de lecture |
| `--border-controle` | rendre un contrôle **perceptible** quand la bordure est son seul indice | `Chip` inactif, `Bouton` secondaire |

Ce sont les valeurs de `--text-secondary`, déjà éprouvées à un seul endroit par le `SelecteurNiveau`, dont la bordure de cran consommé avait buté sur exactement ce problème et l'avait résolu localement. Le token généralise ce choix sous un nom qui dit son **rôle** et non sa teinte : une bordure n'est pas du texte, et la faire dépendre d'un token de texte la rendrait solidaire d'un réglage qui ne la concerne pas.

**`--border-visible` reste le bon choix pour un filet, et n'est pas remplacé.** Un filet ne désigne rien, il dessine ; il n'est pas un contrôle et n'a aucun seuil à tenir. Un système qui remonterait toutes ses bordures à 3:1 perdrait la discrétion que Nothing revendique, et le premier à en souffrir serait le trait haut de la `Feuille`, qui doit séparer sans se faire remarquer.

Le préfixe reste `--border-` malgré le lexique français : c'est le nom de famille importé de la skill, et le suffixe seul dit ce que ce membre a de particulier.

Un cas reste à trancher au moment d'appliquer le token, et il n'est pas tranché ici : le groupe du `Segment` porte une bordure, mais son option cochée est un pavé plein qui dit déjà où est le contrôle et dans quel état il se trouve. Sa bordure n'est peut-être qu'un filet.

### Les trois états du mode, en trois lignes

```css
:root                      { color-scheme: light dark }
:root[data-mode="sombre"]  { color-scheme: only dark }
:root[data-mode="clair"]   { color-scheme: only light }
```

Chaque variable sémantique s'écrit alors une seule fois :

```css
--ground: light-dark(var(--gris-050), var(--noir));
```

C'est le gain de DRY le plus important du système : la palette sombre passe de **trois blocs répétés à zéro**. `AUTO` est le comportement par défaut, et les deux surcharges gagnent dans les deux sens sans qu'aucune valeur ne soit dupliquée.

*Contrainte à connaître :* `light-dark()` demande un navigateur récent. Le projet vise des téléphones actuels, mais c'est le seul point du système qui suppose une base moderne.

## Collection 3 : Composant

Les décisions locales, nommées. Chacune renvoie à la section qui la justifie.

| Variable | Valeur | Justifiée dans |
|---|---|---|
| `--niveau-bloc-h` | 64px | design-system §4, cible tactile bien au-delà du minimum |
| `--niveau-bloc-ecart` | `--esp-sm` | WCAG 2.2, seul garde-fou restant contre le mistap |
| `--niveau-cran-h` | **plancher** de 56px | hauteur d'un cran de molette ; la valeur est le plus grand de la cible tactile et de la ligne du chiffre, sans quoi une taille de texte systeme augmentee ferait deborder le chiffre de son cran |
| `--niveau-crans-visibles` | 5 | ce que la fenetre montre a la fois |
| `--niveau-fenetre-h` | `--niveau-crans-visibles` x `--niveau-cran-h` | derive, et non 280px ecrits : les deux se desynchronisaient au premier reglage |
| `--rampe-min` | 0.45 | seuil de contraste, le mode clair étant le plus contraignant |
| `--rampe-max` | 1 | pleine intensité au niveau 10 |
| `--revelation-vide` | `--esp-4xl` | dispositif de sécurité contre le tap parasite |
| `--prompteur-interligne` | 1.5 | écran dit à voix haute, pas lu |
| `--prompteur-mesure` | 45ch | au-delà, l'œil perd la ligne suivante |
| `--cible-min` | 44px | minimum tactile hors sélecteur |

## Collection 4 : Domaine

Toutes les valeurs du système ne sont pas des tokens CSS. Celles que le domaine manipule vivent en TypeScript, dans `src/domain/`, et suivent la même règle : **définies une fois, citées par leur nom partout ailleurs.**

| Constante | Valeur | Justifiée dans |
|---|---|---|
| `VERROU_MS` | 400 | architecture §10, verrou d'entrée contre le double tap |
| `NIVEAUX` | 1 à 10 | l'échelle du jeu, d'où le nom du projet |
| `TOUR_PERIME_H` | 12 | architecture §7, au-delà c'est une autre soirée |

Une valeur qui existe des deux côtés, comme la durée de transition, est définie **côté CSS** et lue depuis le token si le domaine en a besoin. Jamais recopiée.

Deux d'entre elles sont des **alias** de primitives plutôt que des nombres : `--niveau-bloc-ecart` et `--revelation-vide`. C'est voulu. Elles disent qu'un espacement de composant est une valeur de l'échelle, pas un nombre choisi à part.

## Ce qui n'est pas un token

Les plafonds de longueur du contenu (`theme` 40, `q` 140, `r` 60, `note` 160) n'ont pas de forme CSS. Leur source unique est **`content/schema/lot.schema.json`**, qui les fait respecter mécaniquement à la saisie.

Ils le sont désormais **aussi au build** : `tools/compiler.ts` ouvre le schéma et en extrait les quatre `maxLength` au lieu de les recopier, puis refuse d'écrire le corpus si une carte les dépasse. Le schéma reste donc la seule écriture de ces nombres, et il est exécuté au lieu d'être seulement cité. Le détail de ce que la CI bloque, et de ce qu'elle ne bloque toujours pas, est dans `conventions-code.md` §10.

---

# Composants et variantes

Chaque composant a une base et des **axes de variante**, portés par des attributs `data-*`. Un axe, un attribut : le CSS reste une petite matrice au lieu d'une collection de classes qui se recopient.

**Distinction avec Figma :** là où Figma modélise l'état (survol, désactivé) comme un axe de variante de plus, le CSS l'exprime en pseudo-classes. La matrice est la même, le mécanisme diffère. Les tables ci-dessous ne listent donc que les variantes *choisies*, jamais les états *subis*.

## Bouton

Base : `Space Mono`, `--txt-label` majuscules, interlettrage 0.06em, hauteur minimale 48px, rayon pill.

| `data-variante` | Fond | Bordure | Texte |
|---|---|---|---|
| `primaire` | `--text-display` | aucune | `--ground` |
| `secondaire` | aucun | `--border-controle` | `--text-primary` |
| `ghost` | aucun | aucune | `--text-secondary` |

États en pseudo-classes : `:hover` éclaircit la bordure, `:focus-visible` pose un contour de 2px, `:disabled` passe l'opacité à 0.4.

## Etiquette

Le composant le plus utilisé, et celui où la duplication s'installait. Base : `Space Mono`.

| `data-fonction` | Taille | Casse | Couleur |
|---|---|---|---|
| `metadonnee` | `--txt-label` | majuscules | `--text-secondary` |
| `etat` | `--txt-caption` | majuscules | `--text-primary` |
| `instruction` | `--txt-body-xs` | **normale** | `--text-primary` |

La casse normale de `instruction` n'est pas un oubli : les capitales suppriment la silhouette du mot, sur laquelle l'œil s'appuie pour lire vite, et une instruction est le seul label qu'on lit vraiment.

## Chip et Segment

| Composant | Axe | Valeurs |
|---|---|---|
| `Chip` | `data-actif` | `true` bordure et texte en `--text-display`, sinon `--border-controle` et `--text-secondary` |
| `Segment` | `data-actif` sur chaque option | `true` inverse le fond et le texte |

`Chip` est en sommeil tant qu'un seul paquet existe : un sélecteur à une option est un contrôle qui ne peut rien faire.

**Conséquence du passage à `--border-controle`, à traiter en même temps :** le survol d'un chip inactif visait `--text-secondary`, qui est désormais la valeur même de sa bordure au repos ; le pas de survol ne ferait plus rien. Il se reporte sur `--text-primary`, c'est-à-dire un cran et un seul, `--text-display` restant réservé à l'état actif. C'est exactement ce que fait déjà le `Bouton` secondaire, ce qui aligne les deux au lieu de les séparer.

## SelecteurNiveau

Deux formes coexistent, la molette par défaut.

| Axe | Valeurs |
|---|---|
| `data-forme` | `grille` · `molette` |
| `data-etat` sur un cran | `libre` · `consomme` |
| `--op` sur un cran libre | voir la formule ci-dessous |

**La rampe est une formule, pas une table.** Dix valeurs recopiées se désynchronisent le jour où le seuil bouge ; une interpolation ne le peut pas.

```
--op(n) = --rampe-min + (n - 1) × (--rampe-max - --rampe-min) / 9
```

Ce qui donne, pour information et non pour recopie : 0,45 · 0,51 · 0,57 · 0,63 · 0,69 · 0,76 · 0,82 · 0,88 · 0,94 · 1,00.

**Un cran consommé change de forme, jamais d'opacité.** L'opacité encode déjà la difficulté ; le canal est pris. Le cran perd son remplissage, garde sa bordure, et son chiffre devient un point médian.

**L'opacité s'applique différemment selon la forme**, et c'est une conséquence du contraste, pas un caprice :

| Forme | Cible de l'opacité | Pourquoi |
|---|---|---|
| `grille` | le **remplissage** du bloc | le chiffre est inversé sur le bloc ; atténuer l'élément entier ferait converger les deux vers le fond |
| `molette` | le **texte** du cran | le chiffre n'a pas de bloc derrière lui |

## Feuille

Panneau du bas. `--surface`, bordure haute `--border-visible`, rayon 16px en haut, poignée de 2px, hauteur maximale 86dvh. Aucune ombre : la séparation se fait par bordure. Aucune variante.

Voile associé : **`--voile`**, dérivé de `--noir` à 80 %. Il ne prend pas `light-dark()` : un voile clair ne masque rien, il reste noir dans les deux modes. Ce token existe parce que la valeur littérale écrite ici obligeait `Feuille.module.css` à enfreindre la règle « aucune couleur hors de `tokens.css` ».

**Chaque panneau ouvert s'inscrit dans une pile, `design/panneaux.ts`, et seul celui du dessus répond à un geste de fermeture.** L'écouteur d'Échap est posé sur `window`, donc deux panneaux ouverts étaient prévenus de la même touche et se fermaient tous les deux. Mesure au navigateur, menu et Confirmation ouverts, un seul Échap :

```
AVANT   panneaux ["Menu", "Réinitialiser l'historique"]
APRÈS   panneaux []                       focus BODY
```

Échap sortait donc de la demande de réinitialisation **et** emportait le menu, en rendant le focus à un bouton que le même geste venait de démonter. Après correctif, même mesure : `["Menu"]` reste, et le focus revient au bouton `Réinitialiser l'historique`.

La pile vit dans `design/` et non dans `app/` parce que c'est le seul endroit que les deux atteignent : `design/` ne remonte vers rien, alors qu'`app/` descend librement vers lui. C'est elle qui donne au **geste de retour du téléphone** le même ordre de fermeture qu'à Échap, et qui lui dit qu'il y a un panneau à fermer plutôt qu'une partie à reculer (`architecture.md` §5).

## Statut

| `data-ton` | Usage |
|---|---|
| `neutre` | texte en `--text-primary` |
| `signal` | crochets en `--accent`, **texte en `--text-primary`** |

Le texte ne passe jamais en rouge : `--accent` sur fond sombre donne 4,05:1, sous le seuil de 4,5:1 exigé pour du texte courant. Le rouge reste sur les crochets, qui relèvent de 3:1 en tant qu'élément non textuel.

## Confirmation

Garde de la seule action destructrice de l'application. **Aucune variante :** un panneau qui se decline finit par exister en version discrete, et une confirmation discrete ne confirme rien.

Batie **sur** `Feuille`, jamais a cote : les cinq pieces du confinement du focus (`inert` sur l'arriere-plan, focus deplace a l'ouverture, rendu au declencheur a la fermeture, Echap, et le filtre qui ne fait repondre que le panneau du dessus) restent ecrites une seule fois.

| Propriete | Role |
|---|---|
| `titre` | en tete du panneau, et nom accessible de la Feuille |
| `consequence` | ce que l'action detruit, une phrase, au present et sans detour |
| `libelleAction` | enonce la consequence, jamais un accord generique |
| `ouverte`, `surAction`, `surFermeture` | |

**Le refus du OUI generique est tenu par le type, pas par la relecture.** Un litteral parmi `Oui`, `OUI`, `Non`, `OK`, `Confirmer`, `Valider`, `Continuer`, `Effacer`, `Supprimer` s'effondre en `never` a la compilation. Meme dispositif que le nommage du `Bouton`.

**La sortie non destructrice vient en premier** dans l'ordre du DOM, donc de lecture, de tabulation et d'annonce, et elle porte la variante `primaire`. C'est la seule inversion de rang que le systeme se permette : devant une action qui ne se rattrape pas, le chemin recommande est celui qui ne detruit rien. Le rouge n'entre pas dans cet arbitrage, il reste au signalement.

**Limite connue, irreductible :** sur l'ecran d'epuisement, le focus ne peut pas revenir a son declencheur, l'effacement demontant le bouton qui a ouvert le panneau. Mesure : le focus retombe sur le corps du document. L'accueil n'a pas ce probleme, son menu restant ouvert derriere.

## EtatVide

Titre en `--text-secondary`, une phrase en `--text-disabled`, marge de `--esp-4xl`, aucun dessin. Aucune variante.

---

## Ce que ce document remplace

Les valeurs qui figuraient en clair dans `design-system.md` y sont désormais citées par leur nom. Les rapports d'audit gardent les leurs : ce sont des documents datés qui rendent compte de mesures faites à un moment donné, et les réécrire falsifierait la trace.
