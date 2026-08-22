# Diez : audit d'accessibilité (skill `include`)

> Portée : les choix visuels et d'interaction de `docs/design-system.md`, évalués contre WCAG 2.2 AA et les principes de conception inclusive.
> Ratios calculés avec la formule de luminance relative WCAG, dans les deux modes.

---

## P0 : la rampe d'opacité descend sous le seuil de contraste

> **Correction du 2026-08-22, postérieure à cet audit.** Le calcul ci-dessous modélise la rampe comme du *texte sur un fond*. Le sélecteur affiche en réalité des *blocs remplis contenant un chiffre inversé*, et le prototype a montré qu'atténuer l'élément entier fait chuter le contraste du chiffre contre son bloc à 1,83:1. Le seuil de 0,45 reste juste ; il doit s'appliquer au **remplissage seul**. Voir `design-system.md` §4. Le raisonnement ci-dessous est conservé tel qu'il a été mené.

Le design décrit le bloc « 1 » comme « presque effacé ». C'est la rupture de motif de l'écran NIVEAU, et c'est sa plus belle idée. Elle n'est pas viable telle quelle.

Les chiffres sont en `--display-md` (36px), donc en « grand texte » au sens WCAG : le seuil applicable est de **3:1**. Le bloc étant aussi une cible tactile, sa bordure relève de WCAG 1.4.11 et tombe sous le même seuil.

Opacité minimale du blanc sur noir pour atteindre 3:1 : **0,35**.
Opacité minimale du noir sur `#F5F5F5` pour atteindre 3:1 : **0,42**.

C'est le mode clair qui contraint, et c'est contre-intuitif : on imagine spontanément que le fond blanc est plus permissif. C'est l'inverse, parce que `#F5F5F5` n'est pas blanc pur et que la courbe de luminance n'est pas linéaire.

**Correctif : la rampe part de 0,45 et non de « presque zéro ».**

| Niveau | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Opacité | 0,45 | 0,51 | 0,57 | 0,63 | 0,69 | 0,76 | 0,82 | 0,88 | 0,94 | 1,00 |

Le coût est réel et je ne vais pas le minimiser : la rampe passe de 45 % à 100 % au lieu de 10 % à 100 %. Elle reste parfaitement lisible comme progression, elle est moins spectaculaire. C'est le prix d'un écran où le niveau 1 reste choisissable par quelqu'un qui voit mal, dans un salon sombre, avec un téléphone tendu à bout de bras.

Bonne nouvelle en revanche : **le refus de la couleur sur cette rampe était déjà la décision accessible.** Le dégradé vert vers rouge qu'on a écarté pour des raisons de goût aurait été illisible pour les 8 % d'hommes atteints de déficience de la vision des couleurs. La décision était juste, elle l'était pour deux raisons au lieu d'une.

---

## P0 : un jeu oral transformé en interface visuelle

C'est le finding le plus important de tout l'audit, et il rejoint exactement le P0 de `audit-ux.md` par un autre chemin.

TTMC est **intégralement oral**. Le thème est lu à voix haute. Le chiffre est annoncé à voix haute. La question est lue à voix haute par quelqu'un d'autre. La réponse est lue à voix haute. Le jeu de plateau, tel quel, est jouable par une personne aveugle sans la moindre adaptation, parce que la règle impose déjà que ce soit un autre joueur qui tienne la carte.

**Notre app détruit cette propriété.** Elle affiche le thème, affiche la question, affiche la réponse, et ne demande à personne de rien prononcer. Un joueur non voyant qui pouvait participer à la boîte du commerce ne peut plus participer à notre version.

C'est un cas rare et instructif : la version numérique est **moins accessible que l'objet physique qu'elle remplace**, non par négligence technique mais par erreur de modèle.

Le correctif est déjà écrit ailleurs : c'est le P0 de l'audit UX, modéliser le passage du téléphone et la lecture à voix haute. **Le correctif d'accessibilité et le correctif d'expérience sont le même correctif.** Une seule décision de conception répare les deux, ce qui devrait décider de sa priorité.

---

## P1 : `[ SIGNALÉE ]` échoue en mode sombre

| Combinaison | Ratio | Seuil requis | Verdict |
|---|---|---|---|
| `#D71921` sur `#000000` | **4,05:1** | 4,5:1 (texte normal) | **échec** |
| `#D71921` sur `#F5F5F5` | 4,76:1 | 4,5:1 | conforme |

Le statut `[ SIGNALÉE ]` est en `--caption` (12px), donc en texte normal. Le rouge accent échoue en mode sombre et passe en mode clair, à 0,26 point du seuil.

C'est exactement le type d'écart que la décision « les deux modes à égalité » était censée attraper, et qu'un contrôle à l'œil n'attrape jamais.

Correctif, sans toucher au rouge : afficher le statut en `--text-primary` et ne réserver le rouge qu'au **crochet** ou à un point de signal adjacent, qui relève alors de 3:1 en tant qu'élément non textuel. Le rouge conserve son rôle de signal, le texte reste lisible.

