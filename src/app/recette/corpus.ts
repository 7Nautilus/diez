/*
 * Diez : le corpus que le banc de recette monte, et d'ou il vient.
 *
 * DEUX CARTES DE FIXTURE EXISTENT PRECISEMENT POUR CETTE PHASE, et rien ne
 * permettait de les atteindre. `_fixture-limites-001` porte dix questions dont
 * chacune eprouve une borne differente, `_fixture-minimal-001` porte le theme le
 * plus court et des reponses d'un caractere ; docs/recette.md section 1 exige de
 * les parcourir niveau par niveau. Le compilateur de contenu les ecarte de la
 * production par leur paquet, ce qui est juste, et les rendait par la meme
 * injouables : la moitie de la recette technique etait inatteignable, donc le
 * critere de sortie de la phase ne pouvait pas etre prononce.
 *
 * LE CHOIX PASSE PAR LA QUERY, PAS PAR LE STOCKAGE, et c'est le seul point de
 * conception de ce fichier. Les gestes du banc ecrivent dans le stockage puis
 * rechargent la page, donc le choix doit survivre a un rechargement ; une clef
 * de plus l'aurait fait vivre a cote des quatre clefs de l'application, dans un
 * `localStorage` dont architecture.md section 7 dit que tout acces passe par
 * `storage/`. La query survit au rechargement sans rien ajouter nulle part, et
 * l'URL dit d'elle-meme sur quoi la recette tourne.
 *
 * UN CORPUS D'UNE SEULE CARTE N'EST PAS UN RACCOURCI DE CONFORT. La pioche est
 * aleatoire et une carte revient dans le vivier tant qu'il lui reste des
 * niveaux : sur un corpus de douze cartes, parcourir les dix niveaux d'une carte
 * precise demande de la retirer une dizaine de fois de suite, ce que personne ne
 * fera. Sur un corpus d'une carte, les dix tours suivants la parcourent, et le
 * onzieme tombe sur le vivier vide, ce qui rend le chemin EPUISEMENT vers
 * ACCUEIL jouable en vrai pour la premiere fois.
 */

import CORPUS from "../../data/cartes.gen.json";
import FIXTURES from "../../data/fixtures.gen.json";
import type { Carte } from "../../domain/types";

/**
 * Les quatre corpus que le banc sait monter.
 *
 * Ecrits en VALEUR et le type deduit, comme `MODES_AFFICHAGE` cote ecrans : un
 * type union ne s'enumere pas a l'execution, or le selecteur du banc doit
 * parcourir la liste.
 */
export const CHOIX_CORPUS = ["pilote", "limites", "minimal", "tout"] as const;

export type ChoixCorpus = (typeof CHOIX_CORPUS)[number];

/** Le nom du parametre de query qui porte le choix. */
const PARAMETRE = "corpus";

/** Ce que le banc monte par defaut : l'application telle qu'elle est publiee. */
const DEFAUT: ChoixCorpus = "pilote";

export const LIBELLE_CORPUS: Record<ChoixCorpus, string> = {
  pilote: "Pilote",
  limites: "Limites",
  minimal: "Minimal",
  tout: "Tout",
};

export const DESCRIPTION_CORPUS: Record<ChoixCorpus, string> = {
  pilote: "Le corpus publie, dix cartes. C'est ce que joue l'application installée.",
  limites:
    "_fixture-limites-001 seule. Dix tours la parcourent du niveau 1 au niveau 10, le onzième tombe sur l'épuisement.",
  minimal: "_fixture-minimal-001 seule. Thème de 7 caractères, réponses d'un caractère partout.",
  tout: "Le corpus publié plus les deux fixtures, douze cartes.",
};

function estChoix(valeur: string | null): valeur is ChoixCorpus {
  return valeur !== null && CHOIX_CORPUS.some((connu) => connu === valeur);
}

function carteDeFixture(identifiant: string): readonly Carte[] {
  return FIXTURES.filter((carte) => carte.id === identifiant);
}

/** Le choix courant, lu dans l'URL. Une valeur inconnue retombe sur le defaut. */
export function choixCourant(recherche: string): ChoixCorpus {
  const valeur = new URLSearchParams(recherche).get(PARAMETRE);
  return estChoix(valeur) ? valeur : DEFAUT;
}

/**
 * Le corpus correspondant au choix.
 *
 * Une liste VIDE est possible si le compilateur n'a rien ecrit dans les
 * fixtures, et le banc l'affiche plutot que de la corriger : un corpus vide se
 * voit immediatement sur l'accueil, dont le compteur annonce "0 carte
 * restante", et le masquer ferait chercher le defaut ailleurs.
 */
export function corpusDuChoix(choix: ChoixCorpus): readonly Carte[] {
  switch (choix) {
    case "pilote":
      return CORPUS;
    case "limites":
      return carteDeFixture("_fixture-limites-001");
    case "minimal":
      return carteDeFixture("_fixture-minimal-001");
    case "tout":
      return [...CORPUS, ...FIXTURES];
  }
}

/** L'URL du meme banc sur un autre corpus. Le reste de la query est abandonne,
 * le banc n'en portant aucun autre. */
export function urlDuChoix(choix: ChoixCorpus): string {
  return `${window.location.pathname}?${PARAMETRE}=${choix}`;
}
