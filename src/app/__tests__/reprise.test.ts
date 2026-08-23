/*
 * Diez : la reprise apres interruption, rejouee.
 *
 * POURQUOI CETTE SUITE VIT DANS app/ ET NON DANS domain/. La reprise est un
 * CONTRAT DE COMPOSITION, exactement comme le moment ou un niveau est consomme
 * (voir partie.test.ts, qui porte la raison generale). `reduire` ne connait pas
 * le corpus, `storage/` non plus, et aucun des deux ne peut donc dire si le tour
 * qu'on vient de relire designe encore quelque chose de jouable. Seule la couche
 * qui possede le corpus le peut, et c'est celle-ci.
 *
 * CE QUE LA SUITE PROTEGE VRAIMENT. Le narrateur est un point de defaillance
 * unique : son ecran se verrouille, il bascule sur ses messages, le systeme
 * evince l'onglet, et toute la table s'arrete au milieu d'une question
 * (architecture.md section 7). Le tour relu doit donc rouvrir la meme phase sur
 * la meme question. Mais un tour relu est aussi le seul tour du projet qui ne
 * vienne PAS d'une pioche : il peut designer une carte que le corpus ne contient
 * plus, cas parfaitement normal apres un lot retire, et que `partie.ts` traitait
 * jusqu'ici par une levee. Les deux moities sont ici.
 *
 * Aucun React et aucun stockage : `etatRepris` et `tourJouable` sont purs, ce
 * qu'ils relisent leur arrive en parametre.
 */

import {
  carteDeTest,
  ENTREE_DE_PHASE,
  etatNiveau,
  etatQuestion,
  etatReponse,
  etatTheme,
  NIVEAU_CHOISI,
  RESUME,
} from "../../domain/__tests__/fixtures";
import { initial } from "../../domain/tour";
import {
  type Carte,
  type EtatTour,
  type Niveau,
  type PaquetId,
  VERROU_MS,
} from "../../domain/types";
import {
  avancer,
  type EtatEnregistre,
  type EtatPartie,
  etatRepris,
  type Geste,
  type Signalement,
  tourJouable,
} from "../partie";

/*
 * La carte du corpus porte l'identifiant des resumes de fixture : les etats de
 * phase tout prets designent `RESUME`, donc le corpus doit contenir cette
 * carte-la pour que la reprise ait quelque chose a retrouver.
 */
const PAQUET: PaquetId = "_fixtures";
const CARTE = carteDeTest(RESUME.id, PAQUET);
const CORPUS: readonly Carte[] = [CARTE];
const PAQUETS: readonly PaquetId[] = [PAQUET];

/** Le meme corpus, moins la carte du tour : c'est le lot retire entre deux
 * soirees. */
const CORPUS_SANS_LA_CARTE: readonly Carte[] = [carteDeTest("carte-restee", PAQUET)];

/** La meme carte, moins le niveau que le tour a en cours : c'est la carte
 * reecrite avec d'autres niveaux, que la seule presence de l'identifiant ne
 * suffit pas a attraper. */
const CORPUS_SANS_LE_NIVEAU: readonly Carte[] = [
  { ...CARTE, questions: CARTE.questions.filter((question) => question.niveau !== NIVEAU_CHOISI) },
];

const VIDE: EtatEnregistre = {
  tour: null,
  historique: {},
  signalements: [],
  paquets: PAQUETS,
};

function repris(tour: EtatTour | null, corpus: readonly Carte[] = CORPUS): EtatPartie {
  return etatRepris(corpus, { ...VIDE, tour });
}

const LES_QUATRE_PHASES: readonly EtatTour[] = [
  etatTheme(ENTREE_DE_PHASE),
  etatNiveau(ENTREE_DE_PHASE),
  etatQuestion(ENTREE_DE_PHASE),
  etatReponse(ENTREE_DE_PHASE),
];

