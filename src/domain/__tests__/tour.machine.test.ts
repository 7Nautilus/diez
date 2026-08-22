/*
 * Diez : la machine a etats du tour.
 *
 * Ce que cette suite protege : la table des transitions d'architecture.md
 * section 5, les deux transitions que la meme section declare volontairement
 * absentes, et le principe P3, qui veut qu'a chaque phase l'etat contienne
 * exactement ce qui peut etre montre et rien de plus.
 *
 * Les cas viennent du plan de tests de spec-fondations.md, phase 2. Ce qui est
 * encode ici est ce que la specification exige, jamais ce que tour.ts fait :
 * un test ecrit d'apres l'implementation ne prouve rien d'autre que l'existence
 * de l'implementation.
 */

import { initial, reduire } from "../tour";
import { type Action, type EtatTour, VERROU_MS } from "../types";
import {
  ANNONCER,
  CHOISIR,
  CHOISIR_DISCORDANT,
  CONSOMMES,
  ENONCE,
  ENTREE_DE_PHASE,
  etatNiveau,
  etatQuestion,
  etatReponse,
  etatTheme,
  PIOCHER,
  REPONSE,
  RESUME,
  RESUME_SUIVANT,
  RETOUR,
  REVELER,
  SUIVANTE,
  TERMINER,
  TEXTE_ENONCE,
  TEXTE_NOTE,
  TEXTE_REPONSE,
} from "./fixtures";

/*
 * Le pas d'horloge entre deux actions, deliberement au-dela de VERROU_MS et
 * jamais egal a lui. Cette suite eprouve la table des transitions, pas la borne
 * exacte du verrou d'entree, qui a sa propre suite : une action datee pile sur
 * la borne ferait dependre chaque test de la machine d'un arbitrage qui ne le
 * concerne pas. VERROU_MS est lu et jamais recopie (architecture.md section 10).
 */
const PAS_MS = VERROU_MS * 2;

const INSTANT_UTILE = ENTREE_DE_PHASE + PAS_MS;

/** Applique une action a une phase installee depuis assez longtemps pour que
 * le verrou d'entree ne s'en mele pas. */
function apresLeVerrou(etat: EtatTour, action: Action): EtatTour {
  return reduire(etat, action, INSTANT_UTILE);
}

/**
 * Rejoue une sequence complete depuis l'etat d'ouverture, l'horloge avancant
 * d'un pas a chaque action.
 *
 * Un etat construit a la main ne dit rien de ce que le reducteur retient d'une
 * phase a l'autre, or c'est exactement la que P3 se perd : par report d'une
 * donnee que la phase d'arrivee n'a plus le droit de montrer. Les controles
 * structurels passent donc tous par une sequence reelle.
 */
function jouer(actions: readonly Action[]): EtatTour {
  let etat = initial();
  let horloge = ENTREE_DE_PHASE;
  for (const action of actions) {
    horloge += PAS_MS;
    etat = reduire(etat, action, horloge);
  }
  return etat;
}

/** Un tour mene jusqu'a la revelation : le seul chemin par lequel le reducteur
 * a deja vu passer un enonce puis une reponse. */
const TOUR_REVELE: readonly Action[] = [PIOCHER, ANNONCER, CHOISIR, REVELER];

const ETAT_THEME = etatTheme(ENTREE_DE_PHASE);
const ETAT_NIVEAU = etatNiveau(ENTREE_DE_PHASE);
const ETAT_QUESTION = etatQuestion(ENTREE_DE_PHASE);
const ETAT_REPONSE = etatReponse(ENTREE_DE_PHASE);

