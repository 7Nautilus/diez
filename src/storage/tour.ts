/*
 * Diez : `diez:v1:tour`, le tour en cours et son horodatage.
 *
 * POURQUOI CETTE CLEF EXISTE. Le narrateur est un point de defaillance unique :
 * son ecran se verrouille, il bascule sur ses messages, le systeme evince
 * l'onglet sous pression memoire, et toute la table s'arrete au milieu d'une
 * question. `EtatTour` ne peut donc pas vivre en memoire seulement
 * (architecture.md section 7).
 *
 * `depuis` EST RELU TEL QUEL, jamais reecrit a l'heure de la reprise. C'est
 * l'horodatage d'entree dans la phase, dont le verrou se sert (domain/tour.ts,
 * `verrouille`) : le remplacer par `maintenant` armerait un verrou de 400 ms au
 * moment precis ou le narrateur rouvre l'application et appuie. Un `depuis`
 * ancien rend le verrou inactif a la reprise, ce qui est le comportement voulu,
 * la reprise n'etant pas un double tap.
 *
 * LE PAQUET EST VALIDE PAR UN PREDICAT FOURNI PAR L'APPELANT, comme le mode
 * d'affichage l'est deja dans reglages.ts. `storage/` n'importe rien, donc il
 * ne connait pas la liste des paquets ; elle se deduit du corpus, qui vit chez
 * app/. Le reste de la forme est redeclare ici, ce qui est le prix de la regle
 * de dependance et non un oubli (validation.ts, en-tete).
 *
 * CE QUE CE MODULE NE PEUT PAS VERIFIER, et qui revient au cablage : que la
 * carte relue existe ENCORE dans le corpus. Un lot retire entre deux soirees
 * laisse un tour qui designe une carte disparue, et `app/partie.ts` leve
 * aujourd'hui dans ce cas, ce qui etait juste tant que le tour ne venait que
 * d'une pioche. Le point est ecrit dans partie.ts elle-meme, qui l'annonce
 * comme "a revoir en phase 5".
 */

import { ecrireBrut, effacer, lireBrut } from "./stockage";
import {
  estFacultatif,
  estHorodatage,
  estIdentifiant,
  estListeDe,
  estNiveau,
  estObjet,
  estTexte,
  type NiveauStocke,
} from "./validation";

/** Redeclaration de `ResumeCarte` : voir l'en-tete. */
export type ResumeCarteStocke<P extends string> = {
  id: string;
  theme: string;
  paquet: P;
};

/** Redeclaration d'`EnonceQuestion`. La reponse n'y figure pas, comme dans le
 * domaine : ce que la phase QUESTION ne doit pas montrer, elle ne le stocke pas
 * davantage (architecture.md section 5). */
export type EnonceStocke = { niveau: NiveauStocke; q: string };

/** Redeclaration de `Reponse`. */
export type ReponseStocke = { r: string; note?: string };

/** Redeclaration d'`EtatTour`, phase par phase. */
export type EtatTourStocke<P extends string> =
  | { phase: "REPOS" }
  | { phase: "THEME"; carte: ResumeCarteStocke<P>; depuis: number }
  | {
      phase: "NIVEAU";
      carte: ResumeCarteStocke<P>;
      consommes: readonly NiveauStocke[];
      depuis: number;
    }
  | { phase: "QUESTION"; carte: ResumeCarteStocke<P>; enonce: EnonceStocke; depuis: number }
  | {
      phase: "REPONSE";
      carte: ResumeCarteStocke<P>;
      enonce: EnonceStocke;
      reponse: ReponseStocke;
      depuis: number;
    };

/**
 * Ce que la clef contient : le tour, PLUS son horodatage (architecture.md
 * section 7).
 *
 * L'horodatage est distinct de `depuis` et ne le remplace pas. `depuis` date
 * l'entree dans la phase, l'horodatage date la derniere ecriture, et REPOS ne
 * porte pas de `depuis` du tout : sans champ separe, un tour ecrit en phase
 * QUESTION puis laisse deux heures serait juge sur la date ou la question a ete
 * affichee, ce qui est presque la meme chose, jusqu'au jour ou ce ne l'est plus.
 */
export type TourEnregistre<P extends string> = {
  tour: EtatTourStocke<P>;
  horodatage: number;
};

/*
 * Conversion d'unite, pas une valeur de reglage : la duree qui decide, elle,
 * est `TOUR_PERIME_H` (domain/types.ts, tokens-et-composants.md collection 4)
 * et elle arrive en parametre, `storage/` n'important rien.
 */
const MS_PAR_HEURE = 3_600_000;

function validerResume<P extends string>(
  valeur: unknown,
  accepte: (valeur: string) => valeur is P,
): ResumeCarteStocke<P> | null {
  if (!estObjet(valeur)) return null;
  const { id, theme, paquet } = valeur;
  if (!estIdentifiant(id)) return null;
  if (!estTexte(theme)) return null;
  if (!estTexte(paquet) || !accepte(paquet)) return null;
  return { id, theme, paquet };
}

function validerEnonce(valeur: unknown): EnonceStocke | null {
  if (!estObjet(valeur)) return null;
  const { niveau, q } = valeur;
  if (!estNiveau(niveau)) return null;
  if (!estTexte(q)) return null;
  return { niveau, q };
}

