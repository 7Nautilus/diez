/*
 * Diez : le contrat de composition, rejoue.
 *
 * POURQUOI CETTE SUITE EXISTE ALORS QUE LES TESTS SONT RESERVES A domain/ ET
 * tools/ (conventions-code.md section 9). Parce que l'invariant le plus
 * delicat du projet ne peut etre tenu par aucun des deux. Le niveau se
 * consomme SUR CHOISIR, a l'entree en QUESTION, jamais a la fin du tour
 * (architecture.md section 6) ; or `reduire` ne recoit ni ne rend d'Historique
 * et `consommer` vit dans paquet.ts. Le domaine n'en prouve donc que la
 * moitie, celle que sa signature lui impose : n'ayant aucun acces a
 * l'historique, il ne peut rien consommer. L'autre moitie, "sur choisir et
 * seulement la", vit dans src/app/partie.ts et se verifie en rejouant la
 * sequence complete, ce que ce fichier fait.
 *
 * Il n'y a pas de React ici et il ne doit pas y en avoir : `avancer` est pur,
 * l'horloge et l'aleatoire lui arrivent en valeur. Une suite qui monterait des
 * composants testerait le rendu, pas le contrat.
 */

import { carteDeTest } from "../../domain/__tests__/fixtures";
import { type Niveau, type PaquetId, VERROU_MS } from "../../domain/types";
import { avancer, type EtatPartie, etatInitial, type Geste, rangDansLeCorpus } from "../partie";

/*
 * Deux cartes : `suivante` ne se prouve qu'en changeant de carte, et avec une
 * seule le tirage rendrait la meme et masquerait une reconduction.
 */
const PREMIERE = "carte-a";
const SECONDE = "carte-b";
const CORPUS = [carteDeTest(PREMIERE), carteDeTest(SECONDE)];
const PAQUETS: readonly PaquetId[] = ["general"];

/*
 * Le tirage est FIXE a zero, donc le premier element du meilleur palier. La
 * pioche devient ainsi deterministe : carte-a d'abord, les deux etant
 * inedites, puis carte-b une fois la premiere entamee (domain/paquet.ts,
 * priorite aux cartes jamais sorties).
 */
const TIRAGE = 0;

/* Le pas d'horloge laisse passer chaque geste : le verrou rejette en dessous
   de VERROU_MS, pas a la valeur exacte. */
const PAS = VERROU_MS;
const OUVERTURE = 10_000;

const NIVEAU_JOUE: Niveau = 4;
const AUTRE_NIVEAU: Niveau = 7;

/*
 * Les deux textes que `carteDeTest` met dans chaque question, cherches par
 * sous-chaine dans l'etat serialise. Nommes plutot que recopies a cinq
 * endroits : le jour ou la fixture change de formulation, un `not.toContain`
 * qui ne trouve plus rien passe au vert sans plus rien prouver, et il faut
 * alors qu'une seule ligne le corrige. Les deux controles positifs plus bas
 * sont ce qui rend cette derive visible.
 *
 * Ils ne viennent pas de `fixtures.ts`, qui nomme ses propres sentinelles pour
 * les suites du domaine : ce sont deux valeurs differentes et les confondre
 * sous un meme nom rendrait les deux suites illisibles ensemble.
 */
const MOTIF_ENONCE = "Énoncé de niveau";
const MOTIF_REPONSE = "Réponse de niveau";

function rejouer(gestes: readonly Geste[]): EtatPartie {
  let etat = etatInitial(PAQUETS);
  let horloge = OUVERTURE;
  for (const geste of gestes) {
    horloge += PAS;
    etat = avancer(CORPUS, etat, { geste, maintenant: horloge, tirage: TIRAGE });
  }
  return etat;
}

const PIOCHER: Geste = { type: "piocher" };
const ANNONCER: Geste = { type: "annoncer" };
const CHOISIR: Geste = { type: "choisir", niveau: NIVEAU_JOUE };
const REVELER: Geste = { type: "reveler" };
const SUIVANTE: Geste = { type: "suivante" };