describe("Transitions autorisées", () => {
  it("l'état d'ouverture d'une soirée est le repos", () => {
    expect(initial()).toStrictEqual({ phase: "REPOS" });
  });

  it("au repos, piocher ouvre le thème sur la carte piochée", () => {
    expect(reduire(initial(), PIOCHER, INSTANT_UTILE)).toStrictEqual({
      phase: "THEME",
      carte: RESUME,
      depuis: INSTANT_UTILE,
    });
  });

  it("depuis le thème, annoncer ouvre le sélecteur de niveau sur la même carte", () => {
    expect(apresLeVerrou(ETAT_THEME, ANNONCER)).toStrictEqual({
      phase: "NIVEAU",
      carte: RESUME,
      consommes: CONSOMMES,
      depuis: INSTANT_UTILE,
    });
  });

  it("depuis le sélecteur, choisir un niveau ouvre la question de ce niveau", () => {
    expect(apresLeVerrou(ETAT_NIVEAU, CHOISIR)).toStrictEqual({
      phase: "QUESTION",
      carte: RESUME,
      enonce: ENONCE,
      depuis: INSTANT_UTILE,
    });
  });

  it("depuis le sélecteur, le retour ramène au thème", () => {
    expect(apresLeVerrou(ETAT_NIVEAU, RETOUR)).toStrictEqual({
      phase: "THEME",
      carte: RESUME,
      depuis: INSTANT_UTILE,
    });
  });

  it("depuis la question, révéler ouvre la réponse sans perdre l'énoncé lu", () => {
    expect(apresLeVerrou(ETAT_QUESTION, REVELER)).toStrictEqual({
      phase: "REPONSE",
      carte: RESUME,
      enonce: ENONCE,
      reponse: REPONSE,
      depuis: INSTANT_UTILE,
    });
  });

  it("depuis la réponse, suivante rouvre le thème sur la carte suivante", () => {
    expect(apresLeVerrou(ETAT_REPONSE, SUIVANTE)).toStrictEqual({
      phase: "THEME",
      carte: RESUME_SUIVANT,
      depuis: INSTANT_UTILE,
    });
  });

  it("depuis la réponse, terminer ramène au repos", () => {
    expect(apresLeVerrou(ETAT_REPONSE, TERMINER)).toStrictEqual(initial());
  });

  it("chaque entrée en phase est horodatée par l'instant de la transition", () => {
    // `depuis` est l'horodatage de l'entree dans la phase (architecture.md
    // section 5) : c'est lui, et rien d'autre, qui arme le verrou d'entree. Un
    // horodatage repris de la phase precedente rendrait le verrou inoperant
    // sans qu'aucune transition ne paraisse fausse.
    //
    // `terminer` manque a la liste parce que REPOS ne porte pas de `depuis` :
    // il n'y a pas d'entree de phase a proteger au repos.
    const entrees: readonly (readonly [EtatTour, Action])[] = [
      [initial(), PIOCHER],
      [ETAT_THEME, ANNONCER],
      [ETAT_NIVEAU, CHOISIR],
      [ETAT_NIVEAU, RETOUR],
      [ETAT_QUESTION, REVELER],
      [ETAT_REPONSE, SUIVANTE],
    ];

    for (const [etat, action] of entrees) {
      expect(apresLeVerrou(etat, action), `${etat.phase} + ${action.type}`).toMatchObject({
        depuis: INSTANT_UTILE,
      });
    }
  });
});

/*
 * La table d'architecture.md section 5, transcrite : phase de depart, action,
 * phase d'arrivee. Tout couple absent de cette liste est une transition qui
 * n'existe pas, et le reducteur doit le traiter comme un geste sans effet.
 */
type Transition = readonly [EtatTour["phase"], Action["type"], EtatTour["phase"]];

const TABLE: readonly Transition[] = [
  ["REPOS", "piocher", "THEME"],
  ["THEME", "annoncer", "NIVEAU"],
  ["NIVEAU", "choisir", "QUESTION"],
  ["NIVEAU", "retour", "THEME"],
  ["QUESTION", "reveler", "REPONSE"],
  ["REPONSE", "suivante", "THEME"],
  ["REPONSE", "terminer", "REPOS"],
];

function autorisee(phase: EtatTour["phase"], type: Action["type"]): boolean {
  return TABLE.some(([phaseDepart, typeAction]) => phaseDepart === phase && typeAction === type);
}

