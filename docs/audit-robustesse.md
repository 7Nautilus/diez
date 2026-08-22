# Diez : audit de robustesse (skill `fortify`)

> Portée : états non nominaux, cas limites, interruptions, première utilisation.
> Complète `docs/audit-ux.md`, qui traite le parcours nominal.

Constat d'ensemble : les deux documents se contredisent sur un point structurel. **Le design suppose des chaînes courtes, le validateur en autorise des longues.** Trois findings en découlent directement. C'est le genre d'incohérence qui ne se voit qu'en croisant deux documents écrits séparément, ce qui est exactement l'objet de cet audit.

---

## P0 : le double-tap sur `RÉVÉLER` saute la réponse

`RÉVÉLER LA RÉPONSE` est en bas de l'écran QUESTION. `SUIVANTE` est en bas de l'écran RÉPONSE. Les deux occupent la même zone du pouce, et la transition entre phases est un simple fondu de 200 ms.

Séquence de défaillance : le joueur tape deux fois, par impatience ou par tremblement. Le premier tap révèle, le second tape `SUIVANTE` sur un écran qui vient d'apparaître. La réponse a été affichée pendant environ 200 ms. **Personne ne l'a lue, et la carte est perdue.**

Ce n'est pas un cas tordu, c'est le comportement par défaut d'un doigt sur un bouton qui ne répond pas instantanément.

Deux correctifs, cumulables :
- **Verrouiller l'entrée pendant 400 ms** après chaque transition de phase. Invisible, suffisant, et cohérent avec le rythme « percussif » revendiqué.
- **Décaler `SUIVANTE`** pour qu'il n'hérite pas des coordonnées de `RÉVÉLER`. L'écran RÉPONSE a de la place.

## P0 : « niveau facile » et « niveau déjà consommé » sont visuellement identiques

L'architecture prévoit qu'une carte reste jouable tant qu'il lui reste des niveaux inédits. Une carte retirée une deuxième fois arrive donc avec des niveaux déjà brûlés.

Or le design encode **la difficulté en opacité** (le 1 presque effacé, le 10 à pleine intensité), et le système Nothing encode **l'état désactivé en opacité** lui aussi (`opacity 0.4` ou `--text-disabled`).

Résultat : un niveau 2 disponible et un niveau 9 déjà consommé se ressemblent. Le canal visuel est saturé, on ne peut pas y faire passer deux informations.

L'écran NIVEAU n'a d'ailleurs **aucun état partiel spécifié**. C'est un trou, pas un oubli de détail : c'est le cas normal dès la deuxième soirée.

Correctif conforme au système, qui recommande explicitement « opacité, puis motif » : l'opacité reste à la difficulté, et le niveau consommé change de **forme**. Le bloc perd son remplissage et ne garde que sa bordure, le chiffre étant remplacé par un point médian. On lit alors deux choses distinctes sans introduire une seule couleur.

## P0 : la mise à jour du service worker peut recharger l'app en pleine partie

Un déploiement sur GitHub Pages pendant une soirée, ou simplement la découverte tardive d'une version publiée la veille, déclenche la mise à jour du service worker. En configuration automatique, `vite-plugin-pwa` recharge la page.

Combiné au fait que l'état du tour n'est pas persisté (voir `audit-ux.md`), un rechargement en phase QUESTION fait disparaître la carte, la question et le niveau annoncé, au milieu d'une phrase.

Correctif : stratégie `prompt` explicite, jamais `autoUpdate`, et proposition de mise à jour **uniquement en phase REPOS**. Une app de soirée n'a aucune raison de se mettre à jour pendant qu'on joue.

---

## P1 : le vide de sécurité de 96px n'est pas garanti

Le validateur plafonne `r` à 60 caractères et `theme` à 40. **`q` n'a aucune limite.**

Une question de 250 caractères en `--heading` (24px) sur un écran de 320px occupe environ 11 lignes, soit 320px de haut. Additionnée au label du haut et au bouton du bas, elle ne laisse plus de place au vide de 96px, qui est pourtant présenté comme un dispositif de sécurité contre la révélation accidentelle.

Autrement dit : **le garde-fou disparaît exactement quand la question est longue**, donc quand le joueur lit lentement, donc quand le risque de tap parasite est le plus élevé.

Correctif : plafonner `q` à 140 caractères dans le validateur, et faire du vide de 96px une contrainte de mise en page qui ne peut pas être comprimée, la question devenant défilable si nécessaire.

## P1 : la réponse en `--display-lg` déborde dès 30 caractères

`--display-lg` vaut 48px. La limite du validateur est de 60 caractères. Sur un écran de 320px, 48px donne environ 13 caractères par ligne : une réponse de 60 caractères occupe cinq lignes de typographie display.

Ce n'est plus le moment « data as beauty » recherché, c'est un mur de texte. Et la carte des capitales contient exactement ce cas : `Yamoussoukro (Abidjan est la capitale économique)` fait 48 caractères.

Correctif : taille fluide par palier plutôt que taille fixe.

| Longueur de `r` | Taille |
|---|---|
| 12 caractères ou moins | `--display-lg` (48px) |
| 13 à 30 | `--display-md` (36px) |
| plus de 30 | `--heading` (24px) |

