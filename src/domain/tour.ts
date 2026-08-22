/*
 * Diez : la machine a etats du tour.
 *
 * La table des transitions autorisees est celle d'architecture.md section 5,
 * et il n'y en a pas d'autre. Une action inapplicable a la phase courante
 * laisse l'etat inchange : ce n'est pas une erreur mais un geste qui n'a rien
 * a faire la, typiquement le bouton retour du telephone.
 *
 * Le reducteur est pur et ne lit aucune horloge : `maintenant` est un
 * parametre, ce qui rend le verrou d'entree testable sans attente reelle
 * (architecture.md section 5).
 */

import { type Action, type EtatTour, VERROU_MS } from "./types";

/** L'etat d'ouverture, avant la premiere pioche. */
export function initial(): EtatTour {
  return { phase: "REPOS" };
}

export function reduire(etat: EtatTour, action: Action, maintenant: number): EtatTour {
  // Avant le verrou, et non apres : un enonce discordant est un defaut de
  // programmation, et un rejet de verrou le ferait passer inapercu un appel
  // sur deux.
  verifierCablage(etat, action);

  if (verrouille(etat, maintenant)) return etat;

  switch (etat.phase) {
    case "REPOS":
      if (action.type !== "piocher") return etat;
      return { phase: "THEME", carte: action.carte, depuis: maintenant };

    case "THEME":
      if (action.type !== "annoncer") return etat;
      return {
        phase: "NIVEAU",
        carte: etat.carte,
        consommes: action.consommes,
        depuis: maintenant,
      };

    case "NIVEAU":
      if (action.type === "retour") {
        return { phase: "THEME", carte: etat.carte, depuis: maintenant };
      }
      if (action.type !== "choisir") return etat;
      // Le niveau se consomme ICI, a l'entree en QUESTION, jamais sur
      // `suivante` (architecture.md section 6). L'invariant ne peut pas etre
      // porte par ce fichier : `reduire` ne recoit ni ne rend d'Historique, et
      // `consommer` vit dans paquet.ts. C'est un contrat de composition, tenu
      // par l'appelant, pas une propriete du reducteur.
      // Le reducteur en garantit deja une moitie par sa seule signature :
      // n'ayant aucun acces a l'Historique, il ne peut rien consommer, ni sur
      // `suivante` ni ailleurs. L'autre moitie, "sur choisir", se verifie en
      // rejouant la sequence complete au niveau de l'appelant.
      return { phase: "QUESTION", carte: etat.carte, enonce: action.enonce, depuis: maintenant };

    case "QUESTION":
      // `retour` tombe ici et n'y produit rien. La transition QUESTION vers
      // NIVEAU n'existe pas dans le type : arbitrage rejoue et reconduit sous
      // le modele du narrateur (architecture.md section 5). Le geste de retour
      // du telephone est donc absorbe en silence.
      if (action.type !== "reveler") return etat;
      return {
        phase: "REPONSE",
        carte: etat.carte,
        enonce: etat.enonce,
        reponse: action.reponse,
        depuis: maintenant,
      };

    case "REPONSE":
      if (action.type === "suivante") {
        return { phase: "THEME", carte: action.carte, depuis: maintenant };
      }
      if (action.type === "terminer") return initial();
      return etat;
  }
}

/**
 * Le verrou d'entree : toute action arrivant moins de `VERROU_MS` apres
 * l'entree dans la phase courante est rejetee (architecture.md section 10).
 *
 * Le rejet rend l'etat tel quel, donc sans reinitialiser `depuis` : un
 * tremblement repete ne doit pas repousser indefiniment le moment ou l'ecran
 * redevient utilisable.
 */
function verrouille(etat: EtatTour, maintenant: number): boolean {
  // REPOS ne porte pas de `depuis` : aucune entree de phase a proteger, donc
  // la premiere pioche d'une soiree n'est jamais verrouillee.
  if (etat.phase === "REPOS") return false;
  return maintenant - etat.depuis < VERROU_MS;
}

/**
 * La seule garde du reducteur, et elle leve.
 *
 * L'appelant fabrique l'enonce en allant le chercher dans le corpus ; rien ne
 * l'empeche de transmettre celui d'un autre niveau que celui qu'il annonce.
 * Personne ne peut provoquer ca en jouant : c'est un defaut de cablage, donc
 * il doit etre bruyant (conventions-code.md section 7).
 *
 * La garde ne s'applique qu'a une action applicable a la phase courante. Un
 * `choisir` recu hors de NIVEAU est un geste sans effet, pas un defaut, et il
 * suit la regle commune : etat inchange, sans lever.
 */
function verifierCablage(etat: EtatTour, action: Action): void {
  if (etat.phase !== "NIVEAU" || action.type !== "choisir") return;
  if (action.enonce.niveau === action.niveau) return;
  throw new Error(
    `Enonce discordant : niveau choisi ${action.niveau}, enonce de niveau ${action.enonce.niveau}`,
  );
}