/** Toutes les phases, chacune representee par un etat installe a la meme date. */
const ETATS: readonly EtatTour[] = [
  initial(),
  ETAT_THEME,
  ETAT_NIVEAU,
  ETAT_QUESTION,
  ETAT_REPONSE,
];

/*
 * `CHOISIR` porte ici un enonce concordant : un enonce discordant releve de la
 * garde de cablage, qui est un autre invariant, teste plus bas.
 */
const ACTIONS: readonly Action[] = [
  PIOCHER,
  ANNONCER,
  RETOUR,
  CHOISIR,
  REVELER,
  SUIVANTE,
  TERMINER,
];

describe("Transitions absentes", () => {
  it("il n'existe pas de retour de QUESTION vers NIVEAU", () => {
    // La transition n'existe pas dans le type, arbitrage rejoue et reconduit
    // sous le modele du narrateur (architecture.md section 5). Le geste de
    // retour du telephone est donc absorbe, en silence et sans effet.
    expect(apresLeVerrou(ETAT_QUESTION, RETOUR)).toStrictEqual(ETAT_QUESTION);
  });

  it("il n'existe pas de retour de RÉPONSE vers QUESTION", () => {
    expect(apresLeVerrou(ETAT_REPONSE, RETOUR)).toStrictEqual(ETAT_REPONSE);
  });

  it("une action inapplicable à la phase courante laisse l'état inchangé, sans lever", () => {
    for (const etat of ETATS) {
      for (const action of ACTIONS) {
        if (autorisee(etat.phase, action.type)) continue;
        const couple = `${etat.phase} + ${action.type}`;
        const rejouer = () => apresLeVerrou(etat, action);
        expect(rejouer, couple).not.toThrow();
        expect(rejouer(), couple).toStrictEqual(etat);
      }
    }
  });

  it("un geste absorbé rend l'état reçu lui-même, et non une copie égale", () => {
    // L'egalite de valeur ne suffit pas, et l'ecart se paiera en phase 4 : sous
    // `useReducer`, un objet neuf rendu sur un geste absorbe declenche un rendu
    // que rien n'a change. C'est exactement pendant le verrou d'entree que le
    // narrateur tapote, donc au moment ou ces rendus inutiles arrivent en
    // rafale (architecture.md section 10).
    for (const etat of ETATS) {
      for (const action of ACTIONS) {
        if (autorisee(etat.phase, action.type)) continue;
        expect(apresLeVerrou(etat, action), `${etat.phase} + ${action.type}`).toBe(etat);
      }
    }
  });

  it("le retour absorbé en QUESTION rend l'état reçu lui-même", () => {
    // La famille de rejet la plus frequente en jeu reel : le bouton retour du
    // telephone pendant que le narrateur lit. Elle merite son controle propre,
    // le geste etant absorbe par la phase QUESTION et non par la table.
    expect(apresLeVerrou(ETAT_QUESTION, RETOUR)).toBe(ETAT_QUESTION);
  });
});

describe("Garde de câblage", () => {
  it("un énoncé qui ne correspond pas au niveau choisi lève", () => {
    // Personne ne peut provoquer ca en jouant : l'appelant a transmis l'enonce
    // d'un autre niveau que celui qu'il annonce. C'est un defaut de cablage,
    // donc il doit etre bruyant (conventions-code.md section 7).
    expect(() => apresLeVerrou(ETAT_NIVEAU, CHOISIR_DISCORDANT)).toThrow();
  });

  it("un énoncé concordant passe sans lever", () => {
    expect(() => apresLeVerrou(ETAT_NIVEAU, CHOISIR)).not.toThrow();
  });
});

/**
 * Toutes les chaines atteignables depuis une valeur, quelle que soit la forme
 * qu'on lui a donnee.
 *
 * Le controle est structurel et non nominatif : verifier l'absence d'un champ
 * appele `reponse` survivrait intact a un refactoring qui rangerait la reponse
 * ailleurs, et P3 tomberait en silence, ce qui est precisement la facon dont il
 * tombe (architecture.md, principe P3).
 */
