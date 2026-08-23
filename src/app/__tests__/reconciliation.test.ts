/*
 * Diez : deux documents de la meme origine, rejoues sans navigateur.
 *
 * POURQUOI CETTE SUITE. Chaque document lisait les quatre clefs une fois a
 * l'amorcage et les reecrivait ensuite depuis sa memoire, sans jamais ecouter
 * ce que l'autre ecrivait. Sequence mesuree au navigateur, deux onglets ouverts
 * sur la meme application, avant correctif :
 *
 *   A joue la carte 009 niveau 1  base historique {"seconde-guerre-mondiale-001":[1]}
 *   B tire la meme carte          ses dix crans affiches "libre"
 *   B choisit le niveau 1         B pose LA MEME QUESTION MOT POUR MOT
 *   B revele                      le tour de A est remplace en base
 *   B signale                     le signalement de A a disparu de la base
 *
 * Le cout est exactement ce que le projet tient pour cassant la partie : une
 * question reentendue (architecture.md section 6).
 *
 * CE QUE CETTE SUITE PROUVE, ET CE QU'ELLE NE PEUT PAS PROUVER. Elle rejoue la
 * REGLE de fusion, qui est pure. Que l'evenement du navigateur arrive bien
 * jusqu'a elle est prouve ailleurs, par `storage/voisinage.test.ts` : les deux
 * moities sont separees parce que `storage/` n'importe rien et ne sait donc
 * rien d'un historique de jeu.
 */

import { carteDeTest } from "../../domain/__tests__/fixtures";
import type { EtatTour, Historique, Niveau, PaquetId } from "../../domain/types";
import {
  appliquer,
  type EtatPartie,
  etatInitial,
  fusionnerHistorique,
  fusionnerSignalements,
  reconcilier,
  type Signalement,
  tourAJour,
} from "../partie";

const CARTE = "carte-a";
const AUTRE_CARTE = "carte-b";
const CORPUS = [carteDeTest(CARTE), carteDeTest(AUTRE_CARTE)];
const PAQUETS: readonly PaquetId[] = ["general"];

const JOUE: Niveau = 1;
const AUTRE_JOUE: Niveau = 4;
const ENTREE_DE_PHASE = 1_000;

function signalementDeTest(carte: string, niveau: Niveau): Signalement {
  return { carte, niveau, theme: `Thème de ${carte}`, q: `Énoncé ${niveau} sur ${carte} ?` };
}

/* --- 1. L'historique : union, parce qu'une question reposee casse la partie */