describe("Un tour relu qui designe encore quelque chose de jouable", () => {
  /*
   * Le controle positif, et sans lui toute la suite serait satisfaite par une
   * fonction qui refuse tout : elle ecarterait alors chaque reprise et personne
   * ne s'en apercevrait, la partie repartant simplement a neuf.
   */
  it("est repris dans sa phase, y compris QUESTION et REPONSE", () => {
    for (const tour of LES_QUATRE_PHASES) {
      expect(tourJouable(CORPUS, tour)).toBe(true);
      expect(repris(tour).tour).toEqual(tour);
    }
  });

  it("garde l'horodatage d'entree de phase tel quel, jamais celui de la reprise", () => {
    const tour = etatQuestion(ENTREE_DE_PHASE);
    const rendu = repris(tour).tour;

    /*
     * `depuis` arme le verrou d'entree. Le reecrire a l'heure de la reprise
     * poserait 400 ms d'inertie au moment precis ou le narrateur rouvre
     * l'application et appuie (domain/tour.ts, `verrouille`). Un `depuis` ancien
     * rend le verrou inactif, ce qui est le comportement voulu : une reprise
     * n'est pas un double tap.
     */
    expect(rendu.phase === "REPOS" ? null : rendu.depuis).toBe(ENTREE_DE_PHASE);
  });

  /*
   * LE REPOS EST ACCEPTE, ET CE TEST A ETE AJOUTE PARCE QU'UNE SONDE AVAIT
   * SURVECU. Desarmer la branche REPOS de `tourJouable` ne faisait tomber aucun
   * test : l'ecart est invisible a travers `etatRepris`, qui remplace un tour
   * refuse par `initial()`, c'est-a-dire par un REPOS. Mais `tourJouable` est
   * exporte, et un tour au repos est bel et bien relisible, `validerEtatTour`
   * l'acceptant sur une clef bricolee a la main. Le contrat de la fonction
   * couvre donc les cinq phases, pas quatre.
   */
  it("accepte un tour au repos, qui ne designe aucune carte", () => {
    expect(tourJouable(CORPUS_SANS_LA_CARTE, initial())).toBe(true);
    expect(repris(initial(), CORPUS_SANS_LA_CARTE).tour).toEqual(initial());
  });

  it("rouvre au repos plutot que sur l'ecran d'impasse", () => {
    // `epuise` retient qu'un TIRAGE a echoue, pas que le vivier est vide : le
    // relire ouvrirait l'application sur l'impasse sans qu'aucune pioche ait eu
    // lieu (partie.ts, `EtatPartie`).
    expect(repris(etatQuestion(ENTREE_DE_PHASE)).epuise).toBe(false);
  });
});

describe("Un tour relu qui ne designe plus rien", () => {
  it("est ecarte quand sa carte a quitte le corpus, dans les quatre phases", () => {
    for (const tour of LES_QUATRE_PHASES) {
      expect(tourJouable(CORPUS_SANS_LA_CARTE, tour)).toBe(false);
      expect(repris(tour, CORPUS_SANS_LA_CARTE).tour).toEqual(initial());
    }
  });

  it("est ecarte quand le niveau de son enonce a quitte la carte", () => {
    for (const tour of [etatQuestion(ENTREE_DE_PHASE), etatReponse(ENTREE_DE_PHASE)]) {
      expect(tourJouable(CORPUS_SANS_LE_NIVEAU, tour)).toBe(false);
    }
  });

  /*
   * L'autre sens du controle precedent, et il n'est pas cosmetique : THEME et
   * NIVEAU ne portent aucun enonce, donc il n'y a chez eux aucun niveau a
   * verifier. Un controle etendu a toutes les phases ecarterait des reprises
   * parfaitement valides, et le ferait en silence.
   */
  it("n'est pas ecarte en THEME ni en NIVEAU, ou aucun enonce n'est engage", () => {
    for (const tour of [etatTheme(ENTREE_DE_PHASE), etatNiveau(ENTREE_DE_PHASE)]) {
      expect(tourJouable(CORPUS_SANS_LE_NIVEAU, tour)).toBe(true);
    }
  });

  it("ouvre une partie neuve quand la clef ne portait rien", () => {
    expect(repris(null).tour).toEqual(initial());
  });
});

