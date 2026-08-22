# Diez : conventions de code

> Les règles du code proprement dit. Ce qui relève du vocabulaire, du design ou du périmètre est ailleurs et n'est pas répété ici : voir `CLAUDE.md` pour les conventions de travail, `architecture.md` §2 pour le lexique, `design-system.md` pour le visuel.
> Aucune ligne de code applicatif n'existe encore. Ces règles sont écrites avant, délibérément.

## Le principe qui gouverne les autres

**Ce qu'une machine peut vérifier, une machine le vérifie.** Une règle qui ne repose que sur la relecture est une règle qui tiendra trois semaines. Chaque règle ci-dessous indique donc qui la fait respecter : l'outil, un test, ou un humain faute de mieux.

---

## 1. Outillage

**Biome**, seul. Il formate et analyse, avec une configuration unique.

Une dépendance au lieu de huit, et l'exécution est assez rapide pour tourner à chaque sauvegarde sans qu'on la remarque. Il sait interdire ce que nous voulons interdire, ce qui est le seul critère qui compte ici.

Réglages qui comptent, le reste étant laissé aux valeurs par défaut de Biome pour qu'on n'en discute jamais :

| Règle | Niveau | Raison |
|---|---|---|
| `noExplicitAny` | erreur | `any` désactive précisément ce pour quoi on a pris TypeScript |
| `noNonNullAssertion` | erreur | `!` affirme sans preuve ; c'est le contraire de `noUncheckedIndexedAccess` |
| `noUnusedVariables` | erreur | |
| Imports restreints depuis `domain/` | erreur | voir §3 |
| Indentation, fins de ligne | 2 espaces, LF | accordés avec `.editorconfig` |

## 2. TypeScript

`strict: true` et **`noUncheckedIndexedAccess: true`**.

Le second n'est pas de la coquetterie sur ce projet : le domaine manipule en permanence `questions[niveau - 1]`, un accès indexé dont TypeScript affirme par défaut qu'il rend une `Question`. Il rend en réalité `Question | undefined`, et c'est exactement la classe de bug qu'on veut voir à la compilation plutôt qu'un soir de soirée.

Pas de `@ts-ignore`. Si le typage gêne, c'est le modèle qui est faux.

## 3. La règle de dépendance, rendue mécanique

`domain/` n'importe rien en dehors de `domain/`. C'est le principe P2 et **il meurt à la première violation, en silence.**

Elle est protégée par une **règle de lint** : l'outil refuse l'import au moment où il est écrit, dans l'éditeur, qui est le seul moment où la correction coûte zéro.

Corollaire déjà établi dans `spec-fondations.md` : ce dont le domaine a besoin lui est **injecté**, jamais importé. Le corpus, l'horloge, l'aléatoire. Trois paramètres, et toute la logique devient testable sans DOM, sans attente réelle et sans hasard.

## 4. Fichiers et exports

**Exports nommés uniquement, jamais de `default`.** Un export par défaut se renomme librement au point d'import, ce qui ruine en une ligne la discipline de nommage qu'on a mise en place. Un `Paquet` doit s'appeler `Paquet` partout.

Pas de fichiers baril (`index.ts` qui réexporte). Ils masquent les dépendances réelles, et c'est justement ce qu'on veut voir.

| Type de fichier | Nommage |
|---|---|
| Module de domaine, d'outil, de stockage | nom métier en minuscules : `paquet.ts`, `tour.ts` |
| Composant | nom du composant : `SelecteurNiveau.tsx` |
| Test | le module testé, suffixé : `tour.test.ts` |

## 5. Les commentaires expliquent un pourquoi

**Un commentaire dit pourquoi, jamais quoi.** Le code dit déjà ce qu'il fait ; s'il ne le dit pas, c'est le code qu'il faut reprendre, pas un commentaire qu'il faut ajouter.

Un commentaire se justifie quand une décision n'est pas déductible du code : un contournement, une contrainte externe, un ordre qui a l'air arbitraire et ne l'est pas.

```ts
// L'action primaire passe AVANT le ghost, contre l'ordre habituel.
// Mesuré : en dernière position, les deux boutons de deux écrans
// successifs tombaient à 1 px l'un de l'autre.
```

En français, comme tout le reste.

## 6. Toute valeur mesurée cite sa source

