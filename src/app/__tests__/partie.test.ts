/*
 * Diez : le contrat de composition, rejoue.
 *
 * POURQUOI CETTE SUITE EXISTE ALORS QUE LES TESTS SONT RESERVES A domain/ ET
 * tools/ (conventions-code.md section 9). Parce que l'invariant le plus
 * delicat du projet ne peut etre tenu par aucun des deux. Le niveau se
 * consomme SUR CHOISIR, a l'entree en QUESTION, jamais a la fin du tour
 * (architecture.md section 6) ; or `reduire` ne recoit ni ne rend d'Historique
 * et `consommer` vit dans paquet.ts. Le domaine n'en prouve donc que la
 * moitie, celle que sa signature lui impose : n'ayant aucun acces a
 * l'historique, il ne peut rien consommer. L'autre moitie, "sur choisir et
 * seulement la", vit dans src/app/partie.ts et se verifie en rejouant la
 * sequence complete, ce que ce fichier fait.
 *
 * Il n'y a pas de React ici et il ne doit pas y en avoir : `avancer` est pur,
 * l'horloge et l'aleatoire lui arrivent en valeur. Une suite qui monterait des
 * composants testerait le rendu, pas le contrat.
 */

import { carteDeTest } from "../../domain/__tests__/fixtures";
import { type Niveau, type PaquetId, VERROU_MS } from "../../domain/types";
import { avancer, type EtatPartie, etatInitial, type Geste } from "../partie";

/*
 * Deux cartes : `suivante` ne se prouve qu'en changeant de carte, et avec une
 * seule le tirage rendrait la meme et masquerait une reconduction.
 */
const PREMIERE = "carte-a";
const SECONDE = "carte-b";
const CORPUS = [carteDeTest(PREMIERE), carteDeTest(SECONDE)];
const PAQUETS: readonly PaquetId[] = ["general"];

/*
 * Le tirage est FIXE a zero, donc le premier element du meilleur palier. La
 * pioche devient ainsi deterministe : carte-a d'abord, les deux etant
 * inedites, puis carte-b une fois la premiere entamee (domain/paquet.ts,
 * priorite aux cartes jamais sorties).
 */
const TIRAGE = 0;

/* Le pas d'horloge laisse passer chaque geste : le verrou rejette en dessous
   de VERROU_MS, pas a la valeur exacte. */
const PAS = VERROU_MS;
const OUVERTURE = 10_000;

const NIVEAU_JOUE: Niveau = 4;
const AUTRE_NIVEAU: Niveau = 7;

function rejouer(gestes: readonly Geste[]): EtatPartie {
  let etat = etatInitial(PAQUETS);
  let horloge = OUVERTURE;
  for (const geste of gestes) {
    horloge += PAS;
    etat = avancer(CORPUS, etat, { geste, maintenant: horloge, tirage: TIRAGE });
  }
  return etat;
}

const PIOCHER: Geste = { type: "piocher" };
const ANNONCER: Geste = { type: "annoncer" };
const CHOISIR: Geste = { type: "choisir", niveau: NIVEAU_JOUE };
const REVELER: Geste = { type: "reveler" };
const SUIVANTE: Geste = { type: "suivante" };

