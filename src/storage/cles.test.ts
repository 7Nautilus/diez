/*
 * Ce que cette suite protege : les quatre noms de clefs d'architecture.md
 * section 7, et le sens du prefixe de version.
 *
 * Elle fige des chaines litterales, ce qu'un test ne fait pas d'habitude. C'est
 * voulu : ces noms ne sont pas une convention interne, ce sont les coordonnees
 * de donnees deja posees sur des telephones. Les changer sans migration ne
 * casse rien de visible, ni compilation ni lint ni rendu, ca abandonne
 * simplement l'historique et les signalements de tout le monde. Un test qui
 * echoue est le seul rappel automatique qui existe.
 */

import { cleDe, SUFFIXES, VERSION } from "./cles";

describe("les clefs du stockage", () => {
  it("les quatre clefs portent exactement les noms d'architecture.md section 7", () => {
    expect(SUFFIXES.map((suffixe) => cleDe(suffixe))).toEqual([
      "diez:v1:historique",
      "diez:v1:reglages",
      "diez:v1:signalements",
      "diez:v1:tour",
    ]);
  });

  it("la version publiee est v1, et la changer abandonne les donnees des joueurs", () => {
    expect(VERSION).toBe("v1");
  });

  it("une migration peut nommer la clef d'une version qu'on ne publie plus", () => {
    expect(cleDe("tour", "v2")).toBe("diez:v2:tour");
    expect(cleDe("tour", "v2")).not.toBe(cleDe("tour"));
  });
});