describe("la fusion des historiques", () => {
  it("garde ce que le voisin a consomme, sur une carte que nous ignorions", () => {
    const fusionne = fusionnerHistorique({}, { [CARTE]: [JOUE] });
    expect(fusionne).toEqual({ [CARTE]: [JOUE] });
  });

  it("garde ce que NOUS avons consomme, absent chez le voisin", () => {
    const local: Historique = { [CARTE]: [JOUE] };
    const fusionne = fusionnerHistorique(local, { [AUTRE_CARTE]: [AUTRE_JOUE] });
    expect(fusionne).toEqual({ [CARTE]: [JOUE], [AUTRE_CARTE]: [AUTRE_JOUE] });
  });

  it("reunit deux niveaux joues sur la MEME carte", () => {
    const fusionne = fusionnerHistorique({ [CARTE]: [JOUE] }, { [CARTE]: [AUTRE_JOUE] });
    expect(fusionne).toEqual({ [CARTE]: [JOUE, AUTRE_JOUE] });
  });

  it("ne dedouble pas un niveau que les deux connaissent", () => {
    const fusionne = fusionnerHistorique({ [CARTE]: [JOUE] }, { [CARTE]: [JOUE] });
    expect(fusionne).toEqual({ [CARTE]: [JOUE] });
  });

  /*
   * L'identite conservee n'est pas une optimisation : l'ecriture de la clef est
   * un effet qui suit l'identite de ce champ, donc une identite neuve a chaque
   * evenement ferait rebondir les deux documents l'un sur l'autre sans fin.
   */
  it("rend l'objet local LUI-MEME quand le voisin n'apporte rien", () => {
    const local: Historique = { [CARTE]: [JOUE] };
    expect(fusionnerHistorique(local, { [CARTE]: [JOUE] })).toBe(local);
  });

  /*
   * L'UNIQUE EXCEPTION A L'UNION. Un document qui s'ouvre RELIT la clef avant
   * de la reecrire : il ne peut ecrire un historique vide que si la clef
   * l'etait deja, ou si le narrateur vient de demander l'effacement. Sans cette
   * exception, une reinitialisation faite dans un document serait defaite par
   * l'autre, et l'application continuerait d'ecarter des questions que
   * personne autour de la table n'a entendues.
   */
  it("adopte un historique vide, qui ne peut etre qu'une reinitialisation", () => {
    expect(fusionnerHistorique({ [CARTE]: [JOUE] }, {})).toEqual({});
  });

  it("ne reecrit rien quand les deux historiques sont deja vides", () => {
    const local: Historique = {};
    expect(fusionnerHistorique(local, {})).toBe(local);
  });

  /*
   * DEUX DOCUMENTS CONVERGENT EN UN ECHANGE. A prend ce que B avait, puis B
   * prend ce que A vient d'ecrire, et la troisieme fusion ne change plus rien :
   * sans ce point fixe, chaque ecriture reveillerait le voisin, qui reecrirait.
   */
  it("converge : la fusion de la fusion ne bouge plus", () => {
    const chezA: Historique = { [CARTE]: [JOUE] };
    const chezB: Historique = { [CARTE]: [AUTRE_JOUE], [AUTRE_CARTE]: [JOUE] };

    const apresA = fusionnerHistorique(chezA, chezB);
    const apresB = fusionnerHistorique(chezB, apresA);
    expect(fusionnerHistorique(apresA, apresB)).toBe(apresA);
  });
});

/* --- 2. Les signalements : union, parce qu'un signalement perdu ne revient pas */

describe("la fusion des signalements", () => {
  it("prend celui du voisin que nous n'avions pas", () => {
    const local = [signalementDeTest(CARTE, JOUE)];
    const fusionne = fusionnerSignalements(local, [signalementDeTest(AUTRE_CARTE, AUTRE_JOUE)]);
    expect(fusionne).toHaveLength(2);
  });

  /*
   * LE CONTROLE QUI PORTE LA REGLE. Perdre un signalement est pire que d'en
   * garder un en double : il parle du contenu, sa destination est le depot, et
   * personne ne le reposera. Le voisin qui n'a pas le notre ne peut pas nous
   * le retirer.
   */
  it("ne perd JAMAIS le notre, meme absent chez le voisin", () => {
    const local = [signalementDeTest(CARTE, JOUE)];
    expect(fusionnerSignalements(local, [])).toEqual(local);
  });

  it("ne dedouble pas la meme question signalee des deux cotes", () => {
    const local = [signalementDeTest(CARTE, JOUE)];
    const fusionne = fusionnerSignalements(local, [signalementDeTest(CARTE, JOUE)]);
    expect(fusionne).toHaveLength(1);
  });

  it("distingue deux niveaux de la meme carte", () => {
    const local = [signalementDeTest(CARTE, JOUE)];
    const fusionne = fusionnerSignalements(local, [signalementDeTest(CARTE, AUTRE_JOUE)]);
    expect(fusionne).toHaveLength(2);
  });

  it("rend la liste locale ELLE-MEME quand le voisin n'apporte rien", () => {
    const local = [signalementDeTest(CARTE, JOUE)];
    expect(fusionnerSignalements(local, [signalementDeTest(CARTE, JOUE)])).toBe(local);
  });

  it("garde les notres en tete, pour que la liste copiee reste stable", () => {
    const local = [signalementDeTest(CARTE, JOUE)];
    const fusionne = fusionnerSignalements(local, [signalementDeTest(AUTRE_CARTE, JOUE)]);
    expect(fusionne.map((signale) => signale.carte)).toEqual([CARTE, AUTRE_CARTE]);
  });
});

