/*
 * Diez : la pile des panneaux ouverts, rejouee sans DOM.
 *
 * POURQUOI CETTE SUITE VIT DANS app/ ALORS QUE LE MODULE VIT DANS design/.
 * `vitest.config.ts` n'inclut que `domain/`, `app/`, `storage/` et `tools/`,
 * et cette restriction est deliberee : elle empeche qu'une suite d'ecran
 * s'installe sans qu'on l'ait decide. Une sonde deposee a cote du module ne
 * serait donc jamais LANCEE, ce qui est pire que pas de sonde du tout. Elle est
 * ici parce que `app/` importe legitimement `design/`, c'est le meme
 * raisonnement qui a mis `tools/garde-p2.test.ts` dans `tools/`.
 *
 * La FABRIQUE est eprouvee, jamais la pile de module : `PANNEAUX` est un etat
 * global, et deux controles qui se le partagent ne se relisent plus.
 *
 * LE DEFAUT REPARE, MESURE AU NAVIGATEUR. Menu et Confirmation ouverts, un seul
 * Echap :
 *
 *   AVANT   panneaux ["Menu", "Reinitialiser l'historique"]
 *   APRES   panneaux []                       focus BODY
 *
 * Les deux panneaux se fermaient, alors qu'un seul devait repondre, et le focus
 * retombait sur `<body>` : la Confirmation le rend au bouton qui l'a ouverte,
 * or ce bouton vit dans le menu, que le meme geste venait de demonter.
 */

import { creerPileDePanneaux } from "../../design/panneaux";

/** Un panneau de sonde : il retient qu'on lui a demande de se fermer. */
function panneauDeTest(nom: string, journal: string[]) {
  return { fermer: () => journal.push(nom) };
}

describe("la pile des panneaux", () => {
  it("est vide au depart, et ne trouve rien a fermer", () => {
    const pile = creerPileDePanneaux();
    expect(pile.hauteur()).toBe(0);
    expect(pile.fermerLeDessus()).toBe(false);
  });

  it("compte les panneaux ouverts", () => {
    const pile = creerPileDePanneaux();
    const journal: string[] = [];
    pile.inscrire(panneauDeTest("menu", journal).fermer);
    expect(pile.hauteur()).toBe(1);
    pile.inscrire(panneauDeTest("confirmation", journal).fermer);
    expect(pile.hauteur()).toBe(2);
  });

  /*
   * LE CONTROLE QUI PORTE LE CORRECTIF. Deux panneaux ouverts, un seul geste :
   * la Confirmation se ferme, le menu qui l'a ouverte RESTE. C'est ce que le
   * geste de retour demande, et c'est ce qu'Echap fait desormais.
   */
  it("ne ferme que le panneau du DESSUS, et laisse celui d'en dessous", () => {
    const pile = creerPileDePanneaux();
    const journal: string[] = [];
    pile.inscrire(panneauDeTest("menu", journal).fermer);
    pile.inscrire(panneauDeTest("confirmation", journal).fermer);

    expect(pile.fermerLeDessus()).toBe(true);
    expect(journal).toEqual(["confirmation"]);
  });

  it("designe le dernier inscrit comme celui du dessus, et lui seul", () => {
    const pile = creerPileDePanneaux();
    const journal: string[] = [];
    const menu = pile.inscrire(panneauDeTest("menu", journal).fermer);
    expect(menu.estAuDessus()).toBe(true);

    const confirmation = pile.inscrire(panneauDeTest("confirmation", journal).fermer);
    expect(menu.estAuDessus()).toBe(false);
    expect(confirmation.estAuDessus()).toBe(true);
  });

  it("rend le dessus au panneau d'en dessous quand celui du dessus se retire", () => {
    const pile = creerPileDePanneaux();
    const journal: string[] = [];
    const menu = pile.inscrire(panneauDeTest("menu", journal).fermer);
    const confirmation = pile.inscrire(panneauDeTest("confirmation", journal).fermer);

    confirmation.retirer();
    expect(pile.hauteur()).toBe(1);
    expect(menu.estAuDessus()).toBe(true);

    expect(pile.fermerLeDessus()).toBe(true);
    expect(journal).toEqual(["menu"]);
  });

  /*
   * FERMER N'EST PAS DEPILER. Fermer est une demande adressee a React, qui
   * demontera le composant ; c'est le demontage qui retire. Depiler tout de
   * suite laisserait la pile en avance d'un cran sur le document, et le geste
   * suivant fermerait un panneau qui n'est pas celui qu'on voit.
   */
  it("ne depile pas d'elle-meme : le panneau se retire en se demontant", () => {
    const pile = creerPileDePanneaux();
    const journal: string[] = [];
    const menu = pile.inscrire(panneauDeTest("menu", journal).fermer);

    pile.fermerLeDessus();
    expect(pile.hauteur()).toBe(1);

    menu.retirer();
    expect(pile.hauteur()).toBe(0);
  });

  /*
   * React monte, demonte puis remonte les effets en developpement : un retrait
   * aveugle enleverait alors le panneau du voisin plutot qu'un panneau deja
   * parti.
   */
  it("supporte un retrait repete sans emporter le panneau voisin", () => {
    const pile = creerPileDePanneaux();
    const journal: string[] = [];
    const menu = pile.inscrire(panneauDeTest("menu", journal).fermer);
    const confirmation = pile.inscrire(panneauDeTest("confirmation", journal).fermer);

    confirmation.retirer();
    confirmation.retirer();
    expect(pile.hauteur()).toBe(1);
    expect(menu.estAuDessus()).toBe(true);
  });

  it("ferme la version la plus recente du rappel, pas celle de l'inscription", () => {
    const pile = creerPileDePanneaux();
    const journal: string[] = [];
    let nom = "ancien";
    pile.inscrire(() => journal.push(nom));
    nom = "recent";
    pile.fermerLeDessus();
    expect(journal).toEqual(["recent"]);
  });
});