describe("Le moment ou un niveau est consomme", () => {
  it("ne consomme rien tant que le niveau n'est pas choisi", () => {
    const etat = rejouer([PIOCHER, ANNONCER]);
    expect(etat.tour.phase).toBe("NIVEAU");
    expect(etat.historique).toEqual({});
  });

  it("consomme sur choisir, a l'entree en QUESTION", () => {
    const etat = rejouer([PIOCHER, ANNONCER, CHOISIR]);
    expect(etat.tour.phase).toBe("QUESTION");
    expect(etat.historique[PREMIERE]).toEqual([NIVEAU_JOUE]);
  });

  /*
   * Le controle qui compte vraiment. Consommer a la fin du tour laisserait la
   * question rejouable si l'application meurt entre-temps, donc quelqu'un
   * pourrait reentendre une question que la table a deja entendue.
   */
  it("ne consomme rien de plus a la revelation ni a la carte suivante", () => {
    const etat = rejouer([PIOCHER, ANNONCER, CHOISIR, REVELER, SUIVANTE]);
    expect(etat.tour.phase).toBe("THEME");
    expect(etat.historique[PREMIERE]).toEqual([NIVEAU_JOUE]);
    expect(etat.historique[SECONDE]).toBeUndefined();
  });

  it("consomme une seule fois par tour, meme sur deux tours de suite", () => {
    const etat = rejouer([
      PIOCHER,
      ANNONCER,
      CHOISIR,
      REVELER,
      SUIVANTE,
      ANNONCER,
      { type: "choisir", niveau: AUTRE_NIVEAU },
    ]);
    expect(etat.historique[PREMIERE]).toEqual([NIVEAU_JOUE]);
    expect(etat.historique[SECONDE]).toEqual([AUTRE_NIVEAU]);
  });

  /*
   * Sans ce controle, un tremblement de pouce brulerait un niveau que personne
   * n'a vu : le reducteur rejette la transition, et l'appelant pourrait
   * consommer quand meme.
   */
  it("ne consomme rien quand le verrou rejette le choix", () => {
    let etat = rejouer([PIOCHER, ANNONCER]);
    const entree = etat.tour.phase === "NIVEAU" ? etat.tour.depuis : 0;
    etat = avancer(CORPUS, etat, {
      geste: CHOISIR,
      maintenant: entree + VERROU_MS - 1,
      tirage: TIRAGE,
    });
    expect(etat.tour.phase).toBe("NIVEAU");
    expect(etat.historique).toEqual({});
  });
});

describe("P3 au niveau de la composition", () => {
  it("ne met aucun enonce dans l'etat avant la phase QUESTION", () => {
    const etat = rejouer([PIOCHER, ANNONCER]);
    expect(JSON.stringify(etat.tour)).not.toContain("Énoncé de niveau");
  });

  /*
   * L'invariant le plus important du projet : le narrateur lit a voix haute en
   * fixant son ecran. Le texte cherche est celui que `carteDeTest` met dans
   * chaque reponse.
   */
  it("ne met aucune reponse dans l'etat avant la phase REPONSE", () => {
    const etat = rejouer([PIOCHER, ANNONCER, CHOISIR]);
    expect(etat.tour.phase).toBe("QUESTION");
    expect(JSON.stringify(etat.tour)).not.toContain("Réponse de niveau");
  });

  it("la reponse arrive avec la revelation, et pas avant", () => {
    const etat = rejouer([PIOCHER, ANNONCER, CHOISIR, REVELER]);
    expect(etat.tour.phase).toBe("REPONSE");
    expect(JSON.stringify(etat.tour)).toContain("Réponse de niveau");
  });
});

describe("Le verrou protege la phase, pas seulement les transitions", () => {
  it("rejette un signalement arrive trop tot", () => {
    let etat = rejouer([PIOCHER, ANNONCER, CHOISIR, REVELER]);
    const entree = etat.tour.phase === "REPONSE" ? etat.tour.depuis : 0;
    etat = avancer(CORPUS, etat, {
      geste: { type: "signaler" },
      maintenant: entree + VERROU_MS - 1,
      tirage: TIRAGE,
    });
    expect(etat.signalements).toEqual([]);
  });

  it("accepte un signalement passe le delai, et ne le compte qu'une fois", () => {
    const etat = rejouer([
      PIOCHER,
      ANNONCER,
      CHOISIR,
      REVELER,
      { type: "signaler" },
      { type: "signaler" },
    ]);
    expect(etat.signalements).toHaveLength(1);
    expect(etat.signalements[0]?.carte).toBe(PREMIERE);
    expect(etat.signalements[0]?.niveau).toBe(NIVEAU_JOUE);
  });
});

describe("L'epuisement", () => {
  it("ne plante pas et se signale quand il n'y a rien a piocher", () => {
    const etat = rejouer([{ type: "basculerPaquet", paquet: "general" }, PIOCHER]);
    expect(etat.tour.phase).toBe("REPOS");
    expect(etat.epuise).toBe(true);
  });

  it("repart apres une reinitialisation", () => {
    const etat = rejouer([
      { type: "basculerPaquet", paquet: "general" },
      PIOCHER,
      { type: "basculerPaquet", paquet: "general" },
      PIOCHER,
    ]);
    expect(etat.tour.phase).toBe("THEME");
    expect(etat.epuise).toBe(false);
  });
});
