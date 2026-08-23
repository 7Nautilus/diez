/*
 * Ce que cette suite protege : le narrateur cesse d'etre un point de
 * defaillance unique. Son ecran se verrouille, il bascule sur ses messages, le
 * systeme evince l'onglet, et la table doit pouvoir reprendre dans la meme
 * phase, sur la meme question (architecture.md section 7).
 *
 * Et son revers, qui compte autant : une clef abimee ne doit jamais faire
 * planter un demarrage, et un tour d'hier ne doit jamais rouvrir une phase
 * QUESTION devant des gens qui n'ont pas entendu la question.
 */

import { cleDe } from "./cles";
import {
  estPaquetFictif,
  installerStockage,
  type PaquetFictif,
  retirerStockage,
  stockageEnMemoire,
} from "./fixtures";
import {
  type EtatTourStocke,
  ecrireTour,
  effacerTour,
  lireTour,
  perime,
  validerEtatTour,
  validerTour,
} from "./tour";

/*
 * La valeur de `TOUR_PERIME_H` (domain/types.ts), recopiee parce que ce test
 * vit dans `storage/`, qui n'importe rien, pas meme le domaine. C'est la meme
 * duplication assumee que celle de l'echelle des niveaux, et elle a la meme
 * portee limitee : ce qui est eprouve ici est le MECANISME de peremption, la
 * valeur reelle etant fournie par le cablage.
 */
const PERIME_APRES_H = 12;
const HEURE_MS = 3_600_000;

const MAINTENANT = Date.UTC(2026, 7, 22, 22, 30);

const CARTE = { id: "alpha-001", theme: "Les volcans", paquet: "alpha" } as const;

const QUESTION: EtatTourStocke<PaquetFictif> = {
  phase: "QUESTION",
  carte: CARTE,
  enonce: { niveau: 7, q: "Lequel est le plus haut ?" },
  depuis: MAINTENANT - 60_000,
};

function enveloppe(tour: unknown, horodatage: number = MAINTENANT): unknown {
  return { tour, horodatage };
}

function avecClef(contenu: unknown): void {
  installerStockage(stockageEnMemoire(new Map([[cleDe("tour"), JSON.stringify(contenu)]])));
}

afterEach(retirerStockage);

describe("les cinq phases se relisent", () => {
  it("REPOS ne porte ni carte ni horodatage d'entree", () => {
    expect(validerEtatTour({ phase: "REPOS" }, estPaquetFictif)).toEqual({ phase: "REPOS" });
  });

  it("THEME porte une carte et la date d'entree dans la phase", () => {
    const tour = { phase: "THEME", carte: CARTE, depuis: 1000 };
    expect(validerEtatTour(tour, estPaquetFictif)).toEqual(tour);
  });

  it("NIVEAU porte en plus les niveaux deja consommes", () => {
    const tour = { phase: "NIVEAU", carte: CARTE, consommes: [1, 4], depuis: 1000 };
    expect(validerEtatTour(tour, estPaquetFictif)).toEqual(tour);
  });

  it("QUESTION porte l'enonce et AUCUNE reponse", () => {
    const relu = validerEtatTour(QUESTION, estPaquetFictif);
    expect(relu).toEqual(QUESTION);
    expect(relu).not.toHaveProperty("reponse");
  });

  it("REPONSE porte l'enonce, la reponse, et sa note d'arbitrage facultative", () => {
    const tour = {
      phase: "REPONSE",
      carte: CARTE,
      enonce: { niveau: 7, q: "Lequel ?" },
      reponse: { r: "L'Ojos del Salado", note: "Le plus haut volcan, pas le plus haut sommet." },
      depuis: 1000,
    };
    expect(validerEtatTour(tour, estPaquetFictif)).toEqual(tour);
  });
});

describe("P3 tient jusque dans le stockage", () => {
  it("une reponse glissee dans une phase QUESTION n'entre pas dans l'etat relu", () => {
    // Le narrateur fixe son ecran en lisant a voix haute : si la reponse
    // vivait dans le meme etat, elle serait a un noeud du document de ce qu'il
    // est en train de prononcer (architecture.md section 5).
    const bricolee = { ...QUESTION, reponse: { r: "L'Ojos del Salado" } };
    const relu = validerEtatTour(bricolee, estPaquetFictif);
    expect(relu).toEqual(QUESTION);
    expect(relu).not.toHaveProperty("reponse");
  });

  it("une note glissee dans un enonce n'entre pas dans l'etat relu", () => {
    const bricolee = { ...QUESTION, enonce: { niveau: 7, q: "Lequel ?", note: "indice" } };
    expect(validerEtatTour(bricolee, estPaquetFictif)).toEqual({
      ...QUESTION,
      enonce: { niveau: 7, q: "Lequel ?" },
    });
  });
});

