# Diez : roadmap

> Construite **à rebours** depuis `docs/recette.md`, qui définit ce qu'est une V1 réussie. Chaque phase se termine par un critère vérifiable, tiré de cette recette.
> Aucun code écrit à ce stade.

## Situation

La conception est terminée, auditée sur quatre axes et consolidée dans deux documents de référence. Le dépôt est public, le corpus de développement existe, le modèle de données est opposable par un schéma. Rien ne bloque techniquement le démarrage du code.

## Complication

**Le modèle de jeu n'a jamais été joué.** Le narrateur unique, l'annonce collective des chiffres, la moyenne approximative : tout cela a été conçu dans une conversation, corrigé par des audits, documenté avec soin, et **jamais éprouvé par cinq personnes autour d'une table**.

C'est l'anti-pattern stratégique le plus classique et le projet est en plein dedans : des artefacts de conception qui précèdent la validation du problème. Les audits l'ont d'ailleurs frôlé sans le nommer, puisqu'ils ont validé la cohérence interne de la conception, pas sa désirabilité.

Le déséquilibre est frappant. L'hypothèse la moins vérifiée du projet est celle sur laquelle tout repose, et c'est aussi la moins chère à tester.

## Résolution

**Une phase 0 sans une ligne de code.**

`docs/recette.md` §2 décrit la recette de jeu : cinq personnes, un narrateur qui n'est pas Victor, vingt tours, cinq signaux d'invalidation. Relisez-la en cherchant ce qu'elle exige de l'application.

Elle n'exige rien. Un narrateur, des cartes, et de quoi montrer un thème puis une question sans divulguer la réponse. **Une feuille de papier suffit**, ou l'application Notes du téléphone avec les dix cartes pilotes.

La recette d'acceptation de la V1 est exécutable **avant** la V1. C'est le point de levier de toute cette roadmap.

---

## Les phases

### Phase 0 : le test papier

**Coût :** une soirée, zéro ligne de code.
**Objet :** valider le modèle du narrateur avant d'investir dans son implémentation.

Imprimer ou recopier les dix cartes pilotes. Donner la liste à quelqu'un qui n'est pas Victor. Jouer vingt tours en appliquant `docs/modele-de-jeu.md`.

**Critère de sortie :** aucun des cinq signaux d'invalidation de `recette.md` §2 n'apparaît.

**Si la phase échoue**, on a économisé tout le reste et on rouvre `modele-de-jeu.md`, ce que la recette annonce déjà comme le point de reprise probable. **Si elle réussit**, chaque phase suivante devient un investissement sur une hypothèse vérifiée plutôt qu'un pari.

Le seul biais à surveiller : le papier laisse voir la carte entière, donc les dix questions. Le narrateur doit s'astreindre à ne lire que le thème d'abord. Ce n'est pas un défaut du test, c'est ce que l'app automatisera ensuite.

### Phase 1 : le tuyau de déploiement, à vide

**Objet :** faire échouer tôt ce qui casse habituellement tard.

Vite, TypeScript strict, `vite-plugin-pwa`, un workflow GitHub Actions, et une page qui affiche `DIEZ`. Rien d'autre.

Cette phase est en deuxième position et non en dernière, contre l'ordre habituel, pour une raison précise : `architecture.md` §9 documente déjà le piège du chemin de base, où `vite.config.ts`, `start_url`, le `scope` du manifest et celui du service worker doivent s'accorder sous peine d'écran blanc ou de service worker fantôme. Découvrir ça sur une application complète, c'est déboguer une chaîne entière. Le découvrir sur une page vide, c'est déboguer une ligne.

**Critère de sortie :** l'application s'installe sur le téléphone depuis l'URL publique, s'ouvre sans barre d'URL, et une modification poussée sur `main` se retrouve en ligne sans intervention.

### Phase 2 : le domaine

**Objet :** la logique du jeu, seule, prouvée.

`domain/` en TypeScript pur : machine à états du tour, pioche, anti-répétition, verrouillage d'entrée. Zéro import de React. Vitest.

Le contenu est déjà entièrement spécifié dans `architecture.md` §4 à §6, transitions comprises. C'est la phase la moins incertaine du projet, et elle ne dépend de rien.

