/*
 * Ce que cette suite protege : l'anti-repetition survit au rechargement, et une
 * clef abimee produit une partie neuve plutot qu'un ecran blanc.
 *
 * `{"historique": 42}` s'analyse tres bien : c'est pourquoi chaque cas ci-
 * dessous part d'un JSON PARFAITEMENT VALIDE dont seule la forme est fausse.
 */

import { cleDe } from "./cles";
import { installerStockage, retirerStockage, stockageEnMemoire } from "./fixtures";
import { ecrireHistorique, lireHistorique, validerHistorique } from "./historique";

afterEach(retirerStockage);

describe("un historique valide est relu tel quel", () => {
  it("les niveaux consommes de chaque carte sont conserves", () => {
    expect(validerHistorique({ "alpha-001": [1, 5, 10], "beta-002": [] })).toEqual({
      "alpha-001": [1, 5, 10],
      "beta-002": [],
    });
  });

  it("un historique vide est une valeur valide, pas une absence", () => {
    expect(validerHistorique({})).toEqual({});
  });
});

describe("un historique de mauvaise forme est refuse en entier", () => {
  it("refuse un nombre, cas du JSON valide de forme fausse", () => {
    expect(validerHistorique(42)).toBeNull();
  });

  it("refuse null et un tableau, que typeof declare pourtant objet", () => {
    expect(validerHistorique(null)).toBeNull();
    expect(validerHistorique([])).toBeNull();
  });

  it("refuse une valeur qui n'est pas une liste de niveaux", () => {
    expect(validerHistorique({ "alpha-001": 3 })).toBeNull();
    expect(validerHistorique({ "alpha-001": "1,2,3" })).toBeNull();
    expect(validerHistorique({ "alpha-001": null })).toBeNull();
  });

  it("refuse un niveau hors de 1 a 10", () => {
    expect(validerHistorique({ "alpha-001": [1, 11] })).toBeNull();
    expect(validerHistorique({ "alpha-001": [0] })).toBeNull();
    expect(validerHistorique({ "alpha-001": [2.5] })).toBeNull();
  });

  it("refuse tout des qu'UNE carte est mauvaise, sans recuperer les autres", () => {
    // Une recuperation partielle donnerait une anti-repetition incomplete d'une
    // quantite inconnue, silencieusement. Un historique vide est un etat connu,
    // annonce par le compteur de cartes restantes de l'accueil.
    expect(validerHistorique({ "alpha-001": [1, 2], "beta-002": [99] })).toBeNull();
  });

  it("refuse un identifiant vide, qui ne designerait aucune carte", () => {
    expect(validerHistorique({ "": [1] })).toBeNull();
  });
});

describe("la lecture retombe sur l'historique vide, jamais sur une exception", () => {
  it("sans stockage du tout", () => {
    retirerStockage();
    expect(lireHistorique()).toEqual({});
  });

  it("sur un contenu corrompu", () => {
    installerStockage(stockageEnMemoire(new Map([[cleDe("historique"), '{"alpha-001": 42}']])));
    expect(lireHistorique()).toEqual({});
  });

  it("sur du texte qui n'est pas du JSON", () => {
    installerStockage(stockageEnMemoire(new Map([[cleDe("historique"), "pas du JSON"]])));
    expect(lireHistorique()).toEqual({});
  });

  it("l'historique vide rendu n'est jamais un objet partage entre deux lectures", () => {
    // Deux appels rendant le meme objet, une mutation par l'appelant
    // contaminerait la lecture suivante.
    retirerStockage();
    expect(lireHistorique()).not.toBe(lireHistorique());
  });
});

describe("un aller-retour conserve l'anti-repetition", () => {
  it("ce qui a ete consomme dans la soiree se relit apres rechargement", () => {
    installerStockage(stockageEnMemoire());
    ecrireHistorique({ "alpha-001": [3, 7], "beta-002": [10] });
    expect(lireHistorique()).toEqual({ "alpha-001": [3, 7], "beta-002": [10] });
  });
});