/*
 * L'ABONNEMENT EST CE QUI ARME LA GARDE DE RETOUR. `app/` lit la hauteur de la
 * pile pour savoir s'il y a quelque chose a fermer avant de reculer dans la
 * partie : une pile qui changerait sans prevenir laisserait la garde desarmee,
 * donc le balayage sortirait de l'application, ce qui est exactement le defaut
 * repare.
 */
describe("l'abonnement a la pile", () => {
  it("previent a l'ouverture d'un panneau", () => {
    const pile = creerPileDePanneaux();
    const hauteurs: number[] = [];
    pile.abonner(() => hauteurs.push(pile.hauteur()));

    pile.inscrire(() => {});
    pile.inscrire(() => {});
    expect(hauteurs).toEqual([1, 2]);
  });

  it("previent a la fermeture reelle, celle qui retire", () => {
    const pile = creerPileDePanneaux();
    const hauteurs: number[] = [];
    const menu = pile.inscrire(() => {});
    pile.abonner(() => hauteurs.push(pile.hauteur()));

    menu.retirer();
    expect(hauteurs).toEqual([0]);
  });

  it("se desabonne vraiment, et ne previent plus ensuite", () => {
    const pile = creerPileDePanneaux();
    const hauteurs: number[] = [];
    const desabonner = pile.abonner(() => hauteurs.push(pile.hauteur()));

    desabonner();
    pile.inscrire(() => {});
    expect(hauteurs).toEqual([]);
  });

  it("previent tous les abonnes, et non le dernier seul", () => {
    const pile = creerPileDePanneaux();
    let premier = 0;
    let second = 0;
    pile.abonner(() => {
      premier += 1;
    });
    pile.abonner(() => {
      second += 1;
    });

    pile.inscrire(() => {});
    expect([premier, second]).toEqual([1, 1]);
  });
});