describe("Le moment ou un niveau est consomme", () => {
  it("ne consomme rien tant que le niveau n'est pas choisi", () => {
    const etat = rejouer([PIOCHER, ANNONCER]);
    expect(etat.tour.phase).toBe("NIVEAU");
    expect(etat.historique).toEqual({});
  });

  it("consomme sur choisir, a l'entree en QUESTION", () => {
    const etat = rejouer([PIOCHER, ANNONCER, CHOISIR]);
    expect(etat.tour.phase).toBe("QUESTION");
    expect(etat.historique[PREMIERE]).toEqual([NIVEAU_JOUE]);
  });

  /*
   * Le controle qui compte vraiment. Consommer a la fin du tour laisserait la
   * question rejouable si l'application meurt entre-temps, donc quelqu'un
   * pourrait reentendre une question que la table a deja entendue.
   */
  it("ne consomme rien de plus a la revelation ni a la carte suivante", () => {
    const etat = rejouer([PIOCHER, ANNONCER, CHOISIR, REVELER, SUIVANTE]);
    expect(etat.tour.phase).toBe("THEME");
    expect(etat.historique[PREMIERE]).toEqual([NIVEAU_JOUE]);
    expect(etat.historique[SECONDE]).toBeUndefined();
  });

  it("consomme une seule fois par tour, meme sur deux tours de suite", () => {
    const etat = rejouer([
      PIOCHER,
      ANNONCER,
      CHOISIR,
      REVELER,
      SUIVANTE,
      ANNONCER,
      { type: "choisir", niveau: AUTRE_NIVEAU },
    ]);
    expect(etat.historique[PREMIERE]).toEqual([NIVEAU_JOUE]);
    expect(etat.historique[SECONDE]).toEqual([AUTRE_NIVEAU]);
  });

  /*
   * Sans ce controle, un tremblement de pouce brulerait un niveau que personne
   * n'a vu : le reducteur rejette la transition, et l'appelant pourrait
   * consommer quand meme.
   */
  it("ne consomme rien quand le verrou rejette le choix", () => {
    let etat = rejouer([PIOCHER, ANNONCER]);
    const entree = etat.tour.phase === "NIVEAU" ? etat.tour.depuis : 0;
    etat = avancer(CORPUS, etat, {
      geste: CHOISIR,
      maintenant: entree + VERROU_MS - 1,
      tirage: TIRAGE,
    });
    expect(etat.tour.phase).toBe("NIVEAU");
    expect(etat.historique).toEqual({});
  });
});

/*
 * CES CONTROLES SERIALISENT L'ETAT ENTIER, ET NON SON SEUL CHAMP `tour`.
 *
 * Ils ne lisaient que `etat.tour`, ce qui reposait sur une garantie que le
 * typage ne donne pas. `ResumeCarte` et `EnonceQuestion` refusent une `Carte`
 * entiere a la compilation par leurs champs a `never` (domain/types.ts), donc
 * le TOUR est protege ; `EtatPartie` n'a aucun champ de cette sorte et rien
 * n'empeche un champ de plus d'entrer dans l'etat A COTE du tour.
 *
 * Mesure faite avant correctif, sur un champ `carteCourante?: Carte` renseigne
 * a la pioche : `tsc`, Biome et les 245 tests restaient verts. En phase THEME,
 * `etat.tour` faisait alors 103 octets sans une seule reponse, et `etat` 1229
 * octets avec LES DIX. Ce n'etait pas une fuite, c'etait la porte par laquelle
 * elle serait entree sans que rien ne l'annonce : `etat` est l'objet que React
 * tient et que la distribution aux ecrans parcourt.
 */
describe("P3 au niveau de la composition", () => {
  /*
   * La phase la plus exposee, et celle qu'aucun controle ne couvrait : c'est la
   * pioche qui tient la carte complete, donc le seul geste de la sequence a
   * partir duquel une carte entiere peut se retrouver dans l'etat.
   */
  it("ne met ni enonce ni reponse dans l'etat des la pioche", () => {
    const etat = rejouer([PIOCHER]);
    expect(etat.tour.phase).toBe("THEME");
    expect(JSON.stringify(etat)).not.toContain(MOTIF_ENONCE);
    expect(JSON.stringify(etat)).not.toContain(MOTIF_REPONSE);
  });

  it("ne met aucun enonce dans l'etat avant la phase QUESTION", () => {
    const etat = rejouer([PIOCHER, ANNONCER]);
    expect(etat.tour.phase).toBe("NIVEAU");
    expect(JSON.stringify(etat)).not.toContain(MOTIF_ENONCE);
  });

  /*
   * L'invariant le plus important du projet : le narrateur lit a voix haute en
   * fixant son ecran.
   */
  it("ne met aucune reponse dans l'etat avant la phase REPONSE", () => {
    const etat = rejouer([PIOCHER, ANNONCER, CHOISIR]);
    expect(etat.tour.phase).toBe("QUESTION");
    expect(JSON.stringify(etat)).not.toContain(MOTIF_REPONSE);
  });

  /*
   * LES DEUX CONTROLES POSITIFS. Sans eux, les trois precedents passeraient
   * aussi bien sur une fixture devenue muette : un `not.toContain` qui cherche
   * un texte que plus personne n'ecrit ne refuse plus rien. Ils portent sur
   * `etat.tour` et non sur l'etat entier, parce que ce qu'ils prouvent est plus
   * fort : l'enonce et la reponse arrivent LA OU la phase les attend.
   */
  it("l'enonce arrive dans le tour avec le choix du niveau, et pas avant", () => {
    const etat = rejouer([PIOCHER, ANNONCER, CHOISIR]);
    expect(JSON.stringify(etat.tour)).toContain(MOTIF_ENONCE);
  });

  it("la reponse arrive dans le tour avec la revelation, et pas avant", () => {
    const etat = rejouer([PIOCHER, ANNONCER, CHOISIR, REVELER]);
    expect(etat.tour.phase).toBe("REPONSE");
    expect(JSON.stringify(etat.tour)).toContain(MOTIF_REPONSE);
  });
});

