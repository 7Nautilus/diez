/*
 * Ce que cette suite protege : les signalements survivent au rechargement, sans
 * quoi le geste `COPIER LES SIGNALEMENTS` de l'accueil ne collecterait qu'une
 * donnee que personne ne lira jamais (architecture.md section 7).
 *
 * Elle protege aussi P3 jusque dans le stockage : les quatre champs sont
 * reconstruits un a un, donc une clef editee a la main portant une reponse ne
 * peut pas la faire entrer dans l'etat de l'application.
 */

import { cleDe } from "./cles";
import { installerStockage, retirerStockage, stockageEnMemoire } from "./fixtures";
import {
  ecrireSignalements,
  lireSignalements,
  type SignalementStocke,
  validerSignalements,
} from "./signalements";

const SIGNALEMENT: SignalementStocke = {
  carte: "alpha-001",
  niveau: 6,
  theme: "Les volcans",
  q: "Lequel ?",
};

afterEach(retirerStockage);

describe("une liste de signalements valide est relue telle quelle", () => {
  it("les quatre champs sont conserves", () => {
    expect(validerSignalements([SIGNALEMENT])).toEqual([SIGNALEMENT]);
  });

  it("une liste vide est une valeur valide, pas une absence", () => {
    expect(validerSignalements([])).toEqual([]);
  });
});

describe("une liste de mauvaise forme est refusee en entier", () => {
  it("refuse ce qui n'est pas une liste", () => {
    expect(validerSignalements({})).toBeNull();
    expect(validerSignalements(null)).toBeNull();
    expect(validerSignalements(42)).toBeNull();
  });

  it("refuse un signalement auquel il manque un champ", () => {
    expect(
      validerSignalements([{ carte: "alpha-001", niveau: 6, theme: "Les volcans" }]),
    ).toBeNull();
    expect(validerSignalements([{ niveau: 6, theme: "Les volcans", q: "Lequel ?" }])).toBeNull();
  });

  it("refuse un niveau hors echelle ou ecrit en texte", () => {
    expect(validerSignalements([{ ...SIGNALEMENT, niveau: 0 }])).toBeNull();
    expect(validerSignalements([{ ...SIGNALEMENT, niveau: "6" }])).toBeNull();
  });

  it("refuse un identifiant vide, qui ne renverrait a aucune carte du depot", () => {
    expect(validerSignalements([{ ...SIGNALEMENT, carte: "" }])).toBeNull();
  });

  it("refuse tout des qu'UN signalement est mauvais", () => {
    expect(validerSignalements([SIGNALEMENT, { carte: "beta-002" }])).toBeNull();
  });

  it("refuse un element qui n'est pas un objet", () => {
    expect(validerSignalements(["alpha-001"])).toBeNull();
    expect(validerSignalements([null])).toBeNull();
  });
});

describe("un champ en trop ne traverse pas la lecture", () => {
  it("une reponse glissee dans la clef n'entre pas dans l'etat", () => {
    const valides = validerSignalements([{ ...SIGNALEMENT, r: "Le Stromboli" }]);
    expect(valides).toEqual([SIGNALEMENT]);
    expect(valides?.[0]).not.toHaveProperty("r");
  });
});

describe("la lecture retombe sur la liste vide, jamais sur une exception", () => {
  it("sans stockage du tout", () => {
    retirerStockage();
    expect(lireSignalements()).toEqual([]);
  });

  it("sur un contenu corrompu", () => {
    installerStockage(stockageEnMemoire(new Map([[cleDe("signalements"), '{"a": 1}']])));
    expect(lireSignalements()).toEqual([]);
  });
});

describe("un aller-retour conserve les signalements", () => {
  it("ce qui a ete signale dans la soiree se relit apres rechargement", () => {
    installerStockage(stockageEnMemoire());
    ecrireSignalements([SIGNALEMENT]);
    expect(lireSignalements()).toEqual([SIGNALEMENT]);
  });
});
