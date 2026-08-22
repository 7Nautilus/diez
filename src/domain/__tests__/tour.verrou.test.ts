/*
 * Diez : le verrou d'entree du reducteur.
 *
 * Ce que cette suite protege : architecture.md section 10. `REVELER LA
 * REPONSE` occupe le bas de l'ecran QUESTION, `SUIVANTE` le bas de l'ecran
 * REPONSE, et la transition dure 200 ms. Un double tap, par impatience ou par
 * tremblement, revele puis enchaine : la reponse s'affiche 200 ms et la carte
 * est perdue. Sous le modele du narrateur, personne d'autre n'a l'ecran sous
 * les yeux pour s'en apercevoir.
 *
 * VERROU_MS est importe et jamais recopie : un test qui reecrirait la valeur
 * ne verrait pas qu'on l'a changee d'un seul cote.
 */

import { initial, reduire } from "../tour";
import { type Action, type EtatTour, VERROU_MS } from "../types";
import {
  ANNONCER,
  CHOISIR,
  CHOISIR_DISCORDANT,
  CONSOMMES,
  ENTREE_DE_PHASE,
  etatNiveau,
  etatQuestion,
  etatReponse,
  etatTheme,
  PIOCHER,
  RESUME,
  REVELER,
  SUIVANTE,
  TERMINER,
} from "./fixtures";

/*
 * L'echeance du verrou et le dernier instant qui la precede. Tout se derive de
 * VERROU_MS : une borne recopiee en clair passerait au vert le jour ou la
 * valeur change d'un seul cote.
 */
const ECHEANCE = ENTREE_DE_PHASE + VERROU_MS;
const JUSTE_AVANT = ECHEANCE - 1;

const EN_THEME = etatTheme(ENTREE_DE_PHASE);
const EN_NIVEAU = etatNiveau(ENTREE_DE_PHASE);
const EN_QUESTION = etatQuestion(ENTREE_DE_PHASE);
const EN_REPONSE = etatReponse(ENTREE_DE_PHASE);

/**
 * Les quatre phases qui portent un horodatage, chacune avec une transition qui
 * lui est applicable. REPOS est absente volontairement : elle n'a pas de
 * `depuis`, et son cas est traite a part.
 */
const transitions: readonly {
  depart: string;
  etat: EtatTour;
  action: Action;
  arrivee: EtatTour["phase"];
}[] = [
  { depart: "THEME", etat: EN_THEME, action: ANNONCER, arrivee: "NIVEAU" },
  { depart: "NIVEAU", etat: EN_NIVEAU, action: CHOISIR, arrivee: "QUESTION" },
  { depart: "QUESTION", etat: EN_QUESTION, action: REVELER, arrivee: "REPONSE" },
  { depart: "REPONSE", etat: EN_REPONSE, action: SUIVANTE, arrivee: "THEME" },
];