À noter au passage : les ratios annoncés dans la table de tokens de la skill sont légèrement optimistes. `--text-disabled` (`#666666`) sur noir donne **3,66:1** et non 4,0:1. Ça reste au-dessus de 3:1, donc utilisable pour du grand texte et des bordures, mais en dessous de 4,5:1, donc jamais pour du texte courant. C'est précisément le token que la rampe utilisait comme point bas.

## P1 : les labels d'instruction à 11px en capitales

Le label `--label` est défini à 11px, Space Mono, tout en capitales, interlettrage 0,08em. Pour de la métadonnée pure (`CARTE 042`), c'est un choix défendable et parfaitement dans l'esprit du système.

Le problème vient de ce qu'on a décidé d'y mettre. La ligne d'apprentissage proposée dans l'audit de robustesse, `LIS LE THÈME · ANNONCE TON CHIFFRE · PASSE LE TÉLÉPHONE`, est une **instruction**, adressée à la personne qui en a le plus besoin, dans la police la moins lisible du système, à la plus petite taille, en capitales, dans la couleur la moins contrastée.

Les capitales suppriment la silhouette du mot, qui est ce sur quoi l'œil s'appuie pour lire vite. À 11px en monospace, l'effet se cumule.

Correctif par fonction plutôt que par uniformité :

| Type de label | Traitement |
|---|---|
| Métadonnée (`CARTE 042`, `NIVEAU 07`) | 11px, capitales, `--text-secondary` : inchangé |
| État (`VERROUILLÉ`, `[ SIGNALÉE ]`) | 12px, capitales, `--text-primary` |
| Instruction | 13px minimum, **pas de capitales**, `--text-primary` |

Le système reste intact, il gagne juste une règle de granularité.

## P1 : l'échelle typographique en pixels ignore les réglages de l'utilisateur

Le document exprime toutes les tailles en px. Un utilisateur qui a augmenté la taille de texte de son téléphone n'obtiendra aucun changement, alors que c'est le premier réglage que règle toute personne qui voit mal.

La correspondance de plateforme de la skill est d'ailleurs explicite sur ce point : `rem` pour la typographie, `px` pour les espacements et les bordures.

Correctif : échelle typographique en `rem`, et taille fluide sur les deux écrans à typographie display, ce qui traite du même coup les débordements relevés dans l'audit de robustesse.

## P1 : `prefers-reduced-motion` n'est nulle part

Le fondu de 200 ms entre les phases est modeste, mais la préférence système existe et n'est pas respectée. Pour un utilisateur sujet au mal des transports ou aux migraines vestibulaires, l'enchaînement de fondus sur une soirée entière n'est pas neutre.

Correctif : sous `prefers-reduced-motion: reduce`, transition à 0 ms. Le changement d'écran reste instantané et parfaitement lisible, ce qui est cohérent avec le rythme « percussif » revendiqué par le système. C'est trois lignes de CSS.

---

## P2

**Espacement entre les cibles.** WCAG 2.2 demande 8px minimum entre cibles adjacentes. La grille de niveaux est spécifiée en taille (64px) mais pas en espacement. Deux audits indépendants aboutissent ici au même correctif, par des chemins différents : `evaluate` par le risque de mistap irréversible, `include` par la norme. Quand ça converge, c'est que le correctif est le bon.

**Annonce des changements de phase.** Le parcours change d'écran sans rechargement. Un lecteur d'écran ne signalera rien. Un conteneur en `aria-live="polite"` autour de la zone de phase suffit.

**Structure sémantique.** Un `h1` par écran, portant le contenu primaire : le thème, puis la question, puis la réponse. C'est gratuit et ça donne une structure navigable.

**L'aide qui disparaît définitivement.** La ligne d'apprentissage proposée s'efface après trois cartes. Un joueur qui arrive à la quatrième soirée ne la verra jamais. Correctif : elle disparaît de l'écran THÈME mais reste en permanence sur l'accueil, qui a la place de l'accueillir.

---

## Ce qui est déjà juste

**Les cibles à 64px** dépassent largement le minimum WCAG de 24px et la recommandation de 44px. C'est confortable pour une main qui tremble, pour un téléphone qu'on vient de recevoir, et pour quelqu'un qui a bu.

**Aucune information portée par la couleur seule.** Le rouge du signalement est doublé d'un texte. La difficulté passe par l'opacité. Le verrou passe par un mot. Rien à corriger.

**Aucun clignotement, aucune lecture automatique, aucune limite de temps.** Trois familles entières de problèmes qui n'existent pas ici, par sobriété plutôt que par vigilance.

**Le vide de 96px avant la révélation** sert aussi les utilisateurs à motricité réduite, qui sont les premiers exposés au tap parasite. Décision prise pour une raison, bénéfique pour deux.

---

## Synthèse

Sept correctifs, dont un seul touche à l'intention du design : la rampe d'opacité doit partir de 0,45 au lieu de « presque effacé ». Les six autres sont des ajustements qui ne remettent en cause aucune décision.

Le vrai finding n'est pas dans cette liste : c'est que **le correctif d'accessibilité le plus important est le même que le correctif d'expérience le plus important.** Modéliser le rituel oral répare simultanément le P0 de l'audit UX, le P0 de cet audit, et le P1 d'apprentissage de l'audit de robustesse. Trois audits menés séparément désignent le même trou.
