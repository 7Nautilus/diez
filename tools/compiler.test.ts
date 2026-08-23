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
 *
 * Les plafonds de longueur suivent la meme discipline avec un tour de plus.
 * Aucun de ces nombres n'est ecrit ici non plus : les sondes les demandent au
 * schema, puis fabriquent une chaine d'un caractere de trop. Un test qui
 * ecrirait 40 passerait le jour ou le schema, lui, dirait 32.
 */

import { join } from "node:path";
import { NIVEAUX } from "../src/domain/types";
import {
  compilerCorpus,
  extrairePlafonds,
  type LotLu,
  lireLots,
  lirePlafonds,
  type Plafonds,
  type Rapport,
  SEUIL_PRODUCTION,
} from "./compiler";

type Brut = Record<string, unknown>;

/** Les plafonds du depot, lus dans le schema, donc ceux de la production. */
const PLAFONDS = lirePlafonds();

function compiler(lus: readonly LotLu[]): Rapport {
  return compilerCorpus(lus, PLAFONDS);
}

/**
 * Un schema reduit a la seule ossature que `extrairePlafonds` parcourt, avec
 * des plafonds a soi.
 *
 * Ecrire ces quatre chemins ici est exactement le point du procede : c'est la
 * copie contre laquelle le compilateur est compare, et elle tombe le jour ou il
 * irait lire ailleurs. Les valeurs, elles, sont arbitraires et ne ressemblent a
 * aucun plafond du depot, pour qu'un test qui passerait par accident se voie.
 */
function schemaSonde(theme: unknown, q: unknown, r: unknown, note: unknown): unknown {
  return {
    $defs: {
      carte: { properties: { theme: { maxLength: theme } } },
      question: {
        properties: { q: { maxLength: q }, r: { maxLength: r }, note: { maxLength: note } },
      },
    },
  };
}

