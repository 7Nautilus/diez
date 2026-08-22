# Diez : cahier des charges du chantier contenu

> Chantier **différé**, à lancer une fois la recette de `docs/recette.md` passée.
> Ce document fige les critères pendant qu'ils sont frais. Ils sont issus de `docs/audit-contenu.md`, qui a examiné le lot pilote et établi que **six cartes sur dix étaient inexploitables** malgré un barème pourtant explicite.

## Ce que le lot pilote a appris

Le premier lot a été produit avec un barème par niveaux et rien d'autre. Résultat : les questions sont factuellement justes, correctement formatées, du bon registre, et le jeu ne fonctionne quand même pas, parce que **la progression de difficulté est plate dans la moitié basse de la plupart des cartes**.

Sur la carte McDonald's, annoncer 2 ou annoncer 6 revient au même. Le pari, qui est le seul mécanisme du jeu, disparaît.

Une seule carte tenait sur dix crans, celle des capitales du monde, et ce n'est pas un hasard : les capitales forment un continuum objectif de notoriété décroissante, de Rome à Yamoussoukro. Les autres thèmes n'ont pas ce continuum naturel, et il n'avait pas été construit à leur place.

**Un barème ne suffit pas. Il faut y ajouter un test de recette et un gabarit.**

---

## 1. Le barème

| Niveau | Repère |
|---|---|
| 1 à 2 | Tout le monde à table sait, même sans s'intéresser au sujet |
| 3 à 4 | Culture générale de base, ça vient sans effort |
| 5 à 6 | Il faut s'y être intéressé un minimum |
| 7 à 8 | Il faut vraiment connaître le domaine |
| 9 à 10 | Un passionné hésite ; au mieux une seule personne à table sait |

## 2. Le test de distinguabilité

**Le critère qui manquait.** Pour chaque carte produite, prendre trois niveaux consécutifs dans la moitié basse et se demander si un joueur hésiterait réellement entre les trois.

Si les trois sont interchangeables, **la carte est à réécrire, pas à retoucher.** Réordonner ne sert à rien : le problème n'est pas que des questions soient dans les mauvaises cases, c'est que tout le bas est uniformément trop facile.

## 3. Le gabarit

La carte « Les capitales du monde » du lot pilote sert d'étalon explicite, à joindre au prompt de génération. Ses trois propriétés à répliquer :

- dix crans réellement distincts, adossés à un continuum objectif ;
- une réponse d'un seul mot à chaque niveau ;
- aucune prise au débat, à aucun niveau.

**Toute carte qui ne lui ressemble pas structurellement est suspecte.** Avant de générer un thème, se demander quel continuum objectif il porte. S'il n'en porte aucun, le thème est probablement mauvais pour ce jeu, même s'il est intéressant.

## 4. Le calibrage générationnel

Le groupe a **20 ans de moyenne**, donc est né vers 2006. Son enfance, ce sont les années 2010.

La quasi-totalité du contenu de quiz français en circulation est calibrée pour des trentenaires. Sans correction, toutes les cartes seront trop dures d'un ou deux crans.

| Pour ce groupe | Niveau réel |
|---|---|
| Fortnite, PNL, Stranger Things, Squid Game, Paris 2024 | 1 à 2 |
| Le mème Grimace de 2023 | 4 |
| Jean-Jacques Goldman, Friends, la Coupe du monde 98 | 6 à 7, c'est de la culture parentale |
| IAM, NTM, les années 90 en général | 9 à 10 |

## 5. La règle de non-débat

**La réponse doit être courte, unique et indiscutable.** Jamais de « cite trois… », jamais de réponse ouverte.

Quand une question est fragile, **resserrer sa formulation plutôt que la supprimer.** L'exemple issu de l'audit :

> **Avant** : « Quelle est la plus haute montagne connue du système solaire ? »
> **Après** : « Quel est le plus grand volcan du système solaire ? »

La réponse reste Olympus Mons. Le pic de Rheasilvia, sur Vesta, rivalise en hauteur mais n'est pas un volcan : la contestation disparaît. **Un mot change une question arguable en question étanche.**

Quand la contestation est légitime et ne peut pas être supprimée par la formulation, utiliser le champ `note`. Il s'affiche sous la réponse et coupe court à l'arbitrage. Dans le lot pilote il sert dix fois, et c'est le champ le plus rentable du modèle.

## 6. Les contraintes mécaniques

Appliquées par `content/schema/lot.schema.json`, donc signalées par l'éditeur à la frappe.

| Champ | Plafond | Ce que ça protège |
|---|---|---|
| `r` | 60 caractères | rend structurellement impossible la réponse à débat |
| `q` | 140 caractères | garantit le vide de sécurité de 96 px avant `RÉVÉLER` |
| `theme` | 40 caractères | tient à l'écran en taille display |
| `note` | 160 caractères | reste lisible sous la réponse |

Un thème dépassant 32 caractères tombe au dernier palier typographique. C'est un **avertissement, pas une cible** : le raccourcir vaut mieux que plier la mise en page.

## 7. Volume et répartition

Cible pour une première vraie soirée : **environ 180 cartes.** Compter une centaine de tirages à cinq joueurs, sachant qu'une carte reste réutilisable trois à quatre fois puisqu'une seule de ses dix questions est consommée à chaque passage.

| Domaine | Cartes |
|---|---:|
| `histoire-geo` | 25 |
| `sciences` | 25 |
| `cinema-series` | 25 |
| `musique` | 20 |
| `sport` | 15 |
| `jeux-video-internet` | 15 |
| `langue-litterature` | 15 |
| `vie-quotidienne` | 12 |
| `arts-mythologie` | 12 |
| `marques-business` | 10 |
| `insolite` | 10 |

**Les thèmes doivent être étroits.** « Le cinéma » est un mauvais thème, personne ne peut s'y mettre 8 honnêtement. « Les films de Tarantino » est un bon thème, parce que l'annonce du chiffre redevient un engagement.

Ne pas négliger les thèmes banals. McDonald's fait jouer une table mieux que bien des sujets prestigieux.

## 8. Le circuit de production

1. Générer par lots de quinze, jamais plus, avec `valide: false` sur toutes les cartes.
2. Appliquer le test de distinguabilité (§2). Les cartes qui échouent sont **réécrites, pas corrigées**.
3. Relire pour l'exactitude et le débat (§5).
4. Basculer `valide: true` carte par carte.

**Taux de rejet attendu : 20 à 30 %.** C'est normal et budgété. Un lot qui passe à 100 % signifie que la relecture n'a pas été faite.

Le compilateur exclut tout ce qui reste à `valide: false`, donc aucune carte non relue ne peut atteindre une soirée.

## 9. Les cartes maison

Dix à vingt cartes écrites à la main sur le groupe. Ce sera systématiquement le contenu préféré, et c'est le seul endroit où la saisie manuelle vaut l'effort.

Elles obéissent à une règle éditoriale propre, rappelée dans `content/cartes/maison/README.md` : **le dépôt est public.**
