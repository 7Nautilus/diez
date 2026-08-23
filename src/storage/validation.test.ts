/*
 * Ce que cette suite protege : le fait qu'un `JSON.parse` reussi ne prouve
 * rien. Chaque predicat est montre en train de REFUSER, parce qu'une validation
 * qu'on n'a pas vue refuser ne protege rien.
 *
 * Les valeurs eprouvees ne sont pas choisies au hasard : ce sont celles qu'un
 * `JSON.parse` peut reellement produire (`null`, un tableau la ou un objet est
 * attendu, un nombre a la place d'un texte) plus celles qu'une clef editee a la
 * main ou une horloge cassee peuvent produire (`NaN`, un infini, un niveau hors
 * echelle).
 */

import {
  estFacultatif,
  estHorodatage,
  estIdentifiant,
  estListeDe,
  estNiveau,
  estObjet,
  estTexte,
} from "./validation";

describe("un objet se distingue des deux valeurs que JavaScript appelle aussi objet", () => {
  it("accepte un objet, y compris vide", () => {
    expect(estObjet({})).toBe(true);
    expect(estObjet({ mode: "sombre" })).toBe(true);
  });

  it("refuse null, dont typeof rend pourtant object", () => {
    expect(estObjet(null)).toBe(false);
  });

  it("refuse un tableau, dont typeof rend aussi object", () => {
    expect(estObjet([])).toBe(false);
    expect(estObjet([1, 2])).toBe(false);
  });

  it("refuse un nombre nu, cas de la clef reduite a 42", () => {
    expect(estObjet(42)).toBe(false);
    expect(estObjet("historique")).toBe(false);
    expect(estObjet(undefined)).toBe(false);
  });
});

describe("un identifiant designe quelque chose", () => {
  it("refuse la chaine vide, qui ne designe aucune carte", () => {
    expect(estIdentifiant("")).toBe(false);
  });

  it("refuse ce qui n'est pas du texte", () => {
    expect(estIdentifiant(7)).toBe(false);
    expect(estIdentifiant(null)).toBe(false);
    expect(estIdentifiant(undefined)).toBe(false);
  });

  it("accepte un identifiant du corpus", () => {
    expect(estIdentifiant("general-001")).toBe(true);
  });
});

describe("un niveau appartient a l'echelle du jeu", () => {
  it("accepte les dix niveaux, bornes comprises", () => {
    for (const niveau of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      expect(estNiveau(niveau)).toBe(true);
    }
  });

  it("refuse un niveau hors de 1 a 10, des deux cotes", () => {
    expect(estNiveau(0)).toBe(false);
    expect(estNiveau(11)).toBe(false);
    expect(estNiveau(-3)).toBe(false);
  });

  it("refuse un niveau non entier, qui ne designerait aucune question", () => {
    expect(estNiveau(3.5)).toBe(false);
  });

  it("refuse un niveau ecrit en texte, forme qu'un JSON produit facilement", () => {
    expect(estNiveau("3")).toBe(false);
  });

  it("refuse NaN et l'infini, que typeof declare pourtant number", () => {
    expect(estNiveau(Number.NaN)).toBe(false);
    expect(estNiveau(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("un horodatage se compare", () => {
  it("accepte une date reelle et l'origine des temps", () => {
    expect(estHorodatage(Date.UTC(2026, 7, 22))).toBe(true);
    expect(estHorodatage(0)).toBe(true);
  });

  it("refuse NaN, qui traverserait le controle de peremption sans le declencher", () => {
    expect(estHorodatage(Number.NaN)).toBe(false);
  });

  it("refuse l'infini et une date negative", () => {
    expect(estHorodatage(Number.POSITIVE_INFINITY)).toBe(false);
    expect(estHorodatage(-1)).toBe(false);
  });

  it("refuse un horodatage absent", () => {
    expect(estHorodatage(undefined)).toBe(false);
    expect(estHorodatage(null)).toBe(false);
  });
});

describe("une liste est homogene ou n'est pas", () => {
  it("accepte une liste vide, qui est une liste", () => {
    expect(estListeDe([], estNiveau)).toBe(true);
  });

  it("refuse la liste entiere des qu'un seul element est mauvais", () => {
    expect(estListeDe([1, 2, 3], estNiveau)).toBe(true);
    expect(estListeDe([1, 2, 42], estNiveau)).toBe(false);
    expect(estListeDe([1, "2", 3], estNiveau)).toBe(false);
  });

  it("refuse ce qui n'est pas un tableau", () => {
    expect(estListeDe({ 0: 1 }, estNiveau)).toBe(false);
    expect(estListeDe("123", estTexte)).toBe(false);
    expect(estListeDe(null, estNiveau)).toBe(false);
  });
});

describe("un champ facultatif est absent ou conforme, jamais du mauvais type", () => {
  it("accepte l'absence", () => {
    expect(estFacultatif(undefined, estTexte)).toBe(true);
  });

  it("refuse un champ present mais du mauvais type, plutot que de l'ignorer", () => {
    expect(estFacultatif(12, estTexte)).toBe(false);
    expect(estFacultatif(null, estTexte)).toBe(false);
  });

  it("accepte un champ present et conforme", () => {
    expect(estFacultatif("Precision d'arbitrage", estTexte)).toBe(true);
  });
});
