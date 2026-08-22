/*
 * Diez : la pioche et l'historique.
 *
 * Ce que ce fichier protege vient d'architecture.md section 6 : l'ordre de
 * priorite du tirage, l'exclusion des cartes epuisees et des paquets eteints,
 * et le moment ou un niveau se consomme. Les invariants sont tires de la, pas
 * de src/domain/paquet.ts : un test ecrit d'apres l'implementation ne protege
 * rien, il la recopie.
 *
 * `describe`, `it` et `expect` viennent des globales de Vitest et ne sont pas
 * importes de "vitest" : la regle de dependance interdit a domain/ tout import
 * qui sort de domain/, et le lint l'applique jusque dans les tests
 * (biome.json, conventions-code.md section 3).
 */

import { cartesRestantes, consommer, niveauxConsommes, piocher, resumer } from "../paquet";
import { initial, reduire } from "../tour";
import {
  type Carte,
  type CarteId,
  type EtatTour,
  type Historique,
  NIVEAUX,
  type Niveau,
  type PaquetId,
  type Question,
  VERROU_MS,
} from "../types";
import { carteDeTest, NIVEAU_CHOISI } from "./fixtures";

/** Ce que fait l'appelant pour fabriquer un enonce ou une reponse. */
function questionDe(carte: Carte, niveau: Niveau): Question {
  const trouvee = carte.questions.find((question) => question.niveau === niveau);
  if (trouvee === undefined) {
    throw new Error(`Fixture incoherente : ${carte.id} n'a pas de niveau ${niveau}`);
  }
  return trouvee;
}

const RESOLUTION_DU_BALAYAGE = 512;

/**
 * Toutes les valeurs d'aleatoire sur lesquelles un invariant de pioche est
 * eprouve.
 *
 * Un tirage unique ne prouve rien d'une regle de priorite : le hasard peut
 * rendre la carte attendue par accident, et le test passerait encore une fois
 * la priorite retiree. Le pas est donc beaucoup plus fin que 1 / taille du
 * plus grand vivier de ce fichier, si bien qu'aucun rang du palier n'est
 * saute. La borne haute exclue de [0, 1) est ajoutee a part : c'est celle
 * qu'un decalage d'index ferait sortir du palier.
 */
const BALAYAGE: readonly number[] = [
  ...Array.from({ length: RESOLUTION_DU_BALAYAGE }, (_, rang) => rang / RESOLUTION_DU_BALAYAGE),
  1 - Number.EPSILON,
];

/**
 * Ce que `idsTires` note quand la pioche rend `null`.
 *
 * Un marqueur plutot qu'une absence : un vivier vide apparait ainsi tel quel
 * dans l'ensemble compare, au lieu de disparaitre du resultat sans rien dire.
 */
const AUCUNE_CARTE = "(aucune)";

/** L'ensemble des cartes que la pioche peut rendre, tout l'aleatoire balaye. */
function idsTires(
  corpus: readonly Carte[],
  historique: Historique,
  paquetsActifs: readonly PaquetId[],
): ReadonlySet<string> {
  return new Set(
    BALAYAGE.map((valeur) => {
      const tiree = piocher(corpus, historique, paquetsActifs, () => valeur);
      return tiree === null ? AUCUNE_CARTE : tiree.id;
    }),
  );
}

function ids(cartes: readonly Carte[]): readonly CarteId[] {
  return cartes.map((carte) => carte.id);
}

describe("L'exhaustion d'une carte", () => {
  const epuisee = carteDeTest("carte-epuisee");
  const entamee = carteDeTest("carte-entamee");
  // Les deux cartes sont entamees : la priorite aux cartes inedites ne peut
  // donc pas expliquer le resultat, seule l'exhaustion le decide.
  const historique: Historique = { "carte-epuisee": NIVEAUX, "carte-entamee": [3] };

  it("une carte dont les dix niveaux sont consommés n'est jamais tirée", () => {
    expect(idsTires([epuisee, entamee], historique, ["general"])).toEqual(
      new Set(["carte-entamee"]),
    );
  });

  it("une carte épuisée quitte le vivier, une carte à qui il reste une question y demeure", () => {
    expect(ids(cartesRestantes([epuisee, entamee], historique, ["general"]))).toEqual([
      "carte-entamee",
    ]);
  });
});