function validerReponse(valeur: unknown): ReponseStocke | null {
  if (!estObjet(valeur)) return null;
  const { r, note } = valeur;
  if (!estTexte(r)) return null;
  if (!estFacultatif(note, estTexte)) return null;
  return { r, note };
}

/**
 * Le tour seul, ou `null` si la forme n'est pas celle d'une des cinq phases.
 *
 * Chaque champ est RECONSTRUIT, jamais l'objet relu tel quel : une clef editee
 * a la main portant une reponse sur une phase QUESTION ne peut donc pas la
 * faire entrer dans l'etat de l'application. P3 tient jusque dans le stockage
 * (architecture.md section 5).
 */
export function validerEtatTour<P extends string>(
  valeur: unknown,
  accepte: (valeur: string) => valeur is P,
): EtatTourStocke<P> | null {
  if (!estObjet(valeur)) return null;
  const { phase, depuis } = valeur;

  // REPOS ne porte ni carte ni horodatage d'entree : il n'y a pas d'entree de
  // phase a proteger, donc rien d'autre a valider (domain/types.ts).
  if (phase === "REPOS") return { phase: "REPOS" };

  // Les quatre autres phases portent toutes une carte et un `depuis`.
  if (!estHorodatage(depuis)) return null;
  const carte = validerResume(valeur.carte, accepte);
  if (carte === null) return null;

  switch (phase) {
    case "THEME":
      return { phase: "THEME", carte, depuis };

    case "NIVEAU": {
      const { consommes } = valeur;
      if (!estListeDe(consommes, estNiveau)) return null;
      return { phase: "NIVEAU", carte, consommes, depuis };
    }

    case "QUESTION": {
      const enonce = validerEnonce(valeur.enonce);
      if (enonce === null) return null;
      return { phase: "QUESTION", carte, enonce, depuis };
    }

    case "REPONSE": {
      const enonce = validerEnonce(valeur.enonce);
      if (enonce === null) return null;
      const reponse = validerReponse(valeur.reponse);
      if (reponse === null) return null;
      return { phase: "REPONSE", carte, enonce, reponse, depuis };
    }

    default:
      // Un nom de phase inconnu : une v2 lue par une v1, ou une clef bricolee.
      return null;
  }
}

/**
 * L'enveloppe complete, ou `null`. Exportee pour la meme raison que les autres
 * validateurs : c'est ce qu'on peut montrer en train de refuser.
 */
export function validerTour<P extends string>(
  brut: unknown,
  accepte: (valeur: string) => valeur is P,
): TourEnregistre<P> | null {
  if (!estObjet(brut)) return null;
  const { tour, horodatage } = brut;
  if (!estHorodatage(horodatage)) return null;
  const valide = validerEtatTour(tour, accepte);
  if (valide === null) return null;
  return { tour: valide, horodatage };
}

/**
 * Au-dela de `perimeApresHeures`, c'est une autre soiree et non une reprise
 * (architecture.md section 7 ; la duree est `TOUR_PERIME_H`).
 *
 * L'ECART EST PRIS EN VALEUR ABSOLUE, ce qui n'est pas une precaution de style.
 * Un horodatage dans le futur arrive des que l'horloge du telephone recule,
 * changement d'heure ou reglage automatique apres une remise sous tension. Sans
 * la valeur absolue, l'ecart serait negatif, donc toujours inferieur au seuil,
 * et un tour vieux de plusieurs jours serait repris comme s'il datait de la
 * minute. Un tour date de demain n'est pas davantage la meme soiree qu'un tour
 * date d'hier.
 */
export function perime(horodatage: number, maintenant: number, perimeApresHeures: number): boolean {
  return Math.abs(maintenant - horodatage) > perimeApresHeures * MS_PAR_HEURE;
}

/**
 * Le tour a reprendre, ou `null` : clef absente, contenu corrompu, ou soiree
 * differente. Trois causes, une seule consequence, une partie neuve.
 */
export function lireTour<P extends string>(
  accepte: (valeur: string) => valeur is P,
  maintenant: number,
  perimeApresHeures: number,
): EtatTourStocke<P> | null {
  const enregistre = validerTour(lireBrut("tour"), accepte);
  if (enregistre === null) return null;
  if (perime(enregistre.horodatage, maintenant, perimeApresHeures)) return null;
  return enregistre.tour;
}

/**
 * Enregistre le tour en cours.
 *
 * ECRIRE UN TOUR AU REPOS EFFACE LA CLEF, et c'est le seul comportement qui
 * rende l'invariant tenable : la clef porte un tour EN COURS, or REPOS n'en est
 * pas un. architecture.md section 7 demande que la clef soit effacee sur
 * `terminer()` ; en faire une consequence de l'ecriture plutot qu'un appel a se
 * rappeler retire au cablage la seule facon de l'oublier. Un tour oublie la
 * serait relu au demarrage suivant et rouvrirait une soiree terminee.
 */
export function ecrireTour(tour: EtatTourStocke<string>, maintenant: number): void {
  if (tour.phase === "REPOS") {
    effacer("tour");
    return;
  }
  ecrireBrut("tour", { tour, horodatage: maintenant });
}

/** Pour la reinitialisation, qui n'est pas une fin de tour. */
export function effacerTour(): void {
  effacer("tour");
}