Le même raisonnement s'applique au thème sur l'écran THÈME : 40 caractères en `--display-lg` tiennent sur trois lignes à 320px, ce qui est acceptable mais ruine la composition « un mot seul dans le vide » décrite dans le document.

## P1 : les labels du bord bas passent sous la barre d'accueil iOS

Le design place `CARTE 042` et le compteur de l'accueil « au bord bas ». C'est précisément là que vit l'indicateur d'accueil iOS, et sur Android la barre de gestes.

Correctif : `env(safe-area-inset-bottom)` sur tous les ancrages bas, et `env(safe-area-inset-top)` pour les labels hauts, qui croiseront l'encoche sur certains modèles.

## P1 : l'écran se verrouille pendant les discussions

Le cas le plus fréquent de toute cette liste, et il n'est nulle part dans les documents. Entre la lecture de la question et le verdict du groupe, il s'écoule facilement une minute. Le téléphone se met en veille. Quelqu'un doit le déverrouiller, souvent une personne qui n'est pas son propriétaire.

Correctif : `navigator.wakeLock` maintenu tant qu'un tour est en cours, relâché en phase REPOS. Repli silencieux si l'API est indisponible.

## P1 : aucun paquet sélectionné

Les chips de l'accueil permettent de tout décocher. Le comportement de `PIOCHER` dans ce cas n'est spécifié nulle part.

Correctif : `PIOCHER` désactivé, avec la raison affichée en label tertiaire (`SÉLECTIONNE AU MOINS UN PAQUET`). Le système Nothing est explicite là-dessus : un bouton désactivé sans explication est une impasse.

## P1 : le compteur de l'accueil ment

`184 CARTES · 1 840 QUESTIONS` affiche le total du corpus, pas ce qui reste réellement piochable compte tenu de l'historique.

Deux conséquences : le joueur croit disposer d'un stock qu'il n'a plus, et l'écran de pioche épuisée arrive sans prévenir, en général au pire moment.

Correctif : afficher le restant (`142 CARTES RESTANTES`), et proposer la réinitialisation de l'historique depuis l'accueil, pas seulement depuis l'écran d'épuisement. La raison n'est pas cosmétique : jouer avec un **autre groupe** est le cas où la réinitialisation est pertinente, et ce cas n'a rien à voir avec un stock vide.

---

## P2

**Orientation non verrouillée.** Toute la composition de l'écran THÈME repose sur deux tiers de vide vertical. En paysage, il n'y a plus de vide vertical. Correctif : `"orientation": "portrait"` dans le manifest.

**Corpus vide au build.** Si toutes les cartes sont en `valide: false`, le compilateur produit un fichier vide et l'app se déploie sans contenu. Correctif : faire échouer le build en dessous d'un seuil, par exemple 20 cartes.

**Éviction du stockage.** Les navigateurs mobiles peuvent purger le stockage local des sites peu utilisés. À vérifier pour une PWA installée. La perte n'est pas grave ici, l'historique se reconstruit, mais elle ne doit pas provoquer d'erreur au démarrage. La lecture défensive prévue dans `storage/` couvre déjà ce cas.

---

## Première utilisation

L'expérience actuelle est : wordmark, `PIOCHER`, un thème seul dans le vide. Zéro accompagnement.

Le réflexe habituel serait un tour d'introduction en cinq écrans. Ce serait une erreur ici, doublement : personne ne les lit, et ça contredit frontalement le système de design.

Approche adaptée au contexte, par valeur d'abord et guidage juste-à-temps :

- l'accueil porte **une** ligne tertiaire décrivant le rituel, par exemple `LIS LE THÈME · ANNONCE TON CHIFFRE · PASSE LE TÉLÉPHONE` ;
- l'écran THÈME porte une ligne tertiaire lors des trois premières cartes seulement, puis elle disparaît définitivement ;
- rien d'autre. Pas de modale, pas de tour, pas de bouton « aide ».

Ça règle en deux lignes de label le P1 « aucun apprentissage » de l'audit UX, et ça traite au passage une partie du P0 sur le passage du téléphone.

---

## Inventaire des états manquants

| Écran | État | Spécifié ? |
|---|---|---|
| ACCUEIL | aucun paquet sélectionné | **non** |
| ACCUEIL | corpus vide | **non** |
| ACCUEIL | stock bientôt épuisé | **non** |
| THÈME | thème long | **non** |
| NIVEAU | **niveaux partiellement consommés** | **non** |
| QUESTION | question longue | **non** |
| QUESTION | écran en veille | **non** |
| QUESTION | retour arrière absorbé | oui |
| RÉPONSE | réponse longue | **non** |
| RÉPONSE | note d'arbitrage présente | partiellement |
| RÉPONSE | question signalée | oui |
| TOUS | reprise après interruption | **non** |
| TOUS | mise à jour disponible | **non** |
| TOUS | pioche épuisée | oui |

Quatre états spécifiés sur quatorze. C'est le ratio normal d'un design qui a été pensé sérieusement mais uniquement sur son chemin nominal.