describe("La priorité du tirage", () => {
  // Les cartes entamees sont placees en tete du corpus et sont les plus
  // nombreuses : un tirage uniforme sur tout le vivier, priorite ignoree, en
  // rendrait une pour deux valeurs d'aleatoire sur trois.
  const corpus = [
    carteDeTest("entamee-1"),
    carteDeTest("entamee-2"),
    carteDeTest("entamee-3"),
    carteDeTest("entamee-4"),
    carteDeTest("inedite-1"),
    carteDeTest("inedite-2"),
  ];
  const historique: Historique = {
    "entamee-1": [1],
    "entamee-2": [2, 3],
    "entamee-3": [4, 5, 6],
    "entamee-4": [10],
  };

  it("les cartes jamais sorties passent avant les cartes entamées, pour toute valeur de l'aléatoire", () => {
    expect(idsTires(corpus, historique, ["general"])).toEqual(new Set(["inedite-1", "inedite-2"]));
  });

  it("une carte entamée redevient piochable dès qu'aucun thème n'est plus neuf", () => {
    const plusRienDInedit: Historique = {
      ...historique,
      "inedite-1": [7],
      "inedite-2": [8],
    };

    expect(idsTires(corpus, plusRienDInedit, ["general"])).toEqual(new Set(ids(corpus)));
  });

  it("chaque carte du palier est atteignable, aucune n'est hors de portée du tirage", () => {
    const inedites = [
      carteDeTest("neuve-1"),
      carteDeTest("neuve-2"),
      carteDeTest("neuve-3"),
      carteDeTest("neuve-4"),
      carteDeTest("neuve-5"),
    ];

    expect(idsTires(inedites, {}, ["general"])).toEqual(new Set(ids(inedites)));
  });

  it("à aléatoire égal, deux pioches rendent la même carte", () => {
    for (const valeur of BALAYAGE) {
      const premiere = piocher(corpus, historique, ["general"], () => valeur);
      const seconde = piocher(corpus, historique, ["general"], () => valeur);

      expect(premiere, `aleatoire = ${valeur}`).not.toBeNull();
      expect(seconde, `aleatoire = ${valeur}`).toBe(premiere);
    }
  });
});

describe("Le vivier vide", () => {
  const corpus = [carteDeTest("carte-a"), carteDeTest("carte-b")];

  it("vivier vide : la pioche rend null au lieu de lever", () => {
    const toutConsomme: Historique = { "carte-a": NIVEAUX, "carte-b": NIVEAUX };

    expect(() => piocher(corpus, toutConsomme, ["general"], () => 0)).not.toThrow();
    expect(idsTires(corpus, toutConsomme, ["general"])).toEqual(new Set([AUCUNE_CARTE]));
  });

  it("aucun paquet actif : le vivier est vide et la pioche rend null", () => {
    expect(idsTires(corpus, {}, [])).toEqual(new Set([AUCUNE_CARTE]));
    expect(cartesRestantes(corpus, {}, [])).toEqual([]);
  });
});

describe("Les paquets actifs", () => {
  const corpus = [
    carteDeTest("generale-1", "general"),
    carteDeTest("maison-1", "maison"),
    carteDeTest("fixture-1", "_fixtures"),
    carteDeTest("maison-2", "maison"),
  ];

  it("les cartes d'un paquet non actif sont exclues du vivier", () => {
    expect(idsTires(corpus, {}, ["maison"])).toEqual(new Set(["maison-1", "maison-2"]));
    expect(ids(cartesRestantes(corpus, {}, ["maison"]))).toEqual(["maison-1", "maison-2"]);
  });

  it("les cartes de tous les paquets actifs entrent dans le vivier", () => {
    expect(idsTires(corpus, {}, ["general", "_fixtures"])).toEqual(
      new Set(["generale-1", "fixture-1"]),
    );
  });
});

/** Les seules cles de `ResumeCarte` (architecture.md section 5), triees pour se
 * comparer a `Object.keys().sort()`. */
const CLES_DU_RESUME: readonly string[] = ["id", "paquet", "theme"];

