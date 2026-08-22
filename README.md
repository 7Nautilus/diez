# Diez

Un jeu de questions coopératif, à jouer entre amis autour d'une table, sur un seul téléphone.

Un **narrateur** garde l'appareil toute la partie. À chaque tour, l'app tire une carte, il en lit le **thème** à voix haute, et chacun autour de la table annonce un chiffre **de 1 à 10** selon sa confiance sur le sujet. Le narrateur en fait une moyenne approximative, saisit ce niveau, et lit à tout le monde la question correspondante. Plus le chiffre est haut, plus la question est dure. Le groupe cherche ensemble.

Dix niveaux, d'où le nom.

## Statut

Projet à usage strictement privé, sans vocation commerciale. **Aucun code applicatif à ce jour :** la conception, l'architecture et le système de design sont écrits, audités et consolidés. Le contenu se limite à un lot pilote de développement.

## Non-affiliation

Diez s'inspire du mécanisme de « Tu Te Mets Combien ? », un jeu de société commercial, mais **n'en implémente pas les règles** et **ne reproduit aucune de ses cartes**. Les règles sont une variante coopérative maison, décrites dans [docs/modele-de-jeu.md](docs/modele-de-jeu.md). Toutes les questions sont originales. Ce projet n'est ni affilié à l'éditeur du jeu, ni approuvé par lui, et n'est pas destiné à la vente.

## Par où commencer

Les documents se lisent dans cet ordre.

| Document | Ce qu'il contient |
|---|---|
| [docs/modele-de-jeu.md](docs/modele-de-jeu.md) | Les règles. À lire en premier, tout en découle. |
| [docs/architecture.md](docs/architecture.md) | **Document de référence.** Principes, modèle de données, machine à états, pipeline, déploiement. |
| [docs/design-system.md](docs/design-system.md) | **Document de référence.** Le système de design appliqué, écran par écran. |
| [docs/recette.md](docs/recette.md) | Ce qu'on vérifie avant de déclarer la V1 réussie. |
| [docs/roadmap.md](docs/roadmap.md) | Les sept phases, construites à rebours depuis la recette. |
| [docs/spec-fondations.md](docs/spec-fondations.md) | Les phases 1 et 2 spécifiées, prêtes à implémenter. |
| [docs/conventions-code.md](docs/conventions-code.md) | Les règles du code, posées avant la première ligne. |
| [docs/generation-contenu.md](docs/generation-contenu.md) | Le cahier des charges du futur chantier contenu. |

Les quatre fichiers `docs/audit-*.md` sont la **trace du raisonnement**, plus une source. Leurs conclusions ont été rapatriées dans les deux documents de référence, et l'annexe de traçabilité de `architecture.md` indique où chacune a atterri. Leurs corps sont datés et n'ont pas été réécrits après le renommage du projet ni le changement de modèle de jeu : ils décrivent l'état des choses au moment de l'audit.

## Le contenu

```
content/
├── schema/lot.schema.json          le modèle de données, opposable
├── cartes/general/lot-pilote.json  10 cartes de développement
├── cartes/_fixtures/               2 cartes de test aux limites
└── _dev/                           jeux de stockage de développement
```

Le schéma est en JSON Schema 2020-12 et n'est pas décoratif : il refuse un niveau dupliqué, une réponse de 61 caractères, un domaine hors énumération ou une propriété non prévue. Avec la ligne `$schema` en tête de chaque lot, l'éditeur signale l'erreur à la frappe.

**Le lot pilote n'est pas du contenu de production.** Son calibrage est défectueux et documenté comme tel dans `docs/audit-contenu.md` : six cartes sur dix ont une progression de difficulté plate dans leur moitié basse. Il sert à développer, pas à jouer.

## Licence

Aucune. Tous droits réservés, usage privé.