/* --- 3. Le selecteur, mis a jour de ce qu'un autre document vient de bruler */

describe("la mise a jour du tour", () => {
  const enNiveau = (consommes: readonly Niveau[]): EtatTour => ({
    phase: "NIVEAU",
    carte: { id: CARTE, theme: `Thème de ${CARTE}`, paquet: "general" },
    consommes,
    depuis: ENTREE_DE_PHASE,
  });

  /*
   * LE CONTROLE QUI PORTE LE CORRECTIF DE LA SEQUENCE MESUREE. La phase NIVEAU
   * porte un INSTANTANE des niveaux consommes, pris a l'entree dans la phase :
   * le document reste sur son selecteur pendant que l'autre brule un niveau, et
   * il l'offrait encore. C'est exactement ce qu'on a vu au navigateur, dix
   * crans affiches "libre" sur une carte dont un niveau venait d'etre joue
   * ailleurs.
   */
  it("retire du selecteur un niveau brule par l'autre document", () => {
    const tour = tourAJour(enNiveau([]), { [CARTE]: [JOUE] });
    expect(tour.phase === "NIVEAU" && tour.consommes).toEqual([JOUE]);
  });

  it("n'en rend jamais un : elle ne fait qu'ajouter", () => {
    const tour = tourAJour(enNiveau([JOUE, AUTRE_JOUE]), { [CARTE]: [JOUE] });
    expect(tour.phase === "NIVEAU" && tour.consommes).toEqual([JOUE, AUTRE_JOUE]);
  });

  it("ignore ce qui concerne une autre carte", () => {
    const tour = enNiveau([]);
    expect(tourAJour(tour, { [AUTRE_CARTE]: [JOUE] })).toBe(tour);
  });

  it("rend le tour LUI-MEME quand il n'y a rien a apprendre", () => {
    const tour = enNiveau([JOUE]);
    expect(tourAJour(tour, { [CARTE]: [JOUE] })).toBe(tour);
  });

  /*
   * LES QUATRE AUTRES PHASES NE BOUGENT PAS. `consommes` n'existe qu'en phase
   * NIVEAU, et surtout : QUESTION et REPONSE sont ce que le narrateur lit a
   * voix haute. Rien de ce qu'un autre document ecrit n'a le droit d'y toucher.
   */
  it("ne touche a aucune autre phase", () => {
    const repos: EtatTour = { phase: "REPOS" };
    const question: EtatTour = {
      phase: "QUESTION",
      carte: { id: CARTE, theme: `Thème de ${CARTE}`, paquet: "general" },
      enonce: { niveau: JOUE, q: "Énoncé ?" },
      depuis: ENTREE_DE_PHASE,
    };
    expect(tourAJour(repos, { [CARTE]: [JOUE] })).toBe(repos);
    expect(tourAJour(question, { [CARTE]: [AUTRE_JOUE] })).toBe(question);
  });
});

/* --- 4. La reconciliation entiere ---------------------------------------- */

