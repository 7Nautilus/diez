/*
 * Diez : le geste de retour du telephone, rejoue sans DOM.
 *
 * POURQUOI CETTE SUITE EXISTE. `navigation.ts` faisait 120 lignes et aucun test
 * ne le mentionnait, alors qu'il porte le seul geste capable de fermer
 * l'application en pleine soiree. Trois mutations mesurees AVANT son
 * extraction, chacune ecrite sur le fichier reel, chacune verte de bout en
 * bout :
 *
 *   les deux `history.pushState` remplaces par `history.replaceState`
 *     tsc 0, biome "Checked 96 files. No fixes applied.", 286 tests passes
 *   `window.addEventListener("popstate", ...)` remplace par `removeEventListener`
 *     idem, 286 tests passes
 *   le drapeau du retour declenche par nous-memes retire
 *     idem, 286 tests passes
 *
 * Et une quatrieme, sur le cablage d'App.tsx :
 *
 *   `useGesteDeRetour(tour.phase !== "REPOS", ...)` remplace par `(false, ...)`
 *     idem, 286 tests passes, alors que plus AUCUN geste n'etait intercepte
 *
 * C'est le meme trou que celui d'execution.ts, ferme de la meme facon : ce qui
 * touche au navigateur est INJECTE, la logique est une fabrique pure, et la
 * regle de phase est une table qu'on peut rejouer.
 *
 * Aucun composant n'est monte ici : `useGesteDeRetour` n'est qu'un cablage de
 * dix lignes autour de `creerGardeDeRetour`, et tout ce qu'il branche est
 * eprouve separement.
 */

import type { EtatTour } from "../../domain/types";
import {
  abonnerAuPopstate,
  creerGardeDeRetour,
  type EffetDuRetour,
  effetDuRetour,
  gardeArmee,
  historiqueDuNavigateur,
} from "../navigation";

const PHASES: readonly EtatTour["phase"][] = ["REPOS", "THEME", "NIVEAU", "QUESTION", "REPONSE"];

/* --- Le faux historique -------------------------------------------------- */

/*
 * Il porte `replaceState` alors que le module ne doit jamais l'appeler, et
 * c'est tout l'objet : sans lui, la mutation `pushState` vers `replaceState` ne
 * compilerait pas, et une erreur de type se contourne plus vite qu'un controle
 * qui NOMME la methode attendue.
 */
function fauxHistorique() {
  const appels: string[] = [];
  const charges: unknown[] = [];
  return {
    historique: {
      pushState: (charge: unknown) => {
        appels.push("pushState");
        charges.push(charge);
      },
      replaceState: (charge: unknown) => {
        appels.push("replaceState");
        charges.push(charge);
      },
      back: () => {
        appels.push("back");
      },
    } as Pick<History, "pushState" | "replaceState" | "back">,
    appels,
    charges,
  };
}

/* --- 1. La table des issues ---------------------------------------------- */

describe("ce que le geste de retour doit faire", () => {
  it("ferme le panneau AVANT tout le reste, dans les cinq phases", () => {
    const issues = PHASES.map((phase) => effetDuRetour(phase, true));
    expect(issues).toEqual(PHASES.map(() => "fermerLePanneau"));
  });

  /*
   * LE DEFAUT MESURE, ET SON CONTROLE. Menu ouvert sur l'accueil, la garde
   * n'etait pas armee : `history.state` valait `null` et `history.back()`
   * faisait passer l'URL de `/diez/` a la page precedente. En PWA installee il
   * n'y a pas de page precedente, donc le balayage FERMAIT l'application, et le
   * menu est le seul endroit ou vivent les regles du jeu, le mode d'affichage
   * et la reinitialisation.
   */
  it("n'abandonne plus l'application quand un panneau est ouvert au repos", () => {
    expect(effetDuRetour("REPOS", true)).toBe("fermerLePanneau");
    expect(gardeArmee(effetDuRetour("REPOS", true))).toBe(true);
  });

  it("ne recule que depuis NIVEAU, la seule transition qui recule", () => {
    const reculent = PHASES.filter((phase) => effetDuRetour(phase, false) === "revenirAuTheme");
    expect(reculent).toEqual(["NIVEAU"]);
  });

  it("absorbe THEME, QUESTION et REPONSE, sans effet et en silence", () => {
    expect(effetDuRetour("THEME", false)).toBe("absorber");
    expect(effetDuRetour("QUESTION", false)).toBe("absorber");
    expect(effetDuRetour("REPONSE", false)).toBe("absorber");
  });

  it("ne quitte que depuis l'accueil NU, et de nulle part ailleurs", () => {
    const quittent = PHASES.filter((phase) => effetDuRetour(phase, false) === "quitter");
    expect(quittent).toEqual(["REPOS"]);
  });

  it("arme la garde pour tout ce qui n'est pas quitter", () => {
    const issues: readonly EffetDuRetour[] = [
      "fermerLePanneau",
      "revenirAuTheme",
      "absorber",
      "quitter",
    ];
    expect(issues.map(gardeArmee)).toEqual([true, true, true, false]);
  });
});

