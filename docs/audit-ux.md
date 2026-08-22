# Diez : audit UX (skill `evaluate`)

> Portée : le parcours et le design décrits dans `docs/design-system.md` et `docs/architecture.md`.
> Non couvert : le contenu des questions (audit séparé), l'accessibilité (skill `include`), les cas limites (skill `fortify`).
> Méthode : évaluation heuristique de Nielsen, parcours cognitif, détection d'anti-patterns, analyse de réussite des tâches.

## Score de santé UX : 68 / 100

La décomposition est instructive parce qu'elle est très inégale :

| Dimension | Score | Commentaire |
|---|---|---|
| Anti-patterns | 100 / 100 | irréprochable, et structurellement garanti |
| Cohérence et minimalisme (H4, H8) | 95 / 100 | le point fort réel du projet |
| Prévention et récupération d'erreur (H5, H9) | 45 / 100 | deux trous de fiabilité non spécifiés |
| Modélisation du rituel social (H1, H2, H10) | 35 / 100 | **l'angle mort majeur** |

Traduction : le design est excellent sur tout ce qu'il a regardé, et absent sur ce qu'il n'a jamais regardé. Ce n'est pas un défaut d'exécution, c'est un défaut de périmètre.

---

## Verdict anti-patterns : irréprochable

Aucun pattern manipulatoire détecté, et ce n'est pas de la chance : la liste des non-objectifs (pas de comptes, pas de télémétrie, pas de notifications, pas de monétisation) rend structurellement impossible toute une famille de nuisances. Une app de jeu sans boucle d'engagement, sans streak, sans notification de rappel, c'est suffisamment rare pour être noté.