describe("Ce que le tri du demarrage empeche", () => {
  /*
   * LA MESURE QUI JUSTIFIE `tourJouable`, et le seul test de la suite qui
   * montre le defaut plutot que sa correction.
   *
   * `partie.ts` leve sur les trois acces au corpus quand une carte est
   * introuvable, et c'etait juste tant qu'un tour ne pouvait venir que d'une
   * pioche. Le tour relu casse cette propriete : sans le tri du demarrage, un
   * lot retire entre deux soirees fait lever l'application au premier geste.
   * Ci-dessous, le tour entre dans l'etat SANS passer par `etatRepris`, ce qui
   * est exactement ce que faisait le cablage avant cette phase.
   */
  it("sans lui, un tour relu sur une carte disparue fait lever au premier geste", () => {
    const contourne: EtatPartie = {
      tour: etatQuestion(ENTREE_DE_PHASE),
      historique: {},
      paquets: PAQUETS,
      signalements: [],
      epuise: false,
    };
    const reveler: Geste = { type: "reveler" };

    expect(() =>
      avancer(CORPUS_SANS_LA_CARTE, contourne, {
        geste: reveler,
        maintenant: ENTREE_DE_PHASE + VERROU_MS,
        tirage: 0,
      }),
    ).toThrow(/introuvable/);
  });

  it("avec lui, le meme tour rouvre au repos sans rien faire lever", () => {
    const etat = repris(etatQuestion(ENTREE_DE_PHASE), CORPUS_SANS_LA_CARTE);
    const piocher: Geste = { type: "piocher" };

    expect(etat.tour.phase).toBe("REPOS");
    expect(() =>
      avancer(CORPUS_SANS_LA_CARTE, etat, {
        geste: piocher,
        maintenant: ENTREE_DE_PHASE + VERROU_MS,
        tirage: 0,
      }),
    ).not.toThrow();
  });
});

describe("La coherence de la reprise avec l'historique", () => {
  /*
   * LE RAISONNEMENT QUI REND TOUTE LA PHASE JUSTE, et celui que quelqu'un
   * defera un jour en croyant economiser une question.
   *
   * Le niveau se consomme des `choisir(n)`, a l'entree en QUESTION, jamais a la
   * fin du tour (architecture.md section 6). Quand le tour est ecrit en phase
   * QUESTION, la question a DEJA ete retiree du stock : reprendre affiche donc
   * une question que rien ne peut reproposer, ce qui est exactement l'etat qu'on
   * avait quitte.
   *
   * Deplacer la consommation a la fin du tour casserait cette suite : le tour
   * relu reafficherait la question, mais le niveau serait de nouveau
   * selectionnable, et la table reentendrait plus tard une question deja posee.
   */
  it("un niveau consomme avant l'interruption ne redevient pas selectionnable", () => {
    let etat: EtatPartie = etatRepris(CORPUS, VIDE);
    let horloge = ENTREE_DE_PHASE;
    const jouer = (geste: Geste) => {
      horloge += VERROU_MS;
      etat = avancer(CORPUS, etat, { geste, maintenant: horloge, tirage: 0 });
    };

    jouer({ type: "piocher" });
    jouer({ type: "annoncer" });
    jouer({ type: "choisir", niveau: NIVEAU_CHOISI });
    expect(etat.tour.phase).toBe("QUESTION");

    // L'interruption : seul ce que le stockage porte survit.
    const apres = etatRepris(CORPUS, {
      tour: etat.tour,
      historique: etat.historique,
      signalements: etat.signalements,
      paquets: etat.paquets,
    });
    expect(apres.tour.phase).toBe("QUESTION");

    // La soiree se poursuit, et la carte revient : le niveau doit etre brule.
    etat = apres;
    jouer({ type: "reveler" });
    jouer({ type: "suivante" });
    jouer({ type: "annoncer" });

    const consommes: readonly Niveau[] = etat.tour.phase === "NIVEAU" ? etat.tour.consommes : [];
    expect(consommes).toContain(NIVEAU_CHOISI);
  });
});

describe("Ce que la reprise transporte sans y toucher", () => {
  const SIGNALEMENT: Signalement = {
    carte: RESUME.id,
    niveau: NIVEAU_CHOISI,
    theme: RESUME.theme,
    q: "Énoncé signalé",
  };

  it("rend l'historique, les signalements et les paquets tels qu'ils arrivent", () => {
    const enregistre: EtatEnregistre = {
      tour: null,
      historique: { [RESUME.id]: [1, 2, 3] },
      signalements: [SIGNALEMENT],
      paquets: [],
    };
    const etat = etatRepris(CORPUS, enregistre);

    expect(etat.historique).toEqual(enregistre.historique);
    expect(etat.signalements).toEqual(enregistre.signalements);
    /*
     * Une liste de paquets VIDE est reprise telle quelle et non corrigee : c'est
     * l'etat "aucun paquet coche", que l'accueil sait afficher, PIOCHER
     * desactive et raison donnee (recette.md section 1). La remplir d'office
     * recocherait sous le nez du narrateur ce qu'il vient de decocher.
     */
    expect(etat.paquets).toEqual([]);
  });
});