function chainesAtteignables(valeur: unknown): readonly string[] {
  if (typeof valeur === "string") return [valeur];
  if (Array.isArray(valeur)) {
    return (valeur as readonly unknown[]).flatMap(chainesAtteignables);
  }
  if (typeof valeur === "object" && valeur !== null) {
    return Object.values(valeur as Record<string, unknown>).flatMap(chainesAtteignables);
  }
  return [];
}

function porteLaTrace(etat: EtatTour, sentinelle: string): boolean {
  return chainesAtteignables(etat).some((chaine) => chaine.includes(sentinelle));
}

describe("P3 : l'état ne contient que ce qui peut être montré", () => {
  it("en phase RÉPONSE, l'état porte la réponse révélée", () => {
    // Controle positif, et il n'est pas decoratif : sans lui, les trois tests
    // suivants passeraient tout aussi bien le jour ou `chainesAtteignables`
    // cesserait de rendre quoi que ce soit.
    const etat = jouer(TOUR_REVELE);
    expect(etat.phase).toBe("REPONSE");
    expect(porteLaTrace(etat, TEXTE_REPONSE)).toBe(true);
    expect(porteLaTrace(etat, TEXTE_NOTE)).toBe(true);
  });

  it("en phase QUESTION, l'état ne contient aucune réponse", () => {
    // Le narrateur lit a voix haute en fixant son ecran : une reponse presente
    // dans l'etat serait a un noeud du DOM de ce qu'il prononce.
    const premiere = jouer([PIOCHER, ANNONCER, CHOISIR]);
    expect(premiere.phase).toBe("QUESTION");
    expect(porteLaTrace(premiere, TEXTE_REPONSE)).toBe(false);
    expect(porteLaTrace(premiere, TEXTE_NOTE)).toBe(false);

    // La seconde question du meme tour est le cas qui mord : le reducteur a
    // deja vu passer une reponse, et rien ne doit en rester.
    const suivante = jouer([...TOUR_REVELE, SUIVANTE, ANNONCER, CHOISIR]);
    expect(suivante.phase).toBe("QUESTION");
    expect(porteLaTrace(suivante, TEXTE_REPONSE)).toBe(false);
    expect(porteLaTrace(suivante, TEXTE_NOTE)).toBe(false);
  });

  it("en phase THÈME, l'état ne contient aucun énoncé", () => {
    const premier = jouer([PIOCHER]);
    expect(premier.phase).toBe("THEME");
    expect(porteLaTrace(premier, TEXTE_ENONCE)).toBe(false);

    const suivant = jouer([...TOUR_REVELE, SUIVANTE]);
    expect(suivant.phase).toBe("THEME");
    expect(porteLaTrace(suivant, TEXTE_ENONCE)).toBe(false);
  });

  it("en phase NIVEAU, l'état ne contient aucun énoncé", () => {
    const premier = jouer([PIOCHER, ANNONCER]);
    expect(premier.phase).toBe("NIVEAU");
    expect(porteLaTrace(premier, TEXTE_ENONCE)).toBe(false);

    const suivant = jouer([...TOUR_REVELE, SUIVANTE, ANNONCER]);
    expect(suivant.phase).toBe("NIVEAU");
    expect(porteLaTrace(suivant, TEXTE_ENONCE)).toBe(false);
  });

  it("revenir au thème après une réponse n'en conserve aucune trace", () => {
    const etat = jouer([...TOUR_REVELE, SUIVANTE]);
    expect(etat.phase).toBe("THEME");
    expect(porteLaTrace(etat, TEXTE_REPONSE)).toBe(false);
    expect(porteLaTrace(etat, TEXTE_NOTE)).toBe(false);
  });

  it("terminer ne laisse rien du tour derrière lui", () => {
    // La cle diez:v1:tour est effacee sur `terminer` (architecture.md section
    // 7) ; l'etat en memoire doit l'etre aussi, sans quoi la soiree suivante
    // reprendrait sur une carte que la table a deja vue.
    const etat = jouer([...TOUR_REVELE, TERMINER]);
    expect(etat).toStrictEqual(initial());
    expect(chainesAtteignables(etat)).toStrictEqual(["REPOS"]);
  });
});
