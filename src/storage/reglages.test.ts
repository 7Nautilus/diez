/*
 * Ce que cette suite protege : un selecteur de preference qui ne survit pas au
 * rechargement n'est pas une preference, c'est un bouton. Et son corollaire,
 * qui n'existait pas avant la phase 5 : les deux reglages partagent une clef,
 * donc chacun doit survivre a l'ecriture de l'autre.
 *
 * Elle protege aussi la SEULE exception a la regle du tout ou rien du dossier,
 * celle des identifiants de paquets, dont le motif est ecrit dans reglages.ts.
 */

import { cleDe } from "./cles";
import {
  estModeFictif,
  estPaquetFictif,
  installerStockage,
  retirerStockage,
  stockageEnMemoire,
} from "./fixtures";
import { ecrireMode, ecrirePaquetsActifs, lireMode, lirePaquetsActifs } from "./reglages";

const TOUS = ["alpha", "beta"] as const;

function avecClef(contenu: string): void {
  installerStockage(stockageEnMemoire(new Map([[cleDe("reglages"), contenu]])));
}

afterEach(retirerStockage);

describe("le mode d'affichage survit au rechargement", () => {
  it("le mode enregistre est relu", () => {
    installerStockage(stockageEnMemoire());
    ecrireMode("sombre");
    expect(lireMode(estModeFictif, "auto")).toBe("sombre");
  });

  it("retombe sur le defaut sans stockage du tout", () => {
    retirerStockage();
    expect(lireMode(estModeFictif, "auto")).toBe("auto");
  });

  it("retombe sur le defaut sur une valeur que l'appelant ne reconnait pas", () => {
    avecClef('{"mode":"fluo"}');
    expect(lireMode(estModeFictif, "auto")).toBe("auto");
  });

  it("retombe sur le defaut sur un JSON valide de mauvaise forme", () => {
    avecClef('{"mode":42}');
    expect(lireMode(estModeFictif, "auto")).toBe("auto");
    avecClef("[]");
    expect(lireMode(estModeFictif, "auto")).toBe("auto");
    avecClef("null");
    expect(lireMode(estModeFictif, "auto")).toBe("auto");
  });

  it("retombe sur le defaut sur du texte qui n'est pas du JSON", () => {
    avecClef("sombre");
    expect(lireMode(estModeFictif, "auto")).toBe("auto");
  });
});

describe("les paquets actifs survivent au rechargement", () => {
  it("la selection enregistree est relue", () => {
    installerStockage(stockageEnMemoire());
    ecrirePaquetsActifs(["beta"]);
    expect(lirePaquetsActifs(estPaquetFictif, TOUS)).toEqual(["beta"]);
  });

  it("aucun paquet coche est un etat legitime, pas une absence de reglage", () => {
    // L'accueil sait l'afficher : PIOCHER desactive, raison donnee
    // (recette.md section 1). Retomber sur le defaut ici recocherait tout sous
    // le nez du narrateur qui vient de decocher.
    installerStockage(stockageEnMemoire());
    ecrirePaquetsActifs([]);
    expect(lirePaquetsActifs(estPaquetFictif, TOUS)).toEqual([]);
  });

  it("un paquet disparu du corpus est ECARTE, la selection des autres survit", () => {
    // Un identifiant devenu inconnu n'est pas la trace d'une clef abimee mais
    // d'un lot retire entre deux versions de l'application.
    avecClef('{"paquets":["alpha","gamma"]}');
    expect(lirePaquetsActifs(estPaquetFictif, TOUS)).toEqual(["alpha"]);
  });

  it("une valeur qui n'est pas une liste de textes retombe sur le defaut", () => {
    avecClef('{"paquets":"alpha"}');
    expect(lirePaquetsActifs(estPaquetFictif, TOUS)).toEqual(TOUS);
    avecClef('{"paquets":[1,2]}');
    expect(lirePaquetsActifs(estPaquetFictif, TOUS)).toEqual(TOUS);
    avecClef('{"paquets":null}');
    expect(lirePaquetsActifs(estPaquetFictif, TOUS)).toEqual(TOUS);
  });

  it("retombe sur le defaut sans stockage du tout, donc tous les paquets actifs", () => {
    retirerStockage();
    expect(lirePaquetsActifs(estPaquetFictif, TOUS)).toEqual(TOUS);
  });
});

describe("les deux reglages partagent une clef sans s'effacer", () => {
  it("ecrire le mode ne perd pas les paquets", () => {
    installerStockage(stockageEnMemoire());
    ecrirePaquetsActifs(["beta"]);
    ecrireMode("sombre");
    expect(lirePaquetsActifs(estPaquetFictif, TOUS)).toEqual(["beta"]);
    expect(lireMode(estModeFictif, "auto")).toBe("sombre");
  });

  it("ecrire les paquets ne perd pas le mode", () => {
    installerStockage(stockageEnMemoire());
    ecrireMode("sombre");
    ecrirePaquetsActifs(["alpha"]);
    expect(lireMode(estModeFictif, "auto")).toBe("sombre");
    expect(lirePaquetsActifs(estPaquetFictif, TOUS)).toEqual(["alpha"]);
  });

  it("une clef illisible est remplacee, ce qui lui permet de redevenir saine", () => {
    avecClef("pas du JSON");
    ecrireMode("sombre");
    expect(lireMode(estModeFictif, "auto")).toBe("sombre");
  });
});

describe("l'ecriture n'interrompt jamais une soiree", () => {
  it("sans stockage du tout, elle est absorbee", () => {
    retirerStockage();
    expect(() => ecrireMode("sombre")).not.toThrow();
    expect(() => ecrirePaquetsActifs(["alpha"])).not.toThrow();
  });
});
