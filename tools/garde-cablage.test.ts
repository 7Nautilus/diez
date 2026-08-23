/*
 * Diez : la garde du cablage d'App.tsx.
 *
 * POURQUOI UNE SONDE QUI LIT DU TEXTE, CE QUE CE DEPOT EVITE PARTOUT AILLEURS.
 * `App.tsx` monte des composants React : il est hors de portee de la suite, qui
 * tourne sans DOM et sans plugin JSX (vitest.config.ts, et c'est delibere). Or
 * les correctifs de cette passe se terminent tous par quelques lignes de
 * cablage POSEES LA, et une ligne de cablage supprimee ne casse rien de ce que
 * les autres suites savent lire. Mesures faites sur le fichier reel, avant
 * cette sonde :
 *
 *   `useGesteDeRetour(tour.phase !== "REPOS", ...)` remplace par `(false, ...)`
 *     tsc 0, biome "Checked 96 files. No fixes applied.", 286 tests passes,
 *     alors que plus AUCUN geste de retour n'etait intercepte de toute la soiree
 *
 * Le choix est donc entre une sonde textuelle et aucune sonde. Elle ne pretend
 * pas prouver le comportement : chacune des trois regles ci-dessous est prouvee
 * ailleurs, sur des fonctions pures. Elle prouve seulement que le cablage les
 * APPELLE, ce qui est exactement ce qui manquait.
 *
 * Elle vit dans `tools/` et non dans `src/` pour la raison qui y a deja mis
 * `garde-p2.test.ts` : depuis `src/`, `node:fs` serait un import etranger a la
 * couche, et la regle de dependance le refuserait.
 *
 * Le formatage est celui de Biome, donc stable : ce que la sonde cherche ne se
 * reecrit pas d'une mise en forme a l'autre.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const lire = (chemin: string) => readFileSync(join(process.cwd(), chemin), "utf8");

const APP = lire("src/app/App.tsx");
const FEUILLE = lire("src/design/components/Feuille.tsx");

describe("le cablage du geste de retour", () => {
  /*
   * LE DEFAUT MESURE, ET SON UNIQUE GARDE MECANIQUE. La garde n'etait armee que
   * hors du repos, or le menu et la demande de reinitialisation ne vivent QU'AU
   * repos : menu ouvert, un balayage depuis le bord sortait de l'application,
   * et en PWA installee il n'y a pas d'entree precedente, donc il la FERMAIT.
   * Mesure au navigateur : `history.state` valait `null` et `history.back()`
   * faisait passer l'URL de `/diez/` a la page precedente.
   */
  it("arme la garde par la table, jamais par une condition ecrite sur place", () => {
    expect(APP).toContain("useGesteDeRetour(gardeArmee(effet), surRetour)");
  });

  it("fait entrer les panneaux ouverts dans la table", () => {
    expect(APP).toContain("effetDuRetour(tour.phase, panneauxOuverts > 0)");
  });

  it("ferme le panneau du DESSUS et non un panneau choisi sur place", () => {
    expect(APP).toContain("PANNEAUX.fermerLeDessus()");
  });
});

describe("le cablage de la Feuille sur la pile", () => {
  /*
   * L'AUTRE ENTREE DU MEME DEFAUT. L'ecouteur d'Echap est pose sur `window`,
   * donc DEUX panneaux ouverts sont prevenus de la meme touche et se fermaient
   * tous les deux. Mesure au navigateur, menu et Confirmation ouverts, un seul
   * Echap : panneaux ["Menu", "Reinitialiser l'historique"] avant, [] apres, et
   * le focus retombe sur BODY. Le filtre est prouve dans
   * `src/app/__tests__/panneaux.test.ts` ; ce qui manquait, c'est qu'il soit
   * effectivement pose sur le chemin d'Echap.
   */
  it("inscrit chaque panneau ouvert dans la pile", () => {
    expect(FEUILLE).toContain("PANNEAUX.inscrire(");
  });

  it("ne laisse repondre a Echap que le panneau du dessus", () => {
    expect(FEUILLE).toContain("inscription.current?.estAuDessus() !== true) return;");
  });

  it("retire le panneau de la pile a son demontage", () => {
    expect(FEUILLE).toContain("prise.retirer();");
  });
});

describe("le cablage du voisinage", () => {
  /*
   * Sans cet abonnement, deux documents de la meme origine s'ecrasent l'un
   * l'autre et le second repose mot pour mot une question que le premier vient
   * de jouer. La regle de fusion est prouvee dans
   * `src/app/__tests__/reconciliation.test.ts`, l'abonnement dans
   * `src/storage/voisinage.test.ts` ; ce qui n'etait prouve nulle part, c'est
   * que l'un soit branche sur l'autre.
   */
  it("ecoute ce qu'un autre document de la meme origine ecrit", () => {
    expect(APP).toContain("abonnerAuxEcrituresVoisines(window,");
  });

  it("relit les deux clefs fusionnables et les passe au reducteur", () => {
    expect(APP).toContain('origine: "voisin"');
    expect(APP).toContain("historique: lireHistorique(), signalements: lireSignalements()");
  });
});