/** Une chaine d'exactement `longueur` points de code, sans autre propriete. */
function chaineDe(longueur: number): string {
  return "a".repeat(longueur);
}

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
    const rapport = compiler(lots(corpusAuSeuil()));

    expect(rapport.fautes).toEqual([]);
    expect(rapport.cartes).toHaveLength(SEUIL_PRODUCTION);
    expect(rapport.questions).toBe(SEUIL_PRODUCTION * NIVEAUX.length);
  });

  it("refuse de produire en dessous du seuil, plutot que de livrer une soiree courte", () => {
    const rapport = compiler(lots(corpusAuSeuil().slice(0, SEUIL_PRODUCTION - 1)));

    expect(rapport.fautes.length).toBeGreaterThan(0);
  });

  it("une carte non relue n'atteint pas le corpus compile", () => {
    const rapport = compiler(lots([...corpusAuSeuil(), carteSaine(6, { valide: false })]));

    expect(rapport.fautes).toEqual([]);
    expect(rapport.cartes).toHaveLength(SEUIL_PRODUCTION);
    expect(rapport.ecarteesNonRelues).toBe(1);
    expect(rapport.cartes.map((carte) => carte.id)).not.toContain("sonde-6");
  });

  it("une carte du paquet de fixtures n'atteint pas le corpus compile", () => {
    const fixture = carteSaine(6, { paquet: "_fixtures" });
    const rapport = compiler(lots([...corpusAuSeuil(), fixture]));

    expect(rapport.fautes).toEqual([]);
    expect(rapport.cartes).toHaveLength(SEUIL_PRODUCTION);
    expect(rapport.ecarteesFixtures).toBe(1);
  });

  /*
   * L'AUTRE MOITIE DU MEME PARTAGE, et sans elle le test ci-dessus serait
   * satisfait par un compilateur qui jetterait les fixtures a la poubelle. Le
   * banc de recette monte ces cartes-la, et docs/recette.md section 1 demande de
   * les parcourir niveau par niveau : ecartees du corpus publie, elles doivent
   * rester rendues a part, et rendues COMPLETES.
   */
  it("les cartes de fixture ressortent a part, hors du corpus publie", () => {
    const fixture = carteSaine(6, { paquet: "_fixtures" });
    const rapport = compiler(lots([...corpusAuSeuil(), fixture]));

    expect(rapport.fixtures.map((carte) => carte.id)).toEqual(["sonde-6"]);
    expect(rapport.fixtures[0]?.questions).toHaveLength(NIVEAUX.length);
    expect(rapport.cartes.map((carte) => carte.id)).not.toContain("sonde-6");
  });

  /*
   * Une fixture mal formee doit arreter la compilation ENTIERE, comme n'importe
   * quelle autre carte. Une carte de test qui ne se comporterait pas comme une
   * carte reelle n'eprouverait plus rien, et le banc afficherait des bornes de
   * mise en page qui ne sont pas celles du jeu.
   */
  it("une fixture mal formee arrete la compilation comme les autres", () => {
    const amputee = carteSaine(6, {
      paquet: "_fixtures",
      questions: questionsCompletes().slice(0, -1),
    });
    const rapport = compiler(lots([...corpusAuSeuil(), amputee]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain(
      `9 question(s) au lieu de ${NIVEAUX.length}`,
    );
    expect(rapport.fixtures).toEqual([]);
  });

  it("un identifiant absent arrete la compilation", () => {
    const anonyme = carteSaine(6);
    delete anonyme.id;
    const rapport = compiler(lots([...corpusAuSeuil(), anonyme]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain("identifiant absent");
  });

  it("un identifiant duplique arrete la compilation, parce que l'historique le reference", () => {
    const rapport = compiler(lots([...corpusAuSeuil(), carteSaine(1)]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain("identifiant deja porte");
  });

  /*
   * L'unicite se compte sur tout ce qui est lu, et pas seulement sur ce qui
   * est produit : une fixture exclue de la soiree occupe quand meme son
   * identifiant dans l'historique des telephones.
   */
  it("une carte ecartee occupe quand meme son identifiant", () => {
    const fixture = carteSaine(9, { id: "sonde-1", paquet: "_fixtures" });
    const rapport = compiler(lots([...corpusAuSeuil(), fixture]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain("identifiant deja porte");
  });

  it("une carte de neuf questions arrete la compilation", () => {
    const amputee = carteSaine(6, { questions: questionsCompletes().slice(0, -1) });
    const rapport = compiler(lots([...corpusAuSeuil(), amputee]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain(
      `9 question(s) au lieu de ${NIVEAUX.length}`,
    );
  });

  it("un niveau porte deux fois arrete la compilation, meme si le compte est bon", () => {
    const questions = questionsCompletes().map((question, index) =>
      index === 0 ? { ...question, niveau: NIVEAUX.length } : question,
    );
    const rapport = compiler(lots([...corpusAuSeuil(), carteSaine(6, { questions })]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain("niveaux non couverts");
  });

  it("un niveau hors de l'echelle arrete la compilation", () => {
    const questions = questionsCompletes().map((question, index) =>
      index === 0 ? { ...question, niveau: 0 } : question,
    );
    const rapport = compiler(lots([...corpusAuSeuil(), carteSaine(6, { questions })]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain("niveau absent ou hors");
  });

  it("une reponse vide arrete la compilation", () => {
    const questions = questionsCompletes().map((question, index) =>
      index === 0 ? { ...question, r: "  " } : question,
    );
    const rapport = compiler(lots([...corpusAuSeuil(), carteSaine(6, { questions })]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain("reponse absente");
  });

  /*
   * domain/types.ts previent qu'un domaine ajoute au schema doit l'etre aussi
   * en TypeScript. C'est ici que l'oubli devient bruyant, au lieu de faire
   * entrer dans le corpus une valeur que l'union du domaine ne connait pas.
   */
  it("un domaine absent des types du domaine arrete la compilation", () => {
    const rapport = compiler(lots([...corpusAuSeuil(), carteSaine(6, { domaine: "cuisine" })]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain("domaine inconnu");
  });

  it("un fichier illisible arrete la compilation au lieu d'etre ignore", () => {
    const rapport = compiler([
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
    const rapport = compiler(lireLots(join(process.cwd(), "content", "cartes")));

    expect(rapport.fautes).toEqual([]);
    expect(rapport.cartes.length).toBeGreaterThanOrEqual(SEUIL_PRODUCTION);
    expect(rapport.ecarteesFixtures).toBeGreaterThan(0);
    expect(rapport.cartes.every((carte) => carte.valide)).toBe(true);
    expect(rapport.cartes.every((carte) => carte.paquet !== "_fixtures")).toBe(true);

    /*
     * Les deux cartes que docs/recette.md section 1 nomme, et que le banc de
     * recette monte. Elles sont citees par leur identifiant : la recette designe
     * chacune par ce qu'elle eprouve, donc l'une qui disparaitrait du depot
     * rendrait une moitie de la liste inexecutable sans que rien ne le dise.
     */
    expect(rapport.fixtures.map((carte) => carte.id)).toEqual([
      "_fixture-limites-001",
      "_fixture-minimal-001",
    ]);
  });
});

/*
 * Diez : le schema est-il execute, ou seulement cite ?
 *
 * Avant, il etait cite par neuf fichiers et execute par aucun : un theme de 77
 * caracteres et une reponse de 112 traversaient compilation, verifications,
 * lint, tests et build, et arrivaient dans le bundle publie. Or une reponse de
 * 60 caracteres remplit deja cinq lignes en display sur un ecran de 320 px
 * (voir l'en-tete de src/screens/Reponse.tsx) : a 112, il n'y a plus d'ecran.
 *
 * Ce bloc eprouve les deux moities de la correction, et il faut les deux. Que
 * le compilateur LISE les plafonds au bon endroit du schema, et qu'il REFUSE ce
 * qui les depasse. La premiere sans la seconde ne garde rien ; la seconde sans
 * la premiere reviendrait a recopier 40, 140, 60 et 160 dans le compilateur,
 * c'est-a-dire a perdre la source unique que le schema doit rester.
 */
describe("Les plafonds de longueur, lus dans le schema", () => {
  /*
   * La lecture d'abord, parce que tout le reste en depend : si elle rendait des
   * nombres inventes, chacune des sondes ci-dessous fabriquerait sa chaine a
   * partir du nombre invente et passerait au vert sans rien garder.
   *
   * Le pin le plus fort n'est pas ici mais en tete de fichier : `lirePlafonds()`
   * y est appele au chargement du module et LEVE si un chemin du schema a bouge,
   * donc une cle renommee ne laisse pas un test passer, elle empeche la suite
   * entiere de se charger.
   */
  it("chaque plafond est lu la ou le schema le declare, et pas ailleurs", () => {
    expect(extrairePlafonds(schemaSonde(11, 22, 33, 44))).toEqual({
      theme: 11,
      q: 22,
      r: 33,
      note: 44,
    });
  });

  it("un plafond absent du schema arrete tout, au lieu d'ouvrir la porte en silence", () => {
    expect(() => extrairePlafonds(schemaSonde(undefined, 22, 33, 44))).toThrow(
      "$defs.carte.properties.theme.maxLength",
    );
  });

  it("un plafond qui n'est pas un entier positif arrete tout de la meme facon", () => {
    expect(() => extrairePlafonds(schemaSonde(11, "140", 33, 44))).toThrow(
      "$defs.question.properties.q.maxLength",
    );
    expect(() => extrairePlafonds(schemaSonde(11, 22, 0, 44))).toThrow(
      "$defs.question.properties.r.maxLength",
    );
  });

  /*
   * Quatre chemins voisins de cinq segments chacun : deux copies-collees l'une
   * sur l'autre se liraient sans peine et ne casseraient aucune sonde ci-dessus.
   * L'ordre du modele les separe. Un theme tient a l'ecran en display donc c'est
   * le plus court, une reponse est plus courte qu'un enonce puisqu'elle doit
   * etre indiscutable, et la note d'arbitrage est le plus long des quatre.
   */
  it("les quatre plafonds du depot ne sont pas interchanges", () => {
    expect(PLAFONDS.theme).toBeLessThan(PLAFONDS.r);
    expect(PLAFONDS.r).toBeLessThan(PLAFONDS.q);
    expect(PLAFONDS.q).toBeLessThan(PLAFONDS.note);
  });

  it("un theme d'un caractere de trop arrete la compilation", () => {
    const trop = carteSaine(6, { theme: chaineDe(PLAFONDS.theme + 1) });
    const rapport = compiler(lots([...corpusAuSeuil(), trop]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain(
      `theme de ${PLAFONDS.theme + 1} caracteres pour un plafond de ${PLAFONDS.theme}`,
    );
    expect(rapport.cartes.map((carte) => carte.id)).not.toContain("sonde-6");
  });

  it("un enonce d'un caractere de trop arrete la compilation", () => {
    const questions = questionsCompletes().map((question, index) =>
      index === 0 ? { ...question, q: chaineDe(PLAFONDS.q + 1) } : question,
    );
    const rapport = compiler(lots([...corpusAuSeuil(), carteSaine(6, { questions })]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain(
      `enonce de ${PLAFONDS.q + 1} caracteres pour un plafond de ${PLAFONDS.q}`,
    );
  });

  it("une reponse d'un caractere de trop arrete la compilation", () => {
    const questions = questionsCompletes().map((question, index) =>
      index === 0 ? { ...question, r: chaineDe(PLAFONDS.r + 1) } : question,
    );
    const rapport = compiler(lots([...corpusAuSeuil(), carteSaine(6, { questions })]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain(
      `reponse de ${PLAFONDS.r + 1} caracteres pour un plafond de ${PLAFONDS.r}`,
    );
  });

  it("une note d'arbitrage d'un caractere de trop arrete la compilation", () => {
    const questions = questionsCompletes().map((question, index) =>
      index === 0 ? { ...question, note: chaineDe(PLAFONDS.note + 1) } : question,
    );
    const rapport = compiler(lots([...corpusAuSeuil(), carteSaine(6, { questions })]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain(
      `note d'arbitrage de ${PLAFONDS.note + 1} caracteres pour un plafond de ${PLAFONDS.note}`,
    );
  });

  /*
   * La borne est INCLUSIVE, et ce n'est pas un detail de plus : la carte
   * `_fixture-limites-001` du depot porte un theme de 40, un enonce de 140 et
   * une reponse de 60, c'est-a-dire exactement les plafonds. Un controle a `<`
   * au lieu de `<=` refuserait le jeu de fixtures que la recette exige, et
   * l'aurait fait remonter par le mauvais bout.
   */
  it("une chaine exactement au plafond passe, la borne etant inclusive", () => {
    const juste = carteSaine(6, {
      theme: chaineDe(PLAFONDS.theme),
      questions: questionsCompletes().map((question, index) =>
        index === 0
          ? {
              ...question,
              q: chaineDe(PLAFONDS.q),
              r: chaineDe(PLAFONDS.r),
              note: chaineDe(PLAFONDS.note),
            }
          : question,
      ),
    });

    expect(compiler(lots([...corpusAuSeuil(), juste])).fautes).toEqual([]);
  });

  /*
   * LE CONTROLE QUI PROUVE LE CABLAGE, et sans lui tout le bloc serait une
   * tautologie : chaque sonde ci-dessus construit sa chaine a partir du plafond
   * qu'elle passe, donc un compilateur comparant a n'importe quel autre nombre
   * pourrait encore les satisfaire. Ici c'est la MEME carte qui est compilee
   * deux fois, avec les plafonds du depot puis avec un seul d'entre eux
   * resserre d'un cran : elle doit passer la premiere fois et tomber la
   * seconde. C'est ce qui montre que le nombre du schema, et lui seul, decide.
   */
  it("le verdict suit le plafond recu, et non un nombre grave dans le compilateur", () => {
    const carte = carteSaine(6, { theme: chaineDe(PLAFONDS.theme) });
    const sondes = lots([...corpusAuSeuil(), carte]);

    expect(compilerCorpus(sondes, PLAFONDS).fautes).toEqual([]);

    const resserres: Plafonds = { ...PLAFONDS, theme: PLAFONDS.theme - 1 };
    const rapport = compilerCorpus(sondes, resserres);

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain(
      `theme de ${PLAFONDS.theme} caracteres pour un plafond de ${PLAFONDS.theme - 1}`,
    );
  });

  /*
   * La faute nomme le fichier a rouvrir. Sans ce renvoi, quelqu'un corrigerait
   * le nombre dans le compilateur, ou il n'est pas, au lieu du schema, ou il
   * est.
   */
  it("la faute renvoie au schema, seul endroit ou le nombre s'ecrit", () => {
    const trop = carteSaine(6, { theme: chaineDe(PLAFONDS.theme + 1) });
    const rapport = compiler(lots([...corpusAuSeuil(), trop]));

    expect(rapport.fautes.map((faute) => faute.quoi).join(" ")).toContain(
      "content/schema/lot.schema.json",
    );
  });
});
