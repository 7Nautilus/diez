/*
 * Ce que cette suite protege : le prefixe `v1` n'est pas decoratif.
 *
 * La liste publiee est vide, et le restera jusqu'au jour ou une forme change
 * reellement. Ce qui se prouve ici n'est donc pas une conversion, c'est le
 * CHEMIN qui y mene : qu'une migration posee dans la liste soit effectivement
 * consultee, qu'elle ne le soit que si la clef courante est absente, et qu'un
 * echec de conversion retombe sur le defaut au lieu de faire planter un
 * demarrage. Le jour venu, il ne restera qu'a ecrire la conversion.
 */

import { cleDe } from "./cles";
import { installerStockage, retirerStockage, stockageEnMemoire } from "./fixtures";
import { MIGRATIONS, type Migration, valeurMigree } from "./migration";
import { lireBrut } from "./stockage";

/** Une migration factice : elle lit une v0 imaginaire et marque ce qu'elle a lu. */
const DEPUIS_V0: Migration = {
  depuis: "v0",
  convertir: (suffixe, ancien) => ({ suffixe, ancien, converti: true }),
};

const RENONCE: Migration = {
  depuis: "v0",
  convertir: () => undefined,
};

afterEach(retirerStockage);

describe("la liste publiee est vide, et c'est la seule chose qu'une v1 puisse dire", () => {
  it("aucune migration n'est declaree sous la version courante", () => {
    // Une v1 n'a par definition aucune version anterieure a lire. Ecrire
    // aujourd'hui une conversion imaginaire reviendrait a deviner la forme
    // future, donc a livrer du code que personne ne relit et que rien ne teste.
    expect(MIGRATIONS).toEqual([]);
  });

  it("sans migration declaree, il n'y a rien a recuperer", () => {
    expect(valeurMigree("historique", () => ({ "alpha-001": [1] }))).toBeUndefined();
  });
});

describe("le mecanisme fonctionne, on le montre avec une migration factice", () => {
  it("une migration declaree va lire la clef de SA version, pas de la courante", () => {
    const consultees: string[] = [];
    valeurMigree(
      "tour",
      (cle) => {
        consultees.push(cle);
        return undefined;
      },
      [DEPUIS_V0],
    );
    expect(consultees).toEqual(["diez:v0:tour"]);
  });

  it("la valeur convertie est celle que rend la migration", () => {
    expect(valeurMigree("reglages", () => ({ mode: "sombre" }), [DEPUIS_V0])).toEqual({
      suffixe: "reglages",
      ancien: { mode: "sombre" },
      converti: true,
    });
  });

  it("une migration qui renonce ne rend rien, et le defaut de la clef s'appliquera", () => {
    expect(valeurMigree("reglages", () => ({ mode: "sombre" }), [RENONCE])).toBeUndefined();
  });

  it("une clef anterieure absente n'est pas convertie", () => {
    expect(valeurMigree("tour", () => undefined, [DEPUIS_V0])).toBeUndefined();
  });
});

describe("le branchement dans la lecture existe deja", () => {
  it("une clef v1 absente fait consulter la version anterieure", () => {
    installerStockage(
      stockageEnMemoire(new Map([[cleDe("historique", "v0"), '{"alpha-001":[1,2]}']])),
    );
    expect(lireBrut("historique", [DEPUIS_V0])).toEqual({
      suffixe: "historique",
      ancien: { "alpha-001": [1, 2] },
      converti: true,
    });
  });

  it("une clef v1 presente fait foi, la migration n'est pas consultee", () => {
    // Sans cette condition, une migration ecraserait a chaque demarrage ce que
    // la soiree vient d'enregistrer.
    installerStockage(
      stockageEnMemoire(
        new Map([
          [cleDe("historique"), '{"beta-002":[3]}'],
          [cleDe("historique", "v0"), '{"alpha-001":[1,2]}'],
        ]),
      ),
    );
    expect(lireBrut("historique", [DEPUIS_V0])).toEqual({ "beta-002": [3] });
  });
});
