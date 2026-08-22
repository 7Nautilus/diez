/*
 * Diez : les fixtures communes aux suites du domaine.
 *
 * Un seul endroit ou ces valeurs s'ecrivent. Quatre suites qui les redefinissent
 * chacune divergent sans que rien ne le signale, et la divergence etait deja
 * installee : `NIVEAU_CHOISI` valait 4 d'un cote et 3 de l'autre, `carteDeTest`
 * existait en deux signatures incompatibles. Rien de tout cela ne casse un
 * test ; ca rend seulement deux suites incomparables, donc impossibles a lire
 * ensemble le jour ou l'une des deux passe au rouge.
 *
 * Ce qui reste local a une suite y reste. Une valeur qui differe parce que le
 * test a besoin qu'elle differe n'appartient pas ici : les origines d'horloge
 * particulieres, les pas d'horloge, les historiques de scenario et les helpers
 * qu'une seule suite appelle sont dans ce cas. Une fixture partagee trop rigide
 * coute plus cher que la duplication qu'elle supprime.
 *
 * Le corpus reel n'est jamais lu : le domaine ne le connait pas, il le recoit
 * en parametre (spec-fondations.md, phase 2, decision 1). Une suite adossee a
 * content/ changerait de resultat le jour ou une carte y est reecrite, sans que
 * rien du domaine n'ait bouge.
 */

import {
  type Action,
  type Carte,
  type CarteId,
  type EnonceQuestion,
  type EtatTour,
  NIVEAUX,
  type Niveau,
  type PaquetId,
  type Reponse,
  type ResumeCarte,
} from "../types";

/**
 * Une carte complete, avec ses dix questions.
 *
 * Le paquet a une valeur par defaut : la plupart des cas n'eprouvent pas le
 * filtre des paquets et le nommer y ajouterait un detail sans rapport avec
 * l'invariant teste. Les cas qui eprouvent ce filtre le passent explicitement,
 * et c'est alors le seul endroit ou il se lit.
 *
 * L'identifiant se retrouve dans le theme et dans chaque question : un echec
 * d'egalite affiche ainsi de quelle carte vient la valeur inattendue, ce qu'un
 * texte generique ne dirait pas.
 */
export function carteDeTest(id: CarteId, paquet: PaquetId = "general"): Carte {
  return {
    id,
    theme: `Thème de ${id}`,
    paquet,
    domaine: "_test",
    questions: NIVEAUX.map((niveau) => ({
      niveau,
      q: `Énoncé de niveau ${niveau} sur ${id} ?`,
      r: `Réponse de niveau ${niveau} sur ${id}`,
    })),
    source: "manuel",
    valide: true,
  };
}

/*
 * Deux resumes distincts, et non un seul reutilise : la transition `suivante`
 * ne se prouve qu'en changeant de carte. Un reducteur qui reconduirait la carte
 * courante passerait un test ecrit avec un resume unique.
 */

export const RESUME: ResumeCarte = {
  id: "_fixture-001",
  theme: "Thème de fixture",
  paquet: "_fixtures",
};

export const RESUME_SUIVANT: ResumeCarte = {
  id: "_fixture-002",
  theme: "Thème de la carte suivante",
  paquet: "_fixtures",
};

/*
 * Les textes que P3 rationne. Ce sont des sentinelles reconnaissables plutot
 * que du texte plausible : les controles structurels cherchent ces chaines par
 * sous-chaine dans tout l'etat, et un fragment de phrase ordinaire s'y
 * retrouverait par coincidence.
 */
export const TEXTE_ENONCE = "SENTINELLE-ENONCE";
export const TEXTE_REPONSE = "SENTINELLE-REPONSE";
export const TEXTE_NOTE = "SENTINELLE-NOTE";

/** Un niveau quelconque, nomme pour que les sequences restent lisibles. */
export const NIVEAU_CHOISI: Niveau = 4;

/** N'importe quel niveau autre que `NIVEAU_CHOISI` : il sert a le contredire. */
export const AUTRE_NIVEAU: Niveau = 7;

export const ENONCE: EnonceQuestion = { niveau: NIVEAU_CHOISI, q: TEXTE_ENONCE };

export const REPONSE: Reponse = { r: TEXTE_REPONSE, note: TEXTE_NOTE };

/**
 * Des niveaux deja brules, choisis pour ne contenir ni `NIVEAU_CHOISI` ni
 * `AUTRE_NIVEAU` : une fixture ou le niveau choisi serait deja consomme
 * decrirait une situation que le selecteur ne propose jamais.
 */
export const CONSOMMES: readonly Niveau[] = [1, 2, 3];

export const PIOCHER: Action = { type: "piocher", carte: RESUME };
export const ANNONCER: Action = { type: "annoncer", consommes: CONSOMMES };
export const RETOUR: Action = { type: "retour" };
export const CHOISIR: Action = { type: "choisir", niveau: NIVEAU_CHOISI, enonce: ENONCE };
export const REVELER: Action = { type: "reveler", reponse: REPONSE };
export const SUIVANTE: Action = { type: "suivante", carte: RESUME_SUIVANT };
export const TERMINER: Action = { type: "terminer" };

/**
 * Un `choisir` dont l'enonce contredit le niveau annonce.
 *
 * Personne ne peut provoquer ca en jouant : c'est un defaut de cablage, et la
 * garde de `reduire` doit le rendre bruyant (conventions-code.md section 7).
 */
export const CHOISIR_DISCORDANT: Action = {
  type: "choisir",
  niveau: NIVEAU_CHOISI,
  enonce: { niveau: AUTRE_NIVEAU, q: TEXTE_ENONCE },
};

/**
 * L'instant d'entree en phase des etats de fixture.
 *
 * L'origine est arbitraire : le reducteur ne mesure qu'un ecart entre
 * `maintenant` et `depuis`, jamais une date. Ce n'est donc pas une valeur
 * mesuree, contrairement a VERROU_MS, et rien ici ne doit en dependre
 * autrement qu'en s'y ajoutant.
 */
export const ENTREE_DE_PHASE = 1_000;

/*
 * Les quatre phases horodatees, construites plutot que figees : `depuis` est le
 * seul champ dont les suites ont besoin de disposer librement, l'une pour
 * eprouver la borne du verrou au millieme pres, l'autre pour s'en tenir a
 * l'ecart de son choix. REPOS n'a pas de constructeur : il se fabrique par
 * `initial()`, qui est justement ce que les suites eprouvent.
 */

export function etatTheme(depuis: number): EtatTour {
  return { phase: "THEME", carte: RESUME, depuis };
}

export function etatNiveau(depuis: number): EtatTour {
  return { phase: "NIVEAU", carte: RESUME, consommes: CONSOMMES, depuis };
}

export function etatQuestion(depuis: number): EtatTour {
  return { phase: "QUESTION", carte: RESUME, enonce: ENONCE, depuis };
}

export function etatReponse(depuis: number): EtatTour {
  return { phase: "REPONSE", carte: RESUME, enonce: ENONCE, reponse: REPONSE, depuis };
}