describe("Verrouillage d'entrée", () => {
  it.each(transitions)(
    "une action arrivant avant l'échéance du verrou laisse l'état inchangé, en phase $depart",
    ({ etat, action }) => {
      expect(reduire(etat, action, JUSTE_AVANT)).toEqual(etat);
    },
  );

  it.each(transitions)(
    "une action arrivant exactement à l'échéance du verrou passe, en phase $depart",
    ({ etat, action, arrivee }) => {
      expect(reduire(etat, action, ECHEANCE).phase).toBe(arrivee);
    },
  );

  it.each(transitions)(
    "une action rejetée par le verrou rend l'état reçu lui-même, en phase $depart",
    ({ etat, action }) => {
      // L'egalite de valeur ne suffit pas, et l'ecart se paiera en phase 4 :
      // sous `useReducer`, un objet neuf rendu sur un geste absorbe declenche un
      // rendu que rien n'a change. Le verrou est precisement la fenetre pendant
      // laquelle le narrateur tapote, donc celle ou ces rendus arriveraient en
      // rafale (architecture.md section 10).
      expect(reduire(etat, action, JUSTE_AVANT)).toBe(etat);
    },
  );

  it("un rejet ne repousse pas l'échéance : insister ne prolonge pas le verrou", () => {
    // Le piege : un reducteur qui remettrait `depuis` a `maintenant` en
    // rejetant reculerait l'echeance a chaque tap, et le narrateur resterait
    // bloque aussi longtemps qu'il insiste. On rejoue donc l'etat rendu par
    // chaque rejet, et non l'etat de depart.
    const apresInsistance = [
      ENTREE_DE_PHASE + 1,
      ENTREE_DE_PHASE + VERROU_MS / 2,
      JUSTE_AVANT,
    ].reduce<EtatTour>((etat, maintenant) => reduire(etat, REVELER, maintenant), EN_QUESTION);

    expect(apresInsistance).toEqual(EN_QUESTION);
    expect(reduire(apresInsistance, REVELER, ECHEANCE).phase).toBe("REPONSE");
  });

  it("un choisir rejeté ne fait pas entrer en QUESTION, donc ne consomme aucun niveau", () => {
    // Le niveau se consomme a l'entree en phase QUESTION, chez l'appelant
    // (architecture.md section 6). Tant que le reducteur rend une phase
    // NIVEAU, il n'y a rien a consommer : c'est la moitie de l'invariant que
    // le verrou doit tenir.
    const apres = reduire(EN_NIVEAU, CHOISIR, JUSTE_AVANT);

    expect(apres).toEqual({
      phase: "NIVEAU",
      carte: RESUME,
      consommes: CONSOMMES,
      depuis: ENTREE_DE_PHASE,
    });
  });

  it("la première pioche d'une soirée n'est jamais verrouillée", () => {
    // REPOS ne porte pas de `depuis` : il n'y a pas d'entree de phase a
    // proteger, donc rien qui puisse retarder le premier geste de la soiree.
    expect(reduire(initial(), PIOCHER, 0).phase).toBe("THEME");
  });

  it("le retour au repos rouvre la pioche dans l'instant", () => {
    const auRepos = reduire(EN_REPONSE, TERMINER, ECHEANCE);

    expect(auRepos.phase).toBe("REPOS");
    expect(reduire(auRepos, PIOCHER, ECHEANCE).phase).toBe("THEME");
  });

  it("un double tap sur RÉVÉLER puis SUIVANTE ne fait pas disparaître la réponse", () => {
    // Le cas qui a motive le verrou, rejoue de bout en bout.
    const revelee = reduire(EN_QUESTION, REVELER, ECHEANCE);
    // Dernier instant encore verrouille apres l'entree en REPONSE : c'est le
    // tap le plus tardif, donc le cas le plus favorable au bug.
    const secondTap = ECHEANCE + VERROU_MS - 1;

    expect(reduire(revelee, SUIVANTE, secondTap)).toEqual(revelee);
  });

  it("le verrou mesure un écart et non une date, quelle que soit l'origine de l'horloge", () => {
    // Une horloge reelle rend des millisecondes depuis 1970. Une suite qui
    // partirait toujours de zero laisserait passer un reducteur comparant
    // `maintenant` a une origine fixe.
    const tardif = 1_700_000_000_000;
    const enTheme = etatTheme(tardif);

    expect(reduire(enTheme, ANNONCER, tardif + VERROU_MS - 1)).toEqual(enTheme);
    expect(reduire(enTheme, ANNONCER, tardif + VERROU_MS).phase).toBe("NIVEAU");
  });
});

describe("L'ordre de la garde et du verrou", () => {
  it("un énoncé discordant lève même à l'intérieur de la fenêtre du verrou", () => {
    // La garde de cablage s'execute AVANT le controle du verrou, et c'est
    // l'arbitrage : un enonce discordant est un defaut de programmation, donc
    // il doit etre bruyant (conventions-code.md section 7). Un verrou place
    // devant elle le rendrait intermittent, visible ou non selon l'horodatage
    // du tap, ce qui est la pire forme que puisse prendre un defaut de
    // cablage : celle qu'on ne reproduit pas.
    expect(() => reduire(EN_NIVEAU, CHOISIR_DISCORDANT, JUSTE_AVANT)).toThrow();
  });

  it("un énoncé concordant reçu dans la même fenêtre est rejeté sans lever", () => {
    // Le controle complementaire, sans lequel le precedent ne prouverait rien :
    // il etablit que la fenetre est bien verrouillee a cet instant, donc que
    // c'est l'ordre des deux controles, et non un verrou inactif, qui fait
    // lever le cas discordant.
    expect(() => reduire(EN_NIVEAU, CHOISIR, JUSTE_AVANT)).not.toThrow();
    expect(reduire(EN_NIVEAU, CHOISIR, JUSTE_AVANT)).toStrictEqual(EN_NIVEAU);
  });
});