Seule remarque de la catégorie : la V1 n'a **aucune condition de fin**. Le plateau ayant été retiré, `PIOCHER` puis `SUIVANTE` peut se répéter indéfiniment. Ce n'est pas un dark pattern (personne n'a intérêt à ce que vous jouiez plus longtemps), mais c'est une conséquence non énoncée du périmètre : l'app est un distributeur de cartes sans arc narratif, et c'est au groupe d'inventer sa fin de partie.

---

## P0 : le rituel de passage du téléphone n'est pas modélisé

**C'est le finding central de cet audit.**

Le jeu physique repose sur une chorégraphie précise : le joueur actif lit le thème à voix haute, annonce son chiffre à voix haute, **puis passe la carte à son voisin**, qui lit la question. Ce passage n'est pas décoratif, il existe parce que les réponses sont imprimées à côté des questions : celui qui répond ne doit pas tenir la carte.

Notre parcours enchaîne THÈME, NIVEAU, QUESTION, RÉPONSE sans jamais dire **qui tient le téléphone**. Il n'y a pas d'écran de passage, pas de consigne, rien.

Trois conséquences concrètes :

1. **Le joueur actif peut rester avec le téléphone tout du long**, lire sa propre question en silence et taper `RÉVÉLER` lui-même. Le jeu devient un quiz solitaire au milieu d'un salon.
2. **L'annonce du chiffre devient privée.** Dans le jeu physique, « je me mets 7 » est une déclaration publique qui engage devant témoins. Dans notre app, c'est un tap sur un écran que personne d'autre ne voit. Le meilleur moment du jeu se transforme en interaction de menu.
3. **Rien n'apprend la chorégraphie** à quelqu'un qui n'a jamais joué.

Ce n'est pas un problème d'écran manquant, c'est un problème de modèle : nous avons conçu un lecteur de cartes, pas un jeu à plusieurs autour d'un objet unique.

→ Routage : `/journey` pour la séquence, `/articulate` pour la formulation du passage.

## P1 : l'état du tour n'est pas persisté

`EtatTour` vit en mémoire React. `diez:v1:historique`, `reglages` et `signalements` sont persistés ; **le tour en cours, non**.

Scénario de défaillance, banal sur un téléphone qui circule : l'écran se verrouille pendant que le groupe discute, quelqu'un bascule sur ses messages, iOS évince l'onglet sous pression mémoire. Au retour, l'app redémarre sur l'accueil. La carte en cours est perdue, en pleine question.

S'ajoute une **spécification manquante** qui aggrave le cas : l'architecture ne dit jamais *à quel moment* un niveau est enregistré comme consommé. Sur `choisir()` ? Alors un plantage a brûlé la question sans que personne l'ait entendue. Sur `suivante()` ? Alors un plantage la rend rejouable, et quelqu'un la reverra. Les deux comportements sont défendables, mais il faut en choisir un explicitement.

→ Routage : architecture, plus `/fortify` pour la reprise.

## P1 : aucun apprentissage, pour un jeu qui est un rituel

Un joueur qui n'a jamais vu TTMC ouvre l'app, lit `TTMC`, tape `PIOCHER`, et tombe sur un thème seul au milieu d'un écran noir. Rien ne lui dit qu'il doit annoncer un chiffre à voix haute, ni ce que ce chiffre signifie, ni qu'il doit passer le téléphone.

Le design mise entièrement sur la présence d'un joueur expérimenté à table. C'est vrai pour la première soirée. Ça l'est beaucoup moins au bout de trois, quand un ami emmène quelqu'un.

Le système Nothing n'interdit pas d'expliquer, il interdit d'encombrer. Une ligne de label tertiaire au bon endroit suffirait probablement.

→ Routage : `/fortify` (première utilisation), `/articulate` (formulation).

## P1 : le signalement ne mène nulle part

`SIGNALER` écrit dans `diez:v1:signalements`, sur le téléphone. Le corpus, lui, vit dans un dépôt Git sur un ordinateur. **Aucun pont n'existe entre les deux.**

La fonctionnalité collecte donc une donnée que personne ne lira jamais. C'est un anti-pattern classique de « feedback qui tombe dans le vide », d'autant plus dommage que l'intention est bonne : c'est précisément le mécanisme qui doit faire progresser la qualité du corpus au fil des soirées.

Deux issues honnêtes : soit un export (copier la liste en JSON dans le presse-papier, à coller dans le dépôt), soit retirer le bouton. Le garder tel quel serait le pire des trois.

→ Routage : `/fortify`.

## P2 : la prévention du mistap repose uniquement sur la taille

La transition QUESTION vers NIVEAU n'existe pas, c'est une décision assumée. La compensation prévue est « des touches très grandes ».

La taille seule ne suffit pas : dix blocs adjacents dans une grille à deux colonnes, sans espace entre eux, produisent exactement le type de cible où le pouce dérape d'une case. Le geste rate d'autant plus facilement que le téléphone vient d'être tendu à quelqu'un d'autre.

Correctif qui ne rouvre pas la décision : **ajouter de l'espacement entre les blocs**, pas seulement de la surface. Un intervalle de 8px transforme un mistap en non-événement, sans confirmation, sans étape supplémentaire, sans ralentir le jeu.

→ Routage : design, correctif local.

## P2 : l'app ne sait rien des joueurs, ni du tour de rôle

Avec le plateau est parti le seul dispositif qui indiquait à qui c'était le tour : son propre pion. L'app ne l'a remplacé par rien. Elle ne connaît ni le nombre de joueurs, ni leurs noms, ni l'ordre.

C'est défendable pour un groupe de cinq amis autour d'une table, qui gère ça de vive voix sans effort. Ça l'est nettement moins à huit, tard, après quelques verres. Je le classe P2 et non P1 parce que le coût social du flottement est faible et que l'ajouter coûterait un écran de configuration, ce que le périmètre V1 rejette légitimement.

À arbitrer consciemment, pas à ignorer.

## P2 : l'anti-répétition est liée au téléphone, pas au groupe

`Historique` s'accumule indéfiniment sur un seul appareil. Conséquence : si tu joues le mois suivant avec un **autre** groupe, l'app continuera d'éviter des cartes que ces gens-là n'ont jamais vues, et servira en priorité les fonds de tiroir.

L'écran de pioche épuisée propose bien une réinitialisation, mais uniquement quand le stock est vide, c'est-à-dire trop tard et pour la mauvaise raison.

→ Routage : architecture, plus `/journey`.

## P3 : deux libellés ambigus

`ANNONCER` ne dit pas quoi, ni à qui. Un joueur qui découvre l'app peut raisonnablement comprendre « afficher les niveaux » plutôt que « déclare ton chiffre à voix haute maintenant ». Le mot porte tout le rituel du jeu et ne l'explicite pas.

`SUIVANTE` ne dit pas s'il s'agit de la carte ou de la question suivante.

→ Routage : `/articulate`.

---

## Scores heuristiques

| | Heuristique | Score | Constat principal |
|---|---|---|---|
| H1 | Visibilité de l'état système | 3 | ni tour de rôle, ni porteur du téléphone, ni progression de session |
| H2 | Correspondance avec le monde réel | 2 | vocabulaire juste (carte, pioche, niveau) mais rituel absent |
| H3 | Contrôle et liberté | 3 | verrou assumé, compensation insuffisante |
| H4 | Cohérence et standards | 1 | **remarquable**, le système est spécifié avec rigueur |
| H5 | Prévention des erreurs | 3 | le mistap irréversible n'est prévenu que par la taille |
| H6 | Reconnaissance plutôt que rappel | 2 | le rituel doit être mémorisé, rien ne le rappelle |
| H7 | Flexibilité et efficacité | 1 | non pertinent, flux linéaire de cinq écrans |
| H8 | Esthétique et minimalisme | 0 | **exemplaire**, aucune réserve |
| H9 | Récupération d'erreur | 3 | perte d'état en cours de tour non traitée |
| H10 | Aide et documentation | 3 | aucune, pour un jeu qui est une chorégraphie |

*(0 = aucun problème, 4 = catastrophique)*

---

## Parcours cognitif : « jouer un tour complet »

| Étape | Motivation | Visibilité | Compréhension | Retour | Verdict |
|---|:---:|:---:|:---:|:---:|---|
| 1. Piocher une carte | oui | oui | oui | oui | **Réussite** |
| 2. Lire le thème à voix haute | **non** | oui | oui | oui | Hésitation |
| 3. Annoncer son chiffre | **non** | oui | **non** | oui | **Échec** |
| 4. Passer le téléphone au voisin | **non** | **non** | **non** | **non** | **Échec** |
| 5. Choisir le niveau annoncé | oui | oui | oui | oui | Réussite |
| 6. Lire la question à voix haute | **non** | oui | oui | oui | Hésitation |
| 7. Révéler la réponse | oui | oui | oui | oui | Réussite |
| 8. Trancher juste ou faux | oui | **non** | oui | **non** | Hésitation |

Les échecs se concentrent tous au même endroit, entre l'étape 3 et l'étape 4 : le moment exact où le jeu passe d'une personne à une autre. C'est cohérent avec le P0.

L'étape 4 est la seule à cumuler quatre « non ». Un joueur qui découvre l'app ne saura pas qu'il doit passer le téléphone, ne verra rien qui le lui suggère, ne comprendra pas pourquoi, et n'aura aucun retour s'il ne le fait pas. C'est la définition d'un trou de conception.

---

## Ce qui fonctionne et doit être protégé

**La hiérarchie à trois couches tient sur les cinq écrans.** Rare. La plupart des designs s'effondrent au troisième écran et finissent par tout mettre en « secondaire ». Ici chaque écran a une primaire évidente et une tertiaire discrète, sans exception.

**L'invariant typé de la phase THÈME est du très bon travail.** Faire porter une règle du jeu par le modèle de données plutôt que par une condition d'affichage, c'est le genre de décision qui évite une classe entière de bugs, pas un bug. À ne toucher sous aucun prétexte.

**Le vide de 96px avant `RÉVÉLER LA RÉPONSE`** est l'exemple parfait d'une contrainte fonctionnelle transformée en geste de design plutôt qu'en garde-fou technique. À répliquer ailleurs.

**Le refus de la couleur sur la rampe de difficulté** est la bonne décision, prise pour la bonne raison. La skill `include` la remettra en question sous l'angle du contraste, mais le principe reste juste.

**La liste des non-objectifs** fait un travail défensif réel. Elle est responsable, à elle seule, du score parfait en anti-patterns.

---

## Actions recommandées, par ordre

1. **`/journey` et `/articulate`** pour le P0 : modéliser le passage du téléphone. Un seul écran, ou même une seule ligne de label, peut suffire. C'est le correctif à plus fort effet de tout l'audit.
2. **Architecture** pour le P1 de persistance : décider où le niveau est consommé, et persister `EtatTour`.
3. **`/fortify`** pour la première utilisation, la reprise après interruption, et le sort des signalements.
4. **`/include`** pour la rampe d'opacité et les labels à 11px.
5. **Design** pour l'espacement du sélecteur de niveau, correctif local et immédiat.
6. **`/articulate`** pour `ANNONCER` et `SUIVANTE`.