**La règle propre à ce projet, et celle qui se perdra le plus vite si elle n'est pas écrite.**

Une bonne partie des nombres de Diez ne sont pas des préférences : ils sont le résultat d'un calcul ou d'une mesure, et ils protègent quelque chose.

| Valeur | Ce qu'elle protège |
|---|---|
| `0,45` | seuil de contraste de la rampe, mode clair contraignant |
| `8px` | espacement des cibles, WCAG 2.2 |
| `400ms` | verrou d'entrée contre le double tap |
| `64px`, `96px` | zone tactile, et vide de sécurité avant révélation |
| `140`, `60`, `40` | plafonds de longueur qui protègent des gestes de mise en page |

Un nombre nu au point d'usage se fera « simplifier » un jour par quelqu'un qui ne sait pas ce qu'il tient. Chacun est donc soit un **token CSS**, soit une **constante nommée portant un commentaire qui renvoie à la section de documentation** qui le justifie.

```ts
// Verrou d'entrée : voir architecture.md §10. Empêche qu'un double tap
// révèle la réponse puis enchaîne sur la carte suivante.
const VERROU_MS = 400
```

## 7. Erreurs : état de jeu contre erreur de câblage

**Un état de jeu normal rend une valeur. Une erreur de programmation lève.**

`piocher()` rend `null` quand le vivier est vide : c'est un état prévu, avec son écran dédié. Le réducteur **lève** si l'énoncé transmis ne correspond pas au niveau demandé : personne ne peut provoquer ça en jouant, donc c'est un défaut de câblage et il doit être bruyant.

Pas de `catch` silencieux. La seule exception est la lecture du stockage, où une valeur corrompue retombe sur un défaut plutôt que de faire planter le démarrage sur le téléphone d'un ami.

## 8. CSS

**Aucune couleur littérale en dehors de `tokens.css`.** Le double mode ne tient que si toute couleur passe par un token ; un `#fff` écrit en dur est une régression invisible dans l'un des deux modes.

Vérification mécanique, dans le même esprit que le contrôle des cadratins :

```bash
rg -n '#[0-9a-fA-F]{3,8}\b' src --glob '!tokens.css'
```

Doit ne rien renvoyer.

Modules CSS, pas de styles en ligne sauf pour une valeur calculée à l'exécution, comme l'opacité d'un cran de la rampe.

## 9. Tests

**Vitest, sur `domain/` et `tools/` uniquement.** C'est là qu'est la logique. Tester les écrans coûterait plus qu'il ne rapporte pour un usage privé, et le prototype a montré que les défauts d'interface se trouvent en mesurant le rendu, pas en simulant des clics.

**Un nom de test énonce l'invariant protégé, pas la fonction appelée.**

```
il n'existe pas de retour de QUESTION vers NIVEAU
en phase QUESTION, l'état ne contient aucune réponse
le niveau est consommé sur choisir, jamais sur suivante
```

Six mois plus tard, c'est le nom du test qui explique pourquoi la ligne existe.

## 10. Intégration continue

Le workflow **bloque le déploiement** si les tests ou la validation du corpus échouent. L'application en ligne est toujours celle qui passe ses propres contrôles.

Le coût est assumé : un soir où tu veux corriger vite, un test cassé t'empêchera de publier. C'est le comportement souhaité, sinon la barrière ne sert à rien le seul jour où elle compte.

Ordre : validation du corpus, puis lint, puis tests, puis build, puis publication. Le contrôle le plus rapide en premier.

## 11. Commits

En français. Le message explique **le pourquoi quand il y en a un qui n'est pas évident**, et tient sur une ligne quand il n'y en a pas.

Ce dépôt s'est constitué en consignant les raisons dans ses commits, et c'est ce qui permet aujourd'hui de savoir pourquoi une valeur vaut 0,45 plutôt que 0,35. Ça reste la règle pour tout ce qui arbitre ; pas pour une correction de faute de frappe.

## 12. Interdits

- `any`, `!`, `@ts-ignore`
- `console.log` dans du code commité
- une couleur littérale hors de `tokens.css`
- un export par défaut
- un import dans `domain/` qui sort de `domain/`
- Tailwind, sous quelque forme que ce soit
- un cadratin, y compris dans un commentaire
