/*
 * Diez : le compilateur de contenu tient-il la porte ?
 *
 * Le corpus compile est declare `readonly Carte[]` par
 * src/data/cartes.gen.d.ts, et rien dans TypeScript ne le prouve : c'est
 * tools/compiler.ts qui rend cette declaration vraie, en refusant d'ecrire le
 * fichier des qu'une carte s'ecarte de la forme attendue. Ce sont donc ces
 * refus qu'il faut eprouver, un par un, sans quoi la declaration serait une
 * assertion deguisee.
 *
 * Les sondes sont construites en memoire et passees a `compilerCorpus`, qui ne
 * touche pas au disque. Le dernier test, lui, lit le corpus reel : une regle
 * qui refuserait tout satisferait tous les autres.
 */

import { join } from "node:path";
import { NIVEAUX } from "../src/domain/types";
import { compilerCorpus, lireLots, SEUIL_PRODUCTION } from "./compiler";

type Brut = Record<string, unknown>;

function questionsCompletes(): readonly Brut[] {
  return NIVEAUX.map((niveau) => ({ niveau, q: `Question de niveau ${niveau} ?`, r: "Reponse" }));
}

function carteSaine(rang: number, surcharge: Brut = {}): Brut {
  return {
    id: `sonde-${rang}`,
    theme: `Sonde ${rang}`,
    paquet: "general",
    domaine: "_test",
    source: "manuel",
    valide: true,
    questions: questionsCompletes(),
    ...surcharge,
  };
}

/** Le nombre exact de cartes saines qu'il faut pour franchir le seuil. */
function corpusAuSeuil(): Brut[] {
  return Array.from({ length: SEUIL_PRODUCTION }, (_, index) => carteSaine(index + 1));
}

function lots(cartes: readonly Brut[]) {
  return [
    {
      chemin: join(process.cwd(), "content", "cartes", "sonde", "lot-sonde.json"),
      brut: { lot: "sonde", cartes },
    },
  ];
}

describe("Le compilateur de contenu", () => {
  it("produit un corpus des que le seuil de cinq cartes est atteint", () => {
    const rapport = compilerCorpus(lots(corpusAuSeuil()));

    expect(rapport.fautes).toEqual([]);
    expect(rapport.cartes).toHaveLength(SEUIL_PRODUCTION);
    expect(rapport.questions).toBe(SEUIL_PRODUCTION * NIVEAUX.length);
  });

  it("refuse de produire en dessous du seuil, plutot que de livrer une soiree courte", () => {
    const rapport = compilerCorpus(lots(corpusAuSeuil().slice(0, SEUIL_PRODUCTION - 1)));

    expect(rapport.fautes.length).toBeGreaterThan(0);
  });

  it("une carte non relue n'atteint pas le corpus compile", () => {
    const rapport = compilerCorpus(lots([...corpusAuSeuil(), carteSaine(6, { valide: false })]));

    expect(rapport.fautes).toEqual([]);
    expect(rapport.cartes).toHaveLength(SEUIL_PRODUCTION);
    expect(rapport.ecarteesNonRelues).toBe(1);
    expect(rapport.cartes.map((carte) => carte.id)).not.toContain("sonde-6");
  });

  it("une carte du paquet de fixtures n'atteint pas le corpus compile", () => {
    const fixture = carteSaine(6, { paquet: "_fixtures" });
    const rapport = compilerCorpus(lots([...corpusAuSeuil(), fixture]));

    expect(rapport.fautes).toEqual([]);
    expect(rapport.cartes).toHaveLength(SEUIL_PRODUCTION);
    expect(rapport.ecarteesFixtures).toBe(1);
  });

  it("un identifiant absent arrete la compilation", () => {
    const anonyme = carteSaine(6);
    delete anonyme.id;
    const rapport = compilerCorpus(lots([...corpusAuSeuil(), anonyme]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain("identifiant absent");
  });

  it("un identifiant duplique arrete la compilation, parce que l'historique le reference", () => {
    const rapport = compilerCorpus(lots([...corpusAuSeuil(), carteSaine(1)]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain("identifiant deja porte");
  });

  /*
   * L'unicite se compte sur tout ce qui est lu, et pas seulement sur ce qui
   * est produit : une fixture exclue de la soiree occupe quand meme son
   * identifiant dans l'historique des telephones.
   */
  it("une carte ecartee occupe quand meme son identifiant", () => {
    const fixture = carteSaine(9, { id: "sonde-1", paquet: "_fixtures" });
    const rapport = compilerCorpus(lots([...corpusAuSeuil(), fixture]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain("identifiant deja porte");
  });

  it("une carte de neuf questions arrete la compilation", () => {
    const amputee = carteSaine(6, { questions: questionsCompletes().slice(0, -1) });
    const rapport = compilerCorpus(lots([...corpusAuSeuil(), amputee]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain(
      `9 question(s) au lieu de ${NIVEAUX.length}`,
    );
  });

  it("un niveau porte deux fois arrete la compilation, meme si le compte est bon", () => {
    const questions = questionsCompletes().map((question, index) =>
      index === 0 ? { ...question, niveau: NIVEAUX.length } : question,
    );
    const rapport = compilerCorpus(lots([...corpusAuSeuil(), carteSaine(6, { questions })]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain("niveaux non couverts");
  });

  it("un niveau hors de l'echelle arrete la compilation", () => {
    const questions = questionsCompletes().map((question, index) =>
      index === 0 ? { ...question, niveau: 0 } : question,
    );
    const rapport = compilerCorpus(lots([...corpusAuSeuil(), carteSaine(6, { questions })]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain("niveau absent ou hors");
  });

  it("une reponse vide arrete la compilation", () => {
    const questions = questionsCompletes().map((question, index) =>
      index === 0 ? { ...question, r: "  " } : question,
    );
    const rapport = compilerCorpus(lots([...corpusAuSeuil(), carteSaine(6, { questions })]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain("reponse absente");
  });

  /*
   * domain/types.ts previent qu'un domaine ajoute au schema doit l'etre aussi
   * en TypeScript. C'est ici que l'oubli devient bruyant, au lieu de faire
   * entrer dans le corpus une valeur que l'union du domaine ne connait pas.
   */
  it("un domaine absent des types du domaine arrete la compilation", () => {
    const rapport = compilerCorpus(
      lots([...corpusAuSeuil(), carteSaine(6, { domaine: "cuisine" })]),
    );

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain("domaine inconnu");
  });

  it("un fichier illisible arrete la compilation au lieu d'etre ignore", () => {
    const rapport = compilerCorpus([
      ...lots(corpusAuSeuil()),
      { chemin: join(process.cwd(), "content", "cartes", "sonde", "casse.json"), brut: undefined },
    ]);

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain("fichier illisible");
  });

  /*
   * Le controle negatif : sans lui, un compilateur qui refuserait tout
   * satisferait chacun des tests ci-dessus.
   */
  it("le corpus reel du depot compile sans le moindre manquement", () => {
    const rapport = compilerCorpus(lireLots(join(process.cwd(), "content", "cartes")));

    expect(rapport.fautes).toEqual([]);
    expect(rapport.cartes.length).toBeGreaterThanOrEqual(SEUIL_PRODUCTION);
    expect(rapport.ecarteesFixtures).toBeGreaterThan(0);
    expect(rapport.cartes.every((carte) => carte.valide)).toBe(true);
    expect(rapport.cartes.every((carte) => carte.paquet !== "_fixtures")).toBe(true);
  });
});