describe("Le verrou protege la phase, pas seulement les transitions", () => {
  it("rejette un signalement arrive trop tot", () => {
    let etat = rejouer([PIOCHER, ANNONCER, CHOISIR, REVELER]);
    const entree = etat.tour.phase === "REPONSE" ? etat.tour.depuis : 0;
    etat = avancer(CORPUS, etat, {
      geste: { type: "signaler" },
      maintenant: entree + VERROU_MS - 1,
      tirage: TIRAGE,
    });
    expect(etat.signalements).toEqual([]);
  });

  it("accepte un signalement passe le delai, et ne le compte qu'une fois", () => {
    const etat = rejouer([
      PIOCHER,
      ANNONCER,
      CHOISIR,
      REVELER,
      { type: "signaler" },
      { type: "signaler" },
    ]);
    expect(etat.signalements).toHaveLength(1);
    expect(etat.signalements[0]?.carte).toBe(PREMIERE);
    expect(etat.signalements[0]?.niveau).toBe(NIVEAU_JOUE);
  });
});

describe("L'epuisement", () => {
  it("ne plante pas et se signale quand il n'y a rien a piocher", () => {
    const etat = rejouer([{ type: "basculerPaquet", paquet: "general" }, PIOCHER]);
    expect(etat.tour.phase).toBe("REPOS");
    expect(etat.epuise).toBe(true);
  });

  it("repart apres une reinitialisation", () => {
    const etat = rejouer([
      { type: "basculerPaquet", paquet: "general" },
      PIOCHER,
      { type: "basculerPaquet", paquet: "general" },
      PIOCHER,
    ]);
    expect(etat.tour.phase).toBe("THEME");
    expect(etat.epuise).toBe(false);
  });
});

/*
 * Le rang affiche par la phase THEME. Ce qu'il faut prouver n'est pas qu'il se
 * calcule, mais qu'il ne bouge pas : un numero qui change d'une soiree a
 * l'autre ne designe plus rien.
 */
describe("Le rang de carte", () => {
  it("numerote a partir de 1, dans l'ordre du corpus", () => {
    expect(rangDansLeCorpus(CORPUS, PREMIERE)).toBe(1);
    expect(rangDansLeCorpus(CORPUS, SECONDE)).toBe(2);
  });

  it("suit la position dans le corpus, jamais l'identifiant", () => {
    /*
     * LE DEFAUT QUE CETTE SUITE EXISTE POUR RETENIR. Le rang se derivait du
     * suffixe de l'identifiant, et affichait `CARTE 001` sur toutes les cartes,
     * les identifiants du corpus etant suffixes PAR SUJET. Un corpus range a
     * l'envers de l'ordre alphabetique rend la difference visible : une lecture
     * de l'identifiant, sous n'importe quelle forme, rendrait ici l'inverse.
     */
    const aRebours = [carteDeTest("zeta-001"), carteDeTest("alpha-001")];
    expect(rangDansLeCorpus(aRebours, "zeta-001")).toBe(1);
    expect(rangDansLeCorpus(aRebours, "alpha-001")).toBe(2);
  });

  it("ne bouge pas quand la partie avance", () => {
    const avant = rangDansLeCorpus(CORPUS, PREMIERE);
    const etat = rejouer([PIOCHER, ANNONCER, CHOISIR, REVELER, SUIVANTE]);
    // La sequence a consomme un niveau et change de carte : si le rang
    // dependait de l'etat de la partie plutot que du corpus, il aurait bouge.
    expect(etat.historique[PREMIERE]).toHaveLength(1);
    expect(rangDansLeCorpus(CORPUS, PREMIERE)).toBe(avant);
  });

  it("leve sur une carte etrangere au corpus, plutot que de rendre un numero faux", () => {
    // Un numero de repli designerait une AUTRE carte du corpus, ce qui est pire
    // qu'un ecran qui s'arrete : c'est le meme arbitrage que `carteDuCorpus`.
    expect(() => rangDansLeCorpus(CORPUS, "carte-absente")).toThrow(/introuvable/);
  });
});