/* --- 2. Le pont vers l'historique du navigateur -------------------------- */

describe("le pont vers l'historique du navigateur", () => {
  /*
   * LA MUTATION QUE CE CONTROLE EXISTE POUR REFUSER. `replaceState` ne cree
   * aucune entree : il n'y a alors rien a consommer, le geste de retour passe
   * au travers, et l'application se ferme. Le controle cherche le NOM de la
   * methode et non un effet de bord, seule facon de distinguer les deux.
   */
  it("POSE une entree et n'en remplace pas une : pushState, jamais replaceState", () => {
    const faux = fauxHistorique();
    historiqueDuNavigateur(faux.historique).poser();
    expect(faux.appels).toEqual(["pushState"]);
  });

  it("marque l'entree, pour qu'elle soit reconnaissable dans l'historique", () => {
    const faux = fauxHistorique();
    historiqueDuNavigateur(faux.historique).poser();
    expect(faux.charges).toEqual([{ diez: "garde" }]);
  });

  it("consomme une entree par un vrai retour", () => {
    const faux = fauxHistorique();
    historiqueDuNavigateur(faux.historique).revenir();
    expect(faux.appels).toEqual(["back"]);
  });
});

/* --- 3. L'abonnement au geste -------------------------------------------- */

/*
 * LE CABLAGE, ET NON PLUS SEULEMENT LA MACHINE. Les controles de la section 4
 * appellent `surPopstate` a la main : ils prouvent que la garde REAGIT a un
 * geste de retour, jamais qu'elle en est PREVENUE. Mutation qui revele le trou,
 * et qui passait avant cette suite : remplacer l'inscription de l'ecouteur par
 * son retrait.
 */
describe("l'abonnement au geste de retour", () => {
  const fausseCible = () => {
    const ecouteurs = new Map<string, EventListener>();
    return {
      cible: {
        addEventListener: (type: string, ecouteur: EventListener) => ecouteurs.set(type, ecouteur),
        removeEventListener: (type: string, ecouteur: EventListener) => {
          if (ecouteurs.get(type) === ecouteur) ecouteurs.delete(type);
        },
      } as Pick<Window, "addEventListener" | "removeEventListener">,
      inscrits: () => [...ecouteurs.keys()],
      declencher: (type: string) => ecouteurs.get(type)?.(new Event(type)),
    };
  };

  it("inscrit un ecouteur de popstate", () => {
    const f = fausseCible();
    abonnerAuPopstate(f.cible, () => {});
    expect(f.inscrits()).toEqual(["popstate"]);
  });

  it("previent a chaque geste", () => {
    const f = fausseCible();
    let vus = 0;
    abonnerAuPopstate(f.cible, () => {
      vus += 1;
    });
    f.declencher("popstate");
    f.declencher("popstate");
    expect(vus).toBe(2);
  });

  it("se desabonne vraiment, et ne previent plus ensuite", () => {
    const f = fausseCible();
    let vus = 0;
    const desabonner = abonnerAuPopstate(f.cible, () => {
      vus += 1;
    });
    desabonner();
    expect(f.inscrits()).toEqual([]);
    f.declencher("popstate");
    expect(vus).toBe(0);
  });
});