**Critère de sortie :** les tests couvrent les transitions autorisées, l'absence de QUESTION vers NIVEAU, le rejet des actions arrivant sous 400 ms, la consommation du niveau sur `choisir(n)`, et l'épuisement de la pioche.

### Phase 3 : le socle de design

**Objet :** les tokens et les primitives, avant tout écran.

`tokens.css` avec le triptyque des trois blocs, les polices auto-hébergées, les primitives `Bouton`, `Etiquette`, `Chip`, `SelecteurMode`, et la planche de contrôle des deux modes.

Cette phase précède les écrans, ce qui n'est pas l'ordre spontané. La raison est que la décision « les deux modes à égalité » se paie ici ou nulle part : cinq écrans construits avec des styles ad hoc puis rétrofités au système Nothing, c'est cinq écrans à réécrire.

**Critère de sortie :** la planche de contrôle affiche l'inventaire complet des primitives dans les deux modes, et la bascule manuelle gagne dans les deux sens.

### Phase 4 : les cinq écrans

**Objet :** le jeu jouable, de bout en bout.

ACCUEIL, THÈME, NIVEAU, QUESTION, RÉPONSE, branchés sur le domaine de la phase 2 et le socle de la phase 3, avec la navigation par History API.

**Critère de sortie :** une soirée entière se joue sur l'application, avec les dix cartes pilotes.

### Phase 5 : la robustesse

**Objet :** tout ce qui n'est pas le chemin heureux.

Les comportements d'exécution de `architecture.md` §10 (wake lock, orientation, stratégie de mise à jour, reprise après interruption) et les états non nominaux relevés par l'audit de robustesse (aucun paquet coché, pioche épuisée, niveaux consommés, tailles par palier).

Les deux cartes de fixture et le jeu de stockage existent précisément pour éprouver cette phase.

**Critère de sortie :** la recette technique de `recette.md` §1 passe intégralement.

### Phase 6 : la recette

Rejouer `recette.md` en entier, technique et jeu. C'est le moment où « concluant » est prononcé, ou non.

**Critère de sortie :** le chantier contenu peut être lancé selon `docs/generation-contenu.md`.

---

## Ce que cette roadmap n'inclut pas

Le **chantier contenu** reste après la phase 6, par décision explicite. Les ~180 cartes ne se produisent qu'une fois le modèle éprouvé, sous peine de produire du contenu pour un jeu qui change encore.

Les **icônes et le manifest PWA** relèvent de la phase 1 pour le strict minimum installable, et d'une passe de finition ensuite. Ils ne méritent pas une phase.

---

## Hypothèses et questions ouvertes

**L'hypothèse centrale**, celle que la phase 0 teste : le modèle du narrateur produit une soirée que le groupe a envie de recommencer. Tout le reste en dépend.

**Question tranchée :** le groupe ne possède pas la boîte du commerce. Trois conséquences.

D'abord, **Diez n'a pas de concurrent direct** sur cette table. Ses concurrents réels sont les autres jeux de soirée du groupe et l'option de ne rien jouer. La barre à franchir est donc « meilleur qu'une conversation qui s'essouffle », pas « meilleur qu'un jeu édité ».

Ensuite, **personne dans le groupe n'a de souvenir du jeu original**. Le test papier de la phase 0 s'en trouve nettement plus fiable : les joueurs jugeront le modèle du narrateur pour ce qu'il est, sans le comparer à une expérience de référence. C'est un avantage méthodologique rare pour un test à cinq personnes.

Enfin, ça **relativise la dette de calibrage** du lot pilote. Une carte plate est un défaut réel, mais elle n'est comparée à rien. La priorité reste au modèle, pas au contenu, ce que la roadmap acte déjà.

Cette question n'avait jamais été posée pendant toute la conception, et c'est le genre d'oubli qu'un cadrage stratégique existe pour rattraper.

**Risque assumé :** la phase 0 est la moins amusante et la plus facile à sauter. Elle exige d'organiser une soirée pour tester une hypothèse, quand construire est immédiatement gratifiant. C'est précisément pour ça qu'elle est écrite en tête de cette roadmap plutôt que suggérée en passant.