describe("Le résumé d'une carte", () => {
  it("une carte réduite à son résumé n'emporte que ce que la phase THÈME peut montrer", () => {
    const carte = carteDeTest("carte-a");

    // Le seul endroit du projet ou une carte perd ses questions, donc le seul
    // verrou de P3 en amont du reducteur : tout ce qui survit ici voyage dans
    // l'etat des la phase THEME.
    //
    // Le controle porte sur l'ensemble des cles, et non sur l'absence de
    // `questions` : un resume qui rendrait `{ ...carte }` se type sans
    // broncher, TypeScript ne controlant pas les proprietes en trop d'un objet
    // construit par diffusion. Ni le compilateur ni le reste de la suite ne
    // verraient passer la fuite.
    expect(Object.keys(resumer(carte)).sort()).toEqual(CLES_DU_RESUME);
    expect(resumer(carte)).toEqual({
      id: carte.id,
      theme: carte.theme,
      paquet: carte.paquet,
    });
  });
});

describe("L'historique reçu n'est jamais muté", () => {
  it("consommer ne mute pas l'historique reçu", () => {
    const historique: Historique = { "carte-a": [2, 5], "carte-b": [7] };
    const temoin = structuredClone(historique);
    const listeDOrigine = historique["carte-a"];

    const apres = consommer(historique, "carte-a", 9);

    expect(historique).toEqual(temoin);
    // L'objet racine ne suffit pas : c'est la liste de niveaux qu'un `push`
    // maladroit modifierait, et elle est partagee avec l'appelant.
    expect(historique["carte-a"]).toBe(listeDOrigine);
    expect(historique["carte-a"]).toEqual([2, 5]);
    expect(apres).not.toBe(historique);
    expect(niveauxConsommes(apres, "carte-a")).toEqual([2, 5, 9]);
    expect(niveauxConsommes(apres, "carte-b")).toEqual([7]);
  });

  it("consommer sur une carte jamais sortie laisse les autres cartes intactes", () => {
    const historique: Historique = { "carte-a": [2] };
    const temoin = structuredClone(historique);

    const apres = consommer(historique, "carte-neuve", 1);

    expect(historique).toEqual(temoin);
    expect(niveauxConsommes(historique, "carte-neuve")).toEqual([]);
    expect(niveauxConsommes(apres, "carte-neuve")).toEqual([1]);
    expect(niveauxConsommes(apres, "carte-a")).toEqual([2]);
  });

  it("un même niveau consommé deux fois ne rapproche pas la carte de l'épuisement", () => {
    const carte = carteDeTest("carte-a");
    let historique: Historique = {};

    // Deux passes sur les memes neuf niveaux : le dixieme n'a jamais ete
    // consomme, la carte reste donc jouable (architecture.md section 6).
    for (const niveau of NIVEAUX.slice(0, -1)) {
      historique = consommer(historique, carte.id, niveau);
    }
    for (const niveau of NIVEAUX.slice(0, -1)) {
      historique = consommer(historique, carte.id, niveau);
    }

    expect(niveauxConsommes(historique, carte.id)).toEqual(NIVEAUX.slice(0, -1));
    expect(ids(cartesRestantes([carte], historique, ["general"]))).toEqual([carte.id]);
  });
});

/**
 * La table des cles autorisees par phase, tiree d'architecture.md section 5,
 * triee pour se comparer a `Object.keys().sort()`.
 *
 * Elle est close, et c'est ce qui fait d'elle un test : aucune phase ne porte
 * d'Historique, donc un reducteur qui en rendrait un serait pris ici meme si
 * personne n'y pensait.
 */
const CLES_PAR_PHASE: Record<EtatTour["phase"], readonly string[]> = {
  REPOS: ["phase"],
  THEME: ["carte", "depuis", "phase"],
  NIVEAU: ["carte", "consommes", "depuis", "phase"],
  QUESTION: ["carte", "depuis", "enonce", "phase"],
  REPONSE: ["carte", "depuis", "enonce", "phase", "reponse"],
};

type Horloge = () => number;

function creerHorloge(): Horloge {
  let instant = 0;
  return () => {
    // Chaque transition est datee VERROU_MS apres la precedente. Plus tot, le
    // verrou d'entree la rejetterait et la sequence eprouverait le verrou au
    // lieu de la consommation (architecture.md section 10).
    instant += VERROU_MS;
    return instant;
  };
}

type TourJoue = { traverses: readonly EtatTour[]; surReponse: EtatTour };

