# Diez : modèle de jeu

> **Ce projet n'implémente pas les règles de « Tu Te Mets Combien ? ».** Il implémente une variante coopérative maison, décrite ci-dessous. Le jeu original sert d'inspiration et de source du mécanisme central ; tout le reste diverge.

## Le tour

1. Un **narrateur** tient le téléphone. Il garde ce rôle toute la partie.
2. Il lance un tour. L'app tire une carte au sort.
3. Il lit le **thème** à voix haute.
4. **Chaque personne autour de la table annonce son chiffre**, de 1 à 10.
5. Le narrateur en fait une **moyenne approximative**, à l'oreille, et la saisit.
6. Il lit la **question** de ce niveau à voix haute, à tout le monde.
7. Le groupe cherche ensemble. Le narrateur révèle la réponse.

Pas de plateau, pas de pions, pas de score, pas de tour de rôle.

## Ce qui distingue cette variante de l'original

| | Jeu original | Cette variante |
|---|---|---|
| Qui annonce | le joueur actif, seul | tout le monde |
| Qui décide du niveau | le joueur actif | le narrateur, par moyenne |
| Qui répond | le joueur actif | le groupe |
| Qui lit | le voisin | le narrateur, toujours le même |
| Nature | compétition | coopération |
| Circulation de l'appareil | de main en main | aucune |

## Pourquoi ce modèle

Il a été retenu après les audits (`docs/audit-ux.md` et suivants), dont le finding principal était que le passage du téléphone entre joueurs n'était modélisé nulle part et cumulait quatre échecs sur une seule étape du parcours.

Le narrateur ne contourne pas ce problème, il le supprime : il n'y a plus de passage. Trois findings d'audit disparaissent avec lui, sans qu'aucune ligne d'interface ait été écrite pour les traiter.

Le modèle rend aussi le jeu **plus oral que la boîte du commerce**, puisque tout est prononcé pour tout le monde. Une personne aveugle participe pleinement, à ceci près qu'elle ne peut pas tenir le rôle de narrateur, exactement comme elle ne pouvait pas lire une carte physique.

## Le narrateur joue aussi

Point important pour que le rôle soit tenable : le narrateur voit la question **après** que tout le monde a annoncé son chiffre. Rien ne l'empêche donc d'annoncer le sien avec les autres, ni de chercher la réponse avec le groupe. Il n'est pas sacrifié pour la soirée, il est simplement celui qui lit.

Son seul privilège est de voir la réponse une seconde avant de la prononcer. C'est sans conséquence dans un jeu coopératif sans score.

## Ce que l'app ne fera pas

**Aucun outil de calcul de moyenne.** La moyenne est explicitement approximative : c'est un jugement rendu à l'oreille, pas une opération. Une interface de saisie des chiffres de chacun ajouterait cinq à huit interactions par tour pour remplacer un arbitrage d'une seconde. Elle transformerait une négociation de table en formulaire.

**Aucune notion de joueur.** Ni nombre, ni noms, ni ordre. Le modèle n'en a pas besoin, et les introduire ramènerait un écran de configuration que le périmètre V1 rejette.

**Aucun décompte collectif.** Le score reste hors périmètre, y compris sous forme coopérative. Si la question revient, elle se posera comme un score de groupe, ce qui est un mécanisme entièrement différent d'un score individuel et devra être conçu comme tel.

## Conséquence sur la machine à états

Les cinq phases survivent sans modification : REPOS, THEME, NIVEAU, QUESTION, REPONSE. Seule leur signification change.

| Phase | Avant | Maintenant |
|---|---|---|
| THEME | le joueur actif lit, puis passe | le narrateur lit à voix haute |
| NIVEAU | le voisin saisit le chiffre annoncé | le narrateur saisit la moyenne du groupe |
| QUESTION | le voisin lit au joueur actif | le narrateur lit à toute la table |

Qu'un changement de modèle de jeu aussi profond laisse la machine à états intacte est un bon signe sur sa conception : elle décrivait la mécanique de la carte, pas la sociologie de la table.