describe("un tour de mauvaise forme est refuse", () => {
  it("refuse un nom de phase inconnu, cas d'une v2 relue par une v1", () => {
    expect(
      validerEtatTour({ phase: "VERDICT", carte: CARTE, depuis: 1 }, estPaquetFictif),
    ).toBeNull();
    expect(validerEtatTour({ phase: 3 }, estPaquetFictif)).toBeNull();
  });

  it("refuse un tour sans horodatage d'entree, hors REPOS", () => {
    expect(validerEtatTour({ phase: "THEME", carte: CARTE }, estPaquetFictif)).toBeNull();
    expect(
      validerEtatTour({ phase: "THEME", carte: CARTE, depuis: null }, estPaquetFictif),
    ).toBeNull();
    expect(
      validerEtatTour({ phase: "THEME", carte: CARTE, depuis: Number.NaN }, estPaquetFictif),
    ).toBeNull();
  });

  it("refuse une carte incomplete ou vide", () => {
    expect(
      validerEtatTour({ phase: "THEME", carte: { id: "a" }, depuis: 1 }, estPaquetFictif),
    ).toBeNull();
    expect(
      validerEtatTour({ phase: "THEME", carte: { ...CARTE, id: "" }, depuis: 1 }, estPaquetFictif),
    ).toBeNull();
  });

  it("refuse un paquet que l'appelant ne reconnait pas", () => {
    // Le vocabulaire arrive par predicat : `storage/` n'importe rien, donc il
    // ne connait pas la liste des paquets, qui se deduit du corpus.
    const tour = { phase: "THEME", carte: { ...CARTE, paquet: "gamma" }, depuis: 1 };
    expect(validerEtatTour(tour, estPaquetFictif)).toBeNull();
  });

  it("refuse un niveau hors de 1 a 10, dans l'enonce comme dans les consommes", () => {
    expect(
      validerEtatTour({ ...QUESTION, enonce: { niveau: 11, q: "?" } }, estPaquetFictif),
    ).toBeNull();
    expect(
      validerEtatTour(
        { phase: "NIVEAU", carte: CARTE, consommes: [1, 0], depuis: 1 },
        estPaquetFictif,
      ),
    ).toBeNull();
  });

  it("refuse une phase REPONSE dont la reponse manque ou n'est pas du texte", () => {
    const base = { phase: "REPONSE", carte: CARTE, enonce: { niveau: 7, q: "?" }, depuis: 1 };
    expect(validerEtatTour(base, estPaquetFictif)).toBeNull();
    expect(validerEtatTour({ ...base, reponse: { r: 42 } }, estPaquetFictif)).toBeNull();
    expect(validerEtatTour({ ...base, reponse: { r: "ok", note: 5 } }, estPaquetFictif)).toBeNull();
  });

  it("refuse null, un tableau et un nombre", () => {
    expect(validerEtatTour(null, estPaquetFictif)).toBeNull();
    expect(validerEtatTour([], estPaquetFictif)).toBeNull();
    expect(validerEtatTour(42, estPaquetFictif)).toBeNull();
  });
});

describe("l'enveloppe porte le tour ET son horodatage", () => {
  it("accepte une enveloppe complete", () => {
    expect(validerTour(enveloppe(QUESTION), estPaquetFictif)).toEqual({
      tour: QUESTION,
      horodatage: MAINTENANT,
    });
  });

  it("refuse une enveloppe sans horodatage", () => {
    expect(validerTour({ tour: QUESTION }, estPaquetFictif)).toBeNull();
    expect(validerTour({ tour: QUESTION, horodatage: "hier" }, estPaquetFictif)).toBeNull();
  });

  it("refuse un tour pose a nu, sans enveloppe", () => {
    expect(validerTour(QUESTION, estPaquetFictif)).toBeNull();
  });
});

