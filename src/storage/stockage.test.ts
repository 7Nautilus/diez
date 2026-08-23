/*
 * Ce que cette suite protege : JAMAIS DE PLANTAGE AU DEMARRAGE a cause du
 * stockage. Le telephone est celui d'un ami un soir de soiree, et les trois
 * etats eprouves ici sont ceux qu'il peut reellement presenter : pas de
 * stockage du tout, un stockage qui leve a chaque acces, un stockage qui
 * contient n'importe quoi.
 *
 * L'etat "pas de stockage du tout" est le plus severe des trois : sous Node
 * comme dans certains navigateurs, le simple fait de NOMMER `localStorage` leve
 * une `ReferenceError`, que ni un `if (localStorage)` ni un `?.` ne rattrapent.
 * Il ne se simule pas, il suffit de ne rien installer.
 */

import { cleDe } from "./cles";
import { installerStockage, retirerStockage, stockageEnMemoire, stockageQuiLeve } from "./fixtures";
import { ecrireBrut, effacer, lireBrut } from "./stockage";

afterEach(retirerStockage);

describe("un stockage absent n'interrompt rien", () => {
  it("le danger est reel : sans stockage installe, NOMMER localStorage leve", () => {
    // CONTROLE POSITIF. Sans lui, les deux tests suivants passeraient aussi bien
    // si l'environnement fournissait un stockage muet : ils ne prouveraient
    // alors rien du tout. C'est ce que l'enveloppe de stockage.ts absorbe, et
    // ce qu'aucune garde au point d'appel ne peut rattraper, une ReferenceError
    // se declenchant avant toute lecture de propriete.
    retirerStockage();
    expect(() => localStorage.getItem("diez")).toThrow(ReferenceError);
  });

  it("la lecture rend une absence au lieu de lever une ReferenceError", () => {
    retirerStockage();
    expect(lireBrut("tour")).toBeUndefined();
  });

  it("l'ecriture et l'effacement sont absorbes", () => {
    retirerStockage();
    expect(() => ecrireBrut("tour", { phase: "REPOS" })).not.toThrow();
    expect(() => effacer("tour")).not.toThrow();
  });
});

describe("un stockage qui leve n'interrompt rien non plus", () => {
  it("la lecture rend une absence au lieu de propager l'exception", () => {
    installerStockage(stockageQuiLeve());
    expect(lireBrut("reglages")).toBeUndefined();
  });

  it("l'ecriture est absorbee, cas du quota atteint en pleine soiree", () => {
    installerStockage(stockageQuiLeve());
    expect(() => ecrireBrut("reglages", { mode: "sombre" })).not.toThrow();
    expect(() => effacer("reglages")).not.toThrow();
  });
});

describe("un contenu illisible rend une absence, jamais une exception", () => {
  it("un texte qui n'est pas du JSON", () => {
    installerStockage(stockageEnMemoire(new Map([[cleDe("historique"), "{ceci n'est pas"]])));
    expect(lireBrut("historique")).toBeUndefined();
  });

  it("une chaine vide, qui fait lever JSON.parse", () => {
    installerStockage(stockageEnMemoire(new Map([[cleDe("historique"), ""]])));
    expect(lireBrut("historique")).toBeUndefined();
  });
});

describe("ce qui a ete ecrit se relit", () => {
  it("un aller-retour rend la valeur ecrite", () => {
    installerStockage(stockageEnMemoire());
    ecrireBrut("signalements", [{ carte: "alpha-001", niveau: 4 }]);
    expect(lireBrut("signalements")).toEqual([{ carte: "alpha-001", niveau: 4 }]);
  });

  it("l'effacement rend la clef a son absence", () => {
    installerStockage(stockageEnMemoire());
    ecrireBrut("tour", { phase: "THEME" });
    effacer("tour");
    expect(lireBrut("tour")).toBeUndefined();
  });

  it("un null enregistre se distingue d'une clef absente", () => {
    // La nuance decide si la chaine de migrations est consultee : sans elle,
    // une clef contenant "null" la declencherait a chaque demarrage.
    installerStockage(stockageEnMemoire(new Map([[cleDe("reglages"), "null"]])));
    expect(lireBrut("reglages")).toBeNull();
    expect(lireBrut("tour")).toBeUndefined();
  });
});