describe("la reconciliation", () => {
  const partieDeTest = (): EtatPartie => etatInitial(PAQUETS);

  it("prend l'historique et les signalements du voisin d'un seul geste", () => {
    const etat = reconcilier(partieDeTest(), {
      historique: { [CARTE]: [JOUE] },
      signalements: [signalementDeTest(CARTE, JOUE)],
    });
    expect(etat.historique).toEqual({ [CARTE]: [JOUE] });
    expect(etat.signalements).toHaveLength(1);
  });

  /*
   * Rendre l'etat LUI-MEME est ce qui empeche les deux documents de se
   * reveiller sans fin : les quatre effets d'ecriture suivent l'identite de
   * leur champ.
   */
  it("rend l'etat LUI-MEME quand il n'y a rien a prendre", () => {
    const avant = partieDeTest();
    expect(reconcilier(avant, { historique: {}, signalements: [] })).toBe(avant);
  });

  /*
   * LE TOUR N'EST JAMAIS ADOPTE, et le type le rend impossible : `NouvellesDuVoisin`
   * ne porte pas de tour. C'est le seul champ qu'un narrateur est en train de
   * LIRE A VOIX HAUTE, et un ecran qui change au milieu d'une phrase serait pire
   * que la perte qu'on evite. Le niveau ayant deja ete consomme a l'entree en
   * QUESTION, un tour perdu ne fait jamais revenir une question, il fait piocher.
   */
  it("ne remplace jamais la question que le narrateur est en train de lire", () => {
    const enQuestion: EtatPartie = {
      ...partieDeTest(),
      tour: {
        phase: "QUESTION",
        carte: { id: CARTE, theme: `Thème de ${CARTE}`, paquet: "general" },
        enonce: { niveau: JOUE, q: "Énoncé lu a voix haute ?" },
        depuis: ENTREE_DE_PHASE,
      },
    };
    const apres = reconcilier(enQuestion, {
      historique: { [AUTRE_CARTE]: [AUTRE_JOUE] },
      signalements: [],
    });
    expect(apres.tour).toBe(enQuestion.tour);
  });

  it("ne touche ni aux paquets ni au constat d'epuisement", () => {
    const avant: EtatPartie = { ...partieDeTest(), epuise: true };
    const apres = reconcilier(avant, { historique: { [CARTE]: [JOUE] }, signalements: [] });
    expect(apres.paquets).toBe(avant.paquets);
    expect(apres.epuise).toBe(true);
  });
});

/* --- 5. Les deux mouvements, par le meme reducteur ----------------------- */

describe("le point de mise a jour unique", () => {
  it("fait avancer la soiree sur un geste du narrateur", () => {
    const apres = appliquer(CORPUS, etatInitial(PAQUETS), {
      origine: "narrateur",
      commande: { geste: { type: "piocher" }, maintenant: 10_000, tirage: 0 },
    });
    expect(apres.tour.phase).toBe("THEME");
  });

  it("reconcilie sur des nouvelles du voisin, sans toucher au tour", () => {
    const avant = etatInitial(PAQUETS);
    const apres = appliquer(CORPUS, avant, {
      origine: "voisin",
      nouvelles: { historique: { [CARTE]: [JOUE] }, signalements: [] },
    });
    expect(apres.historique).toEqual({ [CARTE]: [JOUE] });
    expect(apres.tour).toBe(avant.tour);
  });

  /*
   * LA SEQUENCE MESUREE, REJOUEE ENTIEREMENT. Le document B est sur son
   * selecteur ; A brule le niveau 1 de la meme carte ; B en est prevenu et ne
   * l'offre plus. Sans cette chaine, B posait la question mot pour mot.
   */
  it("rejoue les deux onglets : le niveau brule ailleurs cesse d'etre offert", () => {
    let chezB = appliquer(CORPUS, etatInitial(PAQUETS), {
      origine: "narrateur",
      commande: { geste: { type: "piocher" }, maintenant: 10_000, tirage: 0 },
    });
    chezB = appliquer(CORPUS, chezB, {
      origine: "narrateur",
      commande: { geste: { type: "annoncer" }, maintenant: 11_000, tirage: 0 },
    });
    expect(chezB.tour.phase === "NIVEAU" && chezB.tour.consommes).toEqual([]);

    const carteEnMain = chezB.tour.phase === "NIVEAU" ? chezB.tour.carte.id : "";
    chezB = appliquer(CORPUS, chezB, {
      origine: "voisin",
      nouvelles: { historique: { [carteEnMain]: [JOUE] }, signalements: [] },
    });

    expect(chezB.tour.phase === "NIVEAU" && chezB.tour.consommes).toEqual([JOUE]);
  });
});
