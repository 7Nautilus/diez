# Diez : audit du lot pilote

> Portée : les 100 questions du lot pilote, examinées sur trois axes : exactitude factuelle, risque de débat, et calibrage réel de la difficulté.
> Aucune skill ne couvre cet axe. C'est un audit de mon propre travail, mené avec la même exigence que les trois autres.

---

## Le finding principal : la rampe est plate sur la moitié des cartes

J'avais annoncé, en produisant ce lot, que le piège classique de la génération assistée était une difficulté uniforme déguisée en progression. Le piège n'a pas été évité.

Sur quatre cartes, les six premiers niveaux sont interchangeables. Un joueur ne peut pas honnêtement hésiter entre annoncer 3 et annoncer 6, parce que les deux questions sont également faciles.

| Carte | Où commence la vraie montée | Niveaux réellement distincts |
|---|---|---|
| Les capitales du monde | niveau 2 | **10 sur 10** |
| Le corps humain | niveau 5 | 7 |
| L'univers Harry Potter | niveau 5 | 7 |
| Le rap français | niveau 5 | 7 |
| Les expressions françaises | niveau 5 | 7 |
| La Seconde Guerre mondiale | niveau 6 | 6 |
| Les Jeux olympiques | niveau 5 | 6 |
| La mythologie grecque | niveau 7 | 5 |
| Le système solaire | niveau 6 | 5 |
| McDonald's | niveau 7 | 4 |

Traduit en termes de jeu : **sur la carte McDonald's, annoncer 2 ou annoncer 6 revient exactement au même.** Le pari, qui est le seul mécanisme du jeu, disparaît.

La conséquence est encore plus nette si vous ajoutez un score un jour : sur une carte plate, tout le monde annonce le plus haut niveau encore facile et empoche gratuitement. La carte devient une machine à points, pas un pari.

Une seule carte tient réellement sur dix crans, celle des capitales. Ce n'est pas un hasard : les capitales forment un continuum objectif de notoriété décroissante, de Rome à Yamoussoukro. Les autres thèmes n'ont pas ce continuum naturel, et je ne l'ai pas construit à leur place.

**Critère de recette à ajouter à la relecture**, plus dur que celui que j'avais proposé : pour chaque carte, prendre trois niveaux consécutifs au hasard dans le bas de la carte, et se demander si un joueur hésiterait réellement entre les trois. Si les trois sont interchangeables, la carte est à réécrire, pas à retoucher.

---

## Une question à débat, et la leçon qu'elle contient

**Carte 5, niveau 10.** « Quelle est la plus haute montagne connue du système solaire ? », réponse Olympus Mons.

C'est faux, ou plutôt c'est contesté. Le pic central de Rheasilvia, sur l'astéroïde Vesta, est mesuré entre 20 et 25 km selon les méthodes, contre environ 22 km pour Olympus Mons. Selon la source, l'un ou l'autre l'emporte. Il suffit d'un curieux à table pour transformer un niveau 10 en dispute de dix minutes, ce qui est précisément le seul défaut qualifié de grave dans les documents de conception.

Le correctif est instructif parce qu'il ne coûte rien :

> **Avant** : « Quelle est la plus haute montagne connue du système solaire ? »
> **Après** : « Quel est le plus grand volcan du système solaire ? »

La réponse reste Olympus Mons. Rheasilvia n'est pas un volcan mais un relief d'impact, la contestation disparaît. **Un mot change une question arguable en question étanche.** C'est le geste à répliquer sur tout le corpus : ne pas supprimer les questions fragiles, mais resserrer leur formulation jusqu'à ce qu'une seule réponse soit défendable.

---

## Deux questions exactes mais contestables

Elles ne sont pas fausses, elles offrent une prise. Le champ `note` du modèle de données existe exactement pour ça : il s'affiche sous la réponse et coupe court à l'arbitrage.

**Carte 1, niveau 8.** Capitale du Kazakhstan, réponse Astana. Exacte aujourd'hui, mais la ville s'est appelée Noursoultan de 2019 à 2022. Quelqu'un qui a appris la géographie pendant cette fenêtre répondra Noursoultan et n'aura pas tort dans son référentiel.
→ `note` : « Rebaptisée Noursoultan de 2019 à 2022, puis redevenue Astana. »

**Carte 4, niveau 6.** Devise olympique, réponse « Plus vite, plus haut, plus fort ». Depuis 2021 la devise officielle est « Plus vite, plus haut, plus fort, ensemble ».
→ `note` : « Depuis 2021, la devise officielle ajoute "ensemble". Les deux réponses valent. »

---

## Trois erreurs de calibrage pour ce public précis

Le lot a été écrit pour un groupe de 20 ans en moyenne, donc né vers 2006. Trois questions sont mal placées pour eux spécifiquement.

**Carte 10, niveau 7, Grimace.** Le personnage violet a été un phénomène TikTok massif en 2023, quand vos joueurs avaient 17 ans. Pour eux ce n'est pas une connaissance de niche, c'est un souvenir récent. **Niveau 4 réel.**

**Carte 4, niveau 3, Paris 2024.** Ils avaient 18 ans, en France, pendant les Jeux. C'est un niveau 1.

**Carte 2, niveau 4, l'iris.** Vocabulaire de collège, connu de tout le monde. Niveau 2.

Ces trois erreurs vont toutes dans le même sens, celui d'une surestimation de la difficulté dans le bas de l'échelle. C'est cohérent avec le finding principal : le bas des cartes est trop plat **et** trop haut.

---

## Ce qui est solide

**Exactitude factuelle : aucune erreur en dehors du cas Olympus Mons.** Les faits vérifiables des dix cartes sont exacts, y compris les plus fragiles : le coffre 687 de Gringotts, la composition des Moires, l'étymologie arabe de « seum », la date de signature de la capitulation japonaise (le 2 septembre, distincte de l'annonce du 15 août, et la question est formulée de façon à ne pas confondre les deux), et l'ensemble de la carte rap.

**Compatibilité avec les règles du validateur.** J'ai contrôlé le lot contre les contraintes proposées, y compris les deux nouvelles issues de l'audit de robustesse :

| Contrainte | Pire cas du lot | Verdict |
|---|---|---|
| `r` de 60 caractères max | 49 (Yamoussoukro et sa parenthèse) | conforme |
| `q` de 140 caractères max | 71 | conforme, avec une marge confortable |
| `theme` de 40 caractères max | 26 (« La Seconde Guerre mondiale ») | conforme |

Bonne nouvelle collatérale : le thème le plus long du lot fait 26 caractères, pas 40. La crainte d'un débordement typographique sur l'écran THÈME est donc surestimée pour du contenu réel. Le correctif de taille fluide reste utile comme garde-fou, il n'est pas urgent.

**La carte des capitales est le modèle.** Elle doit servir d'étalon explicite dans le prompt de génération : dix crans réellement distincts, une réponse d'un seul mot à chaque niveau, aucune prise au débat. Toute carte qui ne lui ressemble pas structurellement est suspecte.

---

## Verdict

Le lot est **utilisable pour tester le principe**, et **insuffisant comme référence de génération**.

Il valide ce qu'il devait valider : le format, la longueur des réponses, le ton, le registre. Il échoue sur ce qui compte le plus, la gradation, sur six cartes sur dix.

Conséquence pour la suite : ne pas lancer la production des 170 cartes restantes sur ce prompt. Le barème par niveaux ne suffit pas, il faut y ajouter le critère de distinguabilité et l'exemple de la carte des capitales comme gabarit. Sans ça, on produira 170 cartes plates avec beaucoup d'efficacité.
