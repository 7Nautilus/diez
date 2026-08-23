# Diez : recette

Ce document existe parce qu'une phrase engage tout le calendrier du projet : le chantier contenu ne sera lancé **qu'une fois le reste jugé concluant**. Sans définition écrite, « concluant » finit par vouloir dire « ça se lance sans planter », ce qui ne prouve rien.

Deux recettes distinctes. La première dit si l'app est correcte. La seconde dit si le jeu fonctionne, ce qui est la seule question qui compte.

---

## 1. Recette technique, avant tout déploiement

À passer sur la planche de contrôle et sur les deux cartes de fixture.

### Où passer cette liste

Trois surfaces, servies par `npm run dev`, et la distinction n'est pas administrative : deux d'entre elles n'existent qu'en développement, et c'est ce qui rend la moitié de cette liste exécutable.

| Surface | Ce qu'on y passe |
|---|---|
| `/diez/` | l'application publiée, sur le corpus réel. Tout ce qui touche au déploiement, à la PWA et au chemin de base |
| `/diez/planche.html` | la planche de contrôle : l'inventaire du socle, les échelles, les composants |
| `/diez/recette.html` | le banc de recette : l'application réelle montée sur les cartes de fixture, plus les gestes de stockage |

Le banc se choisit un corpus dans l'URL, `?corpus=pilote` (défaut), `limites`, `minimal` ou `tout`. **`limites` et `minimal` ne montent qu'une seule carte**, ce qui n'est pas un confort : la pioche est aléatoire et une carte revient au vivier tant qu'il lui reste des niveaux, donc atteindre les dix niveaux d'une carte précise dans un corpus de douze demanderait de la retirer dix fois de suite. Sur une carte unique, les dix tours suivants la parcourent, et le onzième tombe sur l'épuisement.

Le bouton `BANC`, en haut au centre, ouvre le panneau : charger l'historique partiel, vider le vivier, décocher tous les paquets, poser un signalement, effacer le tour, tout effacer, et **lire le contenu réel des quatre clés**. Chaque geste écrit puis recharge, l'état de la soirée étant amorcé au démarrage.

Le déclencheur flotte au-dessus de l'application : **`Masquer le banc` avant toute mesure de mise en page**, il revient au rechargement.

Sur le téléphone, `npm run dev -- --host` : le banc ne part jamais sur Pages, il n'est pas une entrée de build.

### Modes et typographie

- [ ] Les cinq écrans rendus dans les deux modes, côte à côte, sans qu'aucun ne soit visiblement moins soigné.
- [ ] Bascule `AUTO / SOMBRE / CLAIR` : le choix manuel gagne dans les deux sens, y compris contre le réglage système.
- [ ] Zoom navigateur à 200 % : rien n'est rogné, rien ne déborde horizontalement.
- [ ] Taille de texte système augmentée : la typographie suit, donc l'échelle est bien en `rem`.
- [ ] `prefers-reduced-motion` activé : les transitions passent à zéro.

### Les deux cartes de fixture, niveau par niveau

`_fixture-limites-001` se parcourt du niveau 1 au niveau 10, chacun éprouvant une borne différente.

- [ ] Niveau 1, réponse d'un caractère : elle ne flotte pas seule au milieu d'un écran vide.
- [ ] Niveau 2, réponse de 60 caractères : elle tombe au bon palier de taille et reste lisible.
- [ ] Niveau 3, question de 140 caractères : **le vide de 96 px avant `RÉVÉLER` est intact.** C'est le contrôle le plus important de cette liste, c'est un dispositif de sécurité.
- [ ] Niveau 4, note de 159 caractères : elle s'affiche sous la réponse sans pousser le reste hors écran.
- [ ] Niveaux 8, 9 et 10 : les frontières de paliers à 13, 30 et 12 caractères basculent bien.

`_fixture-minimal-001` : thème de 7 caractères et réponses d'un caractère partout. La mise en page ne doit pas paraître vide ou cassée.

### États non nominaux

- [ ] Aucun paquet coché : `PIOCHER` désactivé, raison affichée.
- [ ] Historique chargé depuis `content/_dev/historique-partiel.json` : neuf niveaux en bordure seule avec point médian, seul le 10 sélectionnable, et **impossible de confondre un niveau brûlé avec un niveau facile.**
- [ ] Pioche épuisée : écran explicite, réinitialisation proposée.
- [ ] Réinitialisation accessible depuis l'accueil, pas seulement depuis l'épuisement.
- [ ] Compteur affichant les cartes restantes, pas le total.