describe("au-dela de la peremption, c'est une autre soiree", () => {
  it("un tour de quelques minutes est une reprise", () => {
    expect(perime(MAINTENANT - 5 * 60_000, MAINTENANT, PERIME_APRES_H)).toBe(false);
  });

  it("un tour a la limite exacte reste une reprise, au-dela il ne l'est plus", () => {
    expect(perime(MAINTENANT - PERIME_APRES_H * HEURE_MS, MAINTENANT, PERIME_APRES_H)).toBe(false);
    expect(perime(MAINTENANT - PERIME_APRES_H * HEURE_MS - 1, MAINTENANT, PERIME_APRES_H)).toBe(
      true,
    );
  });

  it("un tour date du futur est ecarte aussi, cas de l'horloge qui recule", () => {
    // Sans valeur absolue l'ecart serait negatif, donc toujours sous le seuil,
    // et un tour vieux de plusieurs jours serait repris comme s'il datait de la
    // minute.
    expect(perime(MAINTENANT + 48 * HEURE_MS, MAINTENANT, PERIME_APRES_H)).toBe(true);
  });
});

describe("la lecture rend un tour reprenable, ou rien", () => {
  it("reprend dans la meme phase, sur la meme question", () => {
    avecClef(enveloppe(QUESTION));
    expect(lireTour(estPaquetFictif, MAINTENANT, PERIME_APRES_H)).toEqual(QUESTION);
  });

  it("rend rien sans stockage du tout", () => {
    retirerStockage();
    expect(lireTour(estPaquetFictif, MAINTENANT, PERIME_APRES_H)).toBeNull();
  });

  it("rend rien sur une clef corrompue, plutot que de lever au demarrage", () => {
    avecClef({ tour: 42, horodatage: MAINTENANT });
    expect(lireTour(estPaquetFictif, MAINTENANT, PERIME_APRES_H)).toBeNull();
  });

  it("rend rien sur du texte qui n'est pas du JSON", () => {
    installerStockage(stockageEnMemoire(new Map([[cleDe("tour"), "{tour:"]])));
    expect(lireTour(estPaquetFictif, MAINTENANT, PERIME_APRES_H)).toBeNull();
  });

  it("rend rien sur un tour d'hier, donc d'une autre soiree", () => {
    avecClef(enveloppe(QUESTION, MAINTENANT - 13 * HEURE_MS));
    expect(lireTour(estPaquetFictif, MAINTENANT, PERIME_APRES_H)).toBeNull();
  });
});

describe("l'ecriture tient l'invariant de la clef", () => {
  it("un aller-retour rend le tour tel quel", () => {
    installerStockage(stockageEnMemoire());
    ecrireTour(QUESTION, MAINTENANT);
    expect(lireTour(estPaquetFictif, MAINTENANT, PERIME_APRES_H)).toEqual(QUESTION);
  });

  it("ecrire un tour au REPOS EFFACE la clef, il ne l'enregistre pas", () => {
    // La clef porte un tour EN COURS, et REPOS n'en est pas un. En faire une
    // consequence de l'ecriture retire au cablage la seule facon d'oublier
    // l'effacement demande par architecture.md section 7 sur `terminer()`.
    installerStockage(stockageEnMemoire());
    ecrireTour(QUESTION, MAINTENANT);
    ecrireTour({ phase: "REPOS" }, MAINTENANT);
    expect(lireTour(estPaquetFictif, MAINTENANT, PERIME_APRES_H)).toBeNull();
  });

  it("l'effacement explicite rend la clef a son absence", () => {
    installerStockage(stockageEnMemoire());
    ecrireTour(QUESTION, MAINTENANT);
    effacerTour();
    expect(lireTour(estPaquetFictif, MAINTENANT, PERIME_APRES_H)).toBeNull();
  });

  it("l'horodatage d'ecriture ne remplace pas la date d'entree dans la phase", () => {
    // `depuis` sert au verrou d'entree (domain/tour.ts). Le remplacer par
    // l'heure de la reprise armerait un verrou de 400 ms au moment precis ou
    // le narrateur rouvre l'application et appuie.
    installerStockage(stockageEnMemoire());
    ecrireTour(QUESTION, MAINTENANT + 3 * HEURE_MS);
    const relu = lireTour(estPaquetFictif, MAINTENANT + 3 * HEURE_MS, PERIME_APRES_H);
    expect(relu?.phase === "QUESTION" ? relu.depuis : null).toBe(QUESTION.depuis);
  });
});