/**
 * Rejoue un tour complet jusqu'a la phase REPONSE, du point de vue de
 * l'appelant : c'est lui qui possede le corpus et qui charge chaque action de
 * ce que la phase visee a le droit de montrer.
 */
function jouerJusquALaReponse(
  carte: Carte,
  niveau: Niveau,
  consommes: readonly Niveau[],
  horloge: Horloge,
): TourJoue {
  const question = questionDe(carte, niveau);
  const auRepos = initial();
  const surTheme = reduire(auRepos, { type: "piocher", carte: resumer(carte) }, horloge());
  const surNiveau = reduire(surTheme, { type: "annoncer", consommes }, horloge());
  const surQuestion = reduire(
    surNiveau,
    { type: "choisir", niveau, enonce: { niveau, q: question.q } },
    horloge(),
  );
  const surReponse = reduire(
    surQuestion,
    { type: "reveler", reponse: { r: question.r } },
    horloge(),
  );

  return {
    traverses: [auRepos, surTheme, surNiveau, surQuestion, surReponse],
    surReponse,
  };
}

describe("Le moment de la consommation", () => {
  it("le réducteur ne rend jamais d'historique : il ne peut structurellement consommer aucun niveau", () => {
    const horloge = creerHorloge();
    const carteA = carteDeTest("carte-a");
    const carteB = carteDeTest("carte-b");

    const { traverses, surReponse } = jouerJusquALaReponse(carteA, NIVEAU_CHOISI, [], horloge);
    const surThemeSuivant = reduire(
      surReponse,
      { type: "suivante", carte: resumer(carteB) },
      horloge(),
    );
    const etats = [...traverses, surThemeSuivant];

    // Sans ce controle, un reducteur qui rejetterait tout laisserait le
    // controle des cles porter cinq fois sur REPOS et ne prouverait rien.
    expect(etats.map((etat) => etat.phase)).toEqual([
      "REPOS",
      "THEME",
      "NIVEAU",
      "QUESTION",
      "REPONSE",
      "THEME",
    ]);

    for (const etat of etats) {
      expect(Object.keys(etat).sort(), `phase ${etat.phase}`).toEqual(CLES_PAR_PHASE[etat.phase]);
    }
  });

  it("suivante ne consomme rien : l'historique traverse la transition intact", () => {
    const horloge = creerHorloge();
    const carteA = carteDeTest("carte-a");
    const carteB = carteDeTest("carte-b");
    const { surReponse } = jouerJusquALaReponse(carteA, NIVEAU_CHOISI, [], horloge);

    // L'historique appartient a l'appelant et n'entre jamais dans `reduire` :
    // c'est ce qui rend la transition incapable de bruler quoi que ce soit.
    const historique: Historique = { "carte-a": [NIVEAU_CHOISI] };
    const temoin = structuredClone(historique);

    const surTheme = reduire(surReponse, { type: "suivante", carte: resumer(carteB) }, horloge());

    expect(surTheme.phase).toBe("THEME");
    expect(historique).toEqual(temoin);
    expect(niveauxConsommes(historique, "carte-b")).toEqual([]);
    expect(niveauxConsommes(historique, "carte-a")).toEqual([NIVEAU_CHOISI]);
  });

  it("le niveau consommé sur choisir revient dans les niveaux consommés du tour suivant", () => {
    const horloge = creerHorloge();
    const carte = carteDeTest("carte-a");
    const { surReponse } = jouerJusquALaReponse(carte, NIVEAU_CHOISI, [], horloge);

    // L'appelant consomme a l'entree en QUESTION, sur le niveau que porte
    // `choisir` (architecture.md section 6).
    const historique = consommer({}, carte.id, NIVEAU_CHOISI);

    const surTheme = reduire(surReponse, { type: "suivante", carte: resumer(carte) }, horloge());
    const surNiveau = reduire(
      surTheme,
      { type: "annoncer", consommes: niveauxConsommes(historique, carte.id) },
      horloge(),
    );

    expect(surNiveau).toMatchObject({ phase: "NIVEAU", consommes: [NIVEAU_CHOISI] });
    // Neuf questions inedites restent : la carte revient avec un trou, elle ne
    // sort pas du vivier (architecture.md section 5, champ `consommes`).
    expect(ids(cartesRestantes([carte], historique, ["general"]))).toEqual([carte.id]);
  });
});