/* --- 4. La garde elle-meme ----------------------------------------------- */

describe("la garde de retour", () => {
  const monter = () => {
    const faux = fauxHistorique();
    const retours: number[] = [];
    const garde = creerGardeDeRetour(historiqueDuNavigateur(faux.historique), () =>
      retours.push(retours.length + 1),
    );
    return { faux, garde, retours };
  };

  it("pose une entree des qu'il y a quelque chose a proteger", () => {
    const { faux, garde } = monter();
    garde.viser(true);
    expect(garde.posee()).toBe(true);
    expect(faux.appels).toEqual(["pushState"]);
  });

  /*
   * L'idempotence n'est pas une precaution de style : React monte, demonte puis
   * remonte les effets en developpement, et une garde par phase s'accumulerait
   * sur une vingtaine de tours a quatre phases. Il faudrait alors presser
   * retour quatre-vingts fois pour sortir de l'accueil.
   */
  it("n'en pose jamais deux, quel que soit le nombre de rendus", () => {
    const { faux, garde } = monter();
    garde.viser(true);
    garde.viser(true);
    garde.viser(true);
    expect(faux.appels).toEqual(["pushState"]);
  });

  it("ne pose rien quand il n'y a rien a proteger", () => {
    const { faux, garde } = monter();
    garde.viser(false);
    expect(garde.posee()).toBe(false);
    expect(faux.appels).toEqual([]);
  });

  it("previent l'appelant et repose la garde a chaque geste", () => {
    const { faux, garde, retours } = monter();
    garde.viser(true);
    garde.surPopstate();
    expect(retours).toHaveLength(1);
    expect(garde.posee()).toBe(true);
    expect(faux.appels).toEqual(["pushState", "pushState"]);

    garde.surPopstate();
    expect(retours).toHaveLength(2);
    expect(faux.appels).toEqual(["pushState", "pushState", "pushState"]);
  });

  it("retire la garde en trop en revenant vraiment en arriere", () => {
    const { faux, garde } = monter();
    garde.viser(true);
    garde.viser(false);
    expect(garde.posee()).toBe(false);
    expect(faux.appels).toEqual(["pushState", "back"]);
  });

  /*
   * LE PIEGE DU RETRAIT, ET IL EST SILENCIEUX. Retirer la garde declenche un
   * `popstate` bien reel, qui revient de facon asynchrone. Sans le drapeau,
   * la fin d'un tour se lirait comme un geste du narrateur, et l'appelant
   * serait prevenu d'un retour qui n'a pas eu lieu.
   */
  it("ne lit pas comme un geste le retour qu'elle a elle-meme declenche", () => {
    const { faux, garde, retours } = monter();
    garde.viser(true);
    garde.viser(false);
    garde.surPopstate();
    expect(retours).toEqual([]);
    expect(faux.appels).toEqual(["pushState", "back"]);
  });

  it("redevient sensible au geste suivant, une fois son propre retour absorbe", () => {
    const { garde, retours } = monter();
    garde.viser(true);
    garde.viser(false);
    garde.surPopstate();
    garde.viser(true);
    garde.surPopstate();
    expect(retours).toHaveLength(1);
  });

  /*
   * La sequence complete du defaut repare, telle qu'elle se joue sur le
   * telephone : accueil, menu ouvert, balayage depuis le bord. La garde est
   * armee parce qu'un panneau est ouvert, le geste est intercepte au lieu de
   * fermer l'application, l'appelant ferme le panneau, et la garde tombe.
   */
  it("rejoue le menu ouvert au repos, du balayage a la fermeture du panneau", () => {
    const { faux, garde, retours } = monter();

    const auReposNu = gardeArmee(effetDuRetour("REPOS", false));
    garde.viser(auReposNu);
    expect(garde.posee()).toBe(false);

    const menuOuvert = gardeArmee(effetDuRetour("REPOS", true));
    garde.viser(menuOuvert);
    expect(garde.posee()).toBe(true);

    garde.surPopstate();
    expect(retours).toHaveLength(1);

    garde.viser(auReposNu);
    expect(garde.posee()).toBe(false);
    expect(faux.appels).toEqual(["pushState", "pushState", "back"]);
  });
});