### Robustesse

- [ ] Double tap rapide sur `RÉVÉLER` : la réponse reste affichée, on ne saute pas à la carte suivante.
- [ ] Onglet tué en phase QUESTION, puis réouverture : reprise dans la même phase, sur la même question.
- [ ] Écran laissé au repos pendant deux minutes en phase QUESTION : il ne se verrouille pas.
- [ ] Geste de retour du téléphone en phase QUESTION : absorbé, l'app ne se ferme pas.
- [ ] Rotation en paysage : impossible, l'orientation est verrouillée.

### Déploiement

- [ ] Installée depuis GitHub Pages, la PWA s'ouvre sans barre d'URL.
- [ ] Le chemin de base `/diez/` est cohérent entre `vite.config.ts`, `start_url`, `scope` du manifest et `scope` du service worker.
- [ ] Sur un téléphone à encoche : aucun label ne passe sous la barre d'accueil ni sous l'encoche.
- [ ] Une mise à jour publiée pendant une partie ne recharge pas l'app.

### Accessibilité

- [ ] Un passage complet au lecteur d'écran (VoiceOver ou TalkBack) : les changements de phase sont annoncés, les niveaux sont identifiables.
- [ ] Aucun élément du sélecteur ne descend sous 0,45 d'opacité.
- [ ] `[ SIGNALÉE ]` reste lisible en mode sombre.

---

## 2. Recette de jeu, une vraie soirée

C'est la seule qui décide du lancement du chantier contenu.

### Protocole

Cinq personnes environ, un soir, sans préparation. **Le narrateur ne doit pas être toi.** C'est le point méthodologique décisif : si tu tiens le téléphone, tu connais les règles et l'interface, et le test de l'apprentissage est nul. Donne l'appareil à quelqu'un qui n'a jamais vu le projet, sans autre explication que ce que l'app affiche elle-même.

Vingt tours suffisent.

### Ce qui invalide le modèle

Un seul de ces signaux suffit à conclure que le modèle du narrateur ne tient pas.

- Le narrateur repose le téléphone et quelqu'un d'autre le reprend : le rôle unique ne se maintient pas sur une soirée.
- Quelqu'un redemande les règles après le troisième tour : la ligne d'apprentissage ne fait pas son travail.
- Le groupe cesse d'annoncer et laisse le narrateur choisir seul : **le mécanisme central est mort**, il ne reste qu'un distributeur de questions.
- La moyenne devient un calcul arithmétique discuté à voix haute : le mot « approximative » n'est pas passé, et il faudra soit reformuler, soit rouvrir la décision de ne pas outiller la moyenne.
- Quelqu'un propose de sortir la boîte physique : l'app n'apporte rien.

### Ce qui le valide

- Des désaccords bruyants sur la moyenne. **C'est un bon signe**, pas un problème : la négociation à voix haute est là où la tension du jeu s'est déplacée.
- Le téléphone ne quitte pas les mains du narrateur de la soirée.
- Personne ne demande à quel score on en est.
- Quelqu'un demande à jouer une deuxième fois.

### Ce qui ne compte pas comme un échec

Point de méthode sans lequel le test ne veut rien dire. **Le lot pilote est défectueux et on le sait**, c'est écrit dans `audit-contenu.md` : six cartes sur dix ont une progression plate dans leur moitié basse, et il n'y a que dix cartes en tout.

Ne comptent donc pas contre le modèle :

- une question trop facile pour son niveau, ou trop dure ;
- l'impression que le chiffre annoncé ne change pas grand-chose ;
- un thème qui ne parle à personne ;
- la sensation de tourner en rond après vingt tours.

Ces quatre points sont exactement ce que le chantier contenu doit corriger. Les confondre avec un échec du modèle ferait abandonner la bonne idée à cause du mauvais matériau.

---

## 3. Verdict

Le projet est **concluant** si la recette technique passe et si aucun signal d'invalidation n'apparaît pendant la soirée. Le chantier contenu peut alors être lancé, selon `docs/generation-contenu.md`.

S'il ne l'est pas, la cause est presque certainement dans le modèle de jeu et non dans le code. C'est `docs/modele-de-jeu.md` qu'il faudra rouvrir, pas l'architecture.
