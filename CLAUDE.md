# Diez : consignes de travail

Jeu de questions coopératif à narrateur unique, usage privé, sans vocation commerciale. Lire `README.md` puis `docs/modele-de-jeu.md` avant toute intervention.

**Les deux documents de référence sont `docs/architecture.md` et `docs/design-system.md`.** Les `docs/audit-*.md` sont une trace historique, pas une source : leurs conclusions ont déjà été rapatriées dans les deux premiers.

## Écriture

**Ne jamais utiliser de cadratin** (le tiret long, U+2014) dans quoi que ce soit : réponses, documentation, commentaires, contenu de fichiers. Remplacer par deux-points, virgule, parenthèses ou point-virgule. Contrôle avant livraison : `rg -c '\x{2014}' fichier` doit renvoyer 0.

Tout est rédigé en français, y compris la documentation technique.

## Nommage

L'échafaudage technique est en **anglais** (`domain/`, `screens/`, `storage/`, `tools/`, `useReducer`, `dispatch`). Le vocabulaire du jeu est en **français** (`Carte`, `Niveau`, `Paquet`, `Theme`, `Narrateur`, `piocher()`, `reveler()`).

**Aucun accent ni cédille dans un identifiant** : `ResumeCarte`, `Reponse`, `Theme`. Les accents ne vivent que dans les chaînes affichées et les fichiers de contenu.

Termes **interdits**, ils ont déjà un équivalent français retenu : `card`, `deck`, `level`, `theme` (comme type), `draw`, `reveal`.

## Design

**Charger la skill `nothing-design` avant toute production visuelle.**

Deux documents, deux rôles, jamais les deux à la fois : **`docs/tokens-et-composants.md` dit *quoi*** (la source unique de toute valeur, les variables, les composants et leurs axes de variante), **`docs/design-system.md` dit *pourquoi***.

**Une valeur ne s'écrit littéralement que là où elle est définie, ou là où on montre sa dérivation. Partout ailleurs, par son nom.** C'est ce qui garde le dossier DRY, et c'est vérifiable.

Ne jamais proposer Tailwind : le système est un jeu de variables CSS, et le double mode clair/sombre obligerait à réencoder les tokens quatre fois.

Trois règles qu'on casse facilement sans y penser :

- la rampe de difficulté du sélecteur s'encode en **opacité**, jamais en couleur, et ne descend **jamais sous 0,45** (seuil de contraste, le mode clair étant le plus contraignant) ;
- un niveau déjà consommé change de **forme**, pas d'opacité, sinon il devient indiscernable d'un niveau facile ;
- le rouge `#D71921` est réservé au signalement et aux erreurs. Rien d'autre.

## Code

**`docs/conventions-code.md` fait foi** dès qu'il s'agit d'écrire du code. Le principe qui gouverne tout le reste : ce qu'une machine peut vérifier, une machine le vérifie.

Quatre règles qu'on enfreint sans y penser :

- **toute valeur mesurée cite sa source.** `0,45`, `8px`, `400ms`, `64px`, `96px` protègent chacun quelque chose. Un nombre nu au point d'usage sera « simplifié » un jour par quelqu'un qui ignore ce qu'il tient ;
- **un commentaire dit pourquoi, jamais quoi** ;
- **aucune couleur littérale hors de `tokens.css`**, sinon le double mode casse dans l'un des deux sans que rien ne le signale ;
- **exports nommés uniquement**, un `default` se renomme au point d'import et ruine le lexique.

Outillage : Biome seul. La règle de dépendance est protégée par le lint, pas par la relecture. La CI bloque le déploiement si les tests ou la validation du corpus échouent.

## Architecture

Règle de dépendance à sens unique : `screens` vers `design`, et rien d'autre. **`domain/` n'importe jamais depuis `screens/`, `design/` ou `storage/`.** Une seule violation et le principe P2 est mort. À vérifier en revue.

Règle d'état : **à chaque phase, l'état contient exactement ce qui peut être montré, et rien de plus.** En phase QUESTION, la réponse ne doit pas être dans l'état, parce que le narrateur lit à voix haute en fixant l'écran.

## Non-objectifs

Ne pas introduire sans demande explicite : comptes, backend, base de données, plateau, pions, score même coopératif, notion de joueur (nombre, noms, ordre), **outil de calcul de moyenne** (elle est explicitement approximative, c'est un jugement rendu à l'oreille), synchronisation multi-appareils, analytics, internationalisation.

## Contenu

Le corpus est **différé**, il fera l'objet d'un chantier distinct. Ne pas lancer de production de masse sans appliquer `docs/generation-contenu.md`.

Toute modification de `content/` doit rester conforme à `content/schema/lot.schema.json`. Le paquet `maison` a une règle éditoriale propre, rappelée dans `content/cartes/maison/README.md` : le dépôt est public.

## Dépôt

Public, sur GitHub Pages. Deux réglages à ne jamais défaire, détaillés dans `docs/architecture.md` §9 :

- **`.gitattributes` avec `* text=auto eol=lf`.** Sans lui, `core.autocrlf` (à `true` dans la configuration système de Git for Windows) reconvertit toute la copie de travail en CRLF à chaque checkout, contre le `.editorconfig`. Le retirer, ou l'avoir laissé tomber puis le remettre, produit un commit de conversion sur tous les fichiers.
- **L'auteur des commits est l'adresse de substitution GitHub**, réglée en portée locale dans `.git/config`. Le dépôt étant public, une adresse personnelle y serait gravée définitivement. Si un `git log` montre autre chose, la configuration locale a été perdue : la reposer avant de commiter.

## Vérifications avant de livrer un fichier

```bash
rg -c '\x{2014}' fichier
```
