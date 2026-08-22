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

`--txt-display-xl` 4.5 · `--txt-display-lg` 3 · `--txt-display-md` 2.25 · `--txt-heading` 1.5 · `--txt-body` 1 · `--txt-body-sm` .875 · `--txt-caption` .75 · `--txt-label` .6875

**Durée.** `--duree-courte` 200ms

## Collection 2 : Sémantique, avec modes

Une variable, deux valeurs, comme un mode Figma. **Résolu par `light-dark()`**, ce qui supprime la triple répétition de la palette.

| Variable | Clair | Sombre |
|---|---|---|
| `--ground` | `--gris-050` | `--noir` |
| `--surface` | `--blanc` | `--gris-950` |
| `--surface-haute` | `--gris-050` | `--gris-900` |
| `--border` | `--gris-100` | `--gris-850` |
| `--border-visible` | `--gris-200` | `--gris-800` |
| `--text-disabled` | `--gris-400` | `--gris-500` |
| `--text-secondary` | `--gris-500` | `--gris-400` |
| `--text-primary` | `--gris-900` | `--gris-100` |
| `--text-display` | `--noir` | `--blanc` |
| `--accent` | `--rouge` | `--rouge` |

**Ces noms sont ceux de la skill et ne sont pas traduits.** Ils constituent un vocabulaire importé ; les renommer romprait la correspondance avec le document qui fait autorité. Les variables que nous inventons, en revanche, suivent le lexique du projet.

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
| `--niveau-cran-h` | 56px | hauteur d'un cran de molette |
| `--niveau-fenetre-h` | 280px | 5 crans visibles |
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

---

# Composants et variantes

Chaque composant a une base et des **axes de variante**, portés par des attributs `data-*`. Un axe, un attribut : le CSS reste une petite matrice au lieu d'une collection de classes qui se recopient.

**Distinction avec Figma :** là où Figma modélise l'état (survol, désactivé) comme un axe de variante de plus, le CSS l'exprime en pseudo-classes. La matrice est la même, le mécanisme diffère. Les tables ci-dessous ne listent donc que les variantes *choisies*, jamais les états *subis*.

## Bouton

Base : `Space Mono`, `--txt-label` majuscules, interlettrage 0.06em, hauteur minimale 48px, rayon pill.

| `data-variante` | Fond | Bordure | Texte |
|---|---|---|---|
| `primaire` | `--text-display` | aucune | `--ground` |
| `secondaire` | aucun | `--border-visible` | `--text-primary` |
| `ghost` | aucun | aucune | `--text-secondary` |

États en pseudo-classes : `:hover` éclaircit la bordure, `:focus-visible` pose un contour de 2px, `:disabled` passe l'opacité à 0.4.

## Etiquette

Le composant le plus utilisé, et celui où la duplication s'installait. Base : `Space Mono`.

| `data-fonction` | Taille | Casse | Couleur |
|---|---|---|---|
| `metadonnee` | `--txt-label` | majuscules | `--text-secondary` |
| `etat` | `--txt-caption` | majuscules | `--text-primary` |
| `instruction` | 0.8125rem | **normale** | `--text-primary` |

La casse normale de `instruction` n'est pas un oubli : les capitales suppriment la silhouette du mot, sur laquelle l'œil s'appuie pour lire vite, et une instruction est le seul label qu'on lit vraiment.

## Chip et Segment

| Composant | Axe | Valeurs |
|---|---|---|
| `Chip` | `data-actif` | `true` bordure et texte en `--text-display`, sinon `--border-visible` et `--text-secondary` |
| `Segment` | `data-actif` sur chaque option | `true` inverse le fond et le texte |

`Chip` est en sommeil tant qu'un seul paquet existe : un sélecteur à une option est un contrôle qui ne peut rien faire.

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

Voile associé : `rgba(0,0,0,.8)`.

## Statut

| `data-ton` | Usage |
|---|---|
| `neutre` | texte en `--text-primary` |
| `signal` | crochets en `--accent`, **texte en `--text-primary`** |

Le texte ne passe jamais en rouge : `--accent` sur fond sombre donne 4,05:1, sous le seuil de 4,5:1 exigé pour du texte courant. Le rouge reste sur les crochets, qui relèvent de 3:1 en tant qu'élément non textuel.

## EtatVide

Titre en `--text-secondary`, une phrase en `--text-disabled`, marge de `--esp-4xl`, aucun dessin. Aucune variante.

---

## Ce que ce document remplace

Les valeurs qui figuraient en clair dans `design-system.md` y sont désormais citées par leur nom. Les rapports d'audit gardent les leurs : ce sont des documents datés qui rendent compte de mesures faites à un moment donné, et les réécrire falsifierait la trace.
