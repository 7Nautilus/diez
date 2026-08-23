/*
 * Diez : ce qu'un autre document de la meme origine vient d'ecrire.
 *
 * POURQUOI CETTE SUITE. Aucun ecouteur `storage` n'existait, donc deux
 * documents ouverts sur la meme application s'ecrasaient l'un l'autre.
 * Sequence rejouee au navigateur, deux onglets, avant correctif :
 *
 *   A joue la carte 009 niveau 1  base historique {"seconde-guerre-mondiale-001":[1]}
 *   B tire la meme carte          ses dix crans affiches "libre"
 *   B choisit le niveau 1         B pose LA MEME QUESTION MOT POUR MOT
 *   B revele                      le tour de A est remplace en base
 *   B signale                     le signalement de A a disparu de la base
 *
 * L'abonnement est la moitie du correctif qu'un test sans navigateur peut
 * prouver ; l'autre moitie, la regle de fusion, est dans
 * `app/__tests__/reconciliation.test.ts`. Le decoupage suit la regle de
 * dependance : `storage/` n'importe rien, donc il ne sait rien d'un historique
 * de jeu et ne peut que dire QUELLE clef a bouge.
 */

import { cleDe, SUFFIXES } from "./cles";
import { abonnerAuxEcrituresVoisines, suffixesTouches } from "./voisinage";

/* --- 1. Quelle clef a bouge ---------------------------------------------- */

describe("la lecture du nom de clef", () => {
  it("reconnait chacune des quatre clefs, sous son nom complet", () => {
    for (const suffixe of SUFFIXES) {
      expect(suffixesTouches(cleDe(suffixe))).toEqual([suffixe]);
    }
  });

  /*
   * `null` est ce que le navigateur envoie sur un `clear()`. Le confondre avec
   * "aucune clef touchee" laisserait un document afficher un historique et des
   * signalements que plus rien ne porte.
   */
  it("traite l'effacement total comme touchant les quatre clefs", () => {
    expect(suffixesTouches(null)).toEqual(SUFFIXES);
  });

  /*
   * Le stockage d'une origine est partage par tout ce qui y tourne. Sans ce
   * tri, une autre application servie depuis le meme hote ferait relire les
   * quatre clefs a chaque frappe.
   */
  it("ignore ce qui ne nous appartient pas", () => {
    expect(suffixesTouches("autre-application:brouillon")).toEqual([]);
    expect(suffixesTouches("")).toEqual([]);
  });

  /*
   * Une clef d'une AUTRE version n'est pas la clef courante : c'est le sujet
   * meme du prefixe de version (cles.ts), et une migration ecrira sous un nom
   * que l'application courante ne relit pas.
   */
  it("ignore une clef d'une autre version", () => {
    expect(suffixesTouches("diez:v0:tour")).toEqual([]);
    expect(suffixesTouches("diez:v2:historique")).toEqual([]);
  });

  it("ignore un nom qui contient le notre sans etre le notre", () => {
    expect(suffixesTouches(`${cleDe("tour")}:brouillon`)).toEqual([]);
  });
});

/* --- 2. L'abonnement ------------------------------------------------------ */

/*
 * LE CABLAGE, ET NON PLUS SEULEMENT LA LECTURE DU NOM. Un abonnement qu'aucun
 * controle n'a vu s'inscrire n'est pas un abonnement, c'est un commentaire :
 * c'est la mesure qui avait deja motive l'extraction d'`abonnerALaVisibilite`
 * (app/execution.ts).
 */
describe("l'abonnement aux ecritures voisines", () => {
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
      /*
       * Un `StorageEvent` n'existe pas sous Node, et le module n'en lit qu'un
       * champ : le nom de la clef. La sonde fabrique donc exactement cela, ce
       * qui est aussi ce que la signature declare dependre.
       */
      ecrire: (nom: string | null) => ecouteurs.get("storage")?.({ key: nom } as unknown as Event),
    };
  };

  it("inscrit un ecouteur d'ecriture", () => {
    const f = fausseCible();
    abonnerAuxEcrituresVoisines(f.cible, () => {});
    expect(f.inscrits()).toEqual(["storage"]);
  });

  it("previent avec la clef touchee", () => {
    const f = fausseCible();
    const vus: string[][] = [];
    abonnerAuxEcrituresVoisines(f.cible, (suffixes) => vus.push([...suffixes]));

    f.ecrire(cleDe("historique"));
    f.ecrire(cleDe("signalements"));
    expect(vus).toEqual([["historique"], ["signalements"]]);
  });

  it("ne previent pas pour une clef etrangere", () => {
    const f = fausseCible();
    let vus = 0;
    abonnerAuxEcrituresVoisines(f.cible, () => {
      vus += 1;
    });

    f.ecrire("autre-application:brouillon");
    expect(vus).toBe(0);
  });

  it("previent des quatre clefs sur un effacement total", () => {
    const f = fausseCible();
    const vus: string[][] = [];
    abonnerAuxEcrituresVoisines(f.cible, (suffixes) => vus.push([...suffixes]));

    f.ecrire(null);
    expect(vus).toEqual([[...SUFFIXES]]);
  });

  it("se desabonne vraiment, et ne previent plus ensuite", () => {
    const f = fausseCible();
    let vus = 0;
    const desabonner = abonnerAuxEcrituresVoisines(f.cible, () => {
      vus += 1;
    });

    desabonner();
    expect(f.inscrits()).toEqual([]);
    f.ecrire(cleDe("historique"));
    expect(vus).toBe(0);
  });
});
