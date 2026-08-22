/*
 * Diez : les cas limites du corpus.
 *
 * Le corpus est un parametre, jamais un import (spec-fondations.md, phase 2,
 * decision 1). Le domaine ne sait donc pas d'ou il vient, et rien ne lui
 * garantit qu'il ressemble a ce que le pipeline de contenu produit : il peut
 * etre vide, tenir en une seule carte, ou etre accompagne d'un historique qui
 * parle de cartes disparues. Ce fichier fixe ce que le domaine doit faire dans
 * chacun de ces cas, et surtout qu'aucun d'eux n'est un plantage.
 *
 * Les fixtures sont construites et jamais lues depuis content/ : le domaine ne
 * connait pas le corpus reel, et un test qui en dependrait casserait le jour ou
 * une carte y est renommee.
 */

import { cartesRestantes, niveauxConsommes, piocher } from "../paquet";
import { type Aleatoire, type Carte, type Historique, NIVEAUX, type PaquetId } from "../types";
import { carteDeTest } from "./fixtures";

/**
 * Un aleatoire fige : la pioche doit se rejouer a l'identique, sans hasard
 * (spec-fondations.md, phase 2, decision 2).
 */
function aleatoireFige(valeur: number): Aleatoire {
  return () => valeur;
}

/**
 * Juste sous la borne haute de [0, 1), le seul intervalle que `Aleatoire`
 * promet. Un cas limite qui ne serait eprouve qu'a 0 laisserait passer un
 * tirage qui lit la mauvaise extremite du palier.
 */
const PRESQUE_UN = 0.999999;

const TOUS_LES_PAQUETS: readonly PaquetId[] = ["general", "maison", "_fixtures"];

describe("Cas limites du corpus", () => {
  it("un corpus vide n'a rien à tirer, et ce n'est pas une exception", () => {
    const corpusVide: readonly Carte[] = [];

    expect(cartesRestantes(corpusVide, {}, TOUS_LES_PAQUETS)).toEqual([]);
    expect(() => piocher(corpusVide, {}, TOUS_LES_PAQUETS, aleatoireFige(0))).not.toThrow();
    expect(piocher(corpusVide, {}, TOUS_LES_PAQUETS, aleatoireFige(0))).toBeNull();
  });

  it("sans aucun paquet actif, il n'y a rien à tirer non plus", () => {
    const carte = carteDeTest("general-001", "general");
    const aucunPaquet: readonly PaquetId[] = [];

    expect(cartesRestantes([carte], {}, aucunPaquet)).toEqual([]);
    expect(piocher([carte], {}, aucunPaquet, aleatoireFige(0))).toBeNull();
  });

  it("il suffit d'un seul niveau inédit pour qu'une carte reste piochable", () => {
    const carte = carteDeTest("limites-001", "general");
    // Tous les niveaux sauf le dernier, derives de NIVEAUX plutot qu'ecrits :
    // le seuil d'epuisement d'une carte est la longueur de cette liste, et
    // c'est la sa seule ecriture dans le domaine (types.ts).
    const historique: Historique = { [carte.id]: NIVEAUX.slice(0, -1) };

    const consommes = niveauxConsommes(historique, carte.id);
    expect(consommes).toHaveLength(NIVEAUX.length - 1);
    expect(NIVEAUX.filter((niveau) => !consommes.includes(niveau))).toEqual(NIVEAUX.slice(-1));

    expect(cartesRestantes([carte], historique, TOUS_LES_PAQUETS)).toEqual([carte]);
    expect(piocher([carte], historique, TOUS_LES_PAQUETS, aleatoireFige(0))).toEqual(carte);
  });

  it("un identifiant d'historique absent du corpus est ignoré, jamais fatal", () => {
    const presente = carteDeTest("presente-001", "general");
    // Une carte retiree du corpus reste citee par les historiques deja poses
    // sur les telephones : un identifiant ne se recycle pas, mais il peut
    // disparaitre (architecture.md section 4). Elle est ici epuisee, l'etat le
    // plus penalisant si la pioche parcourait l'historique au lieu du corpus.
    const historique: Historique = { "disparue-001": NIVEAUX };

    expect(niveauxConsommes(historique, presente.id)).toEqual([]);
    expect(cartesRestantes([presente], historique, TOUS_LES_PAQUETS)).toEqual([presente]);
    expect(() => piocher([presente], historique, TOUS_LES_PAQUETS, aleatoireFige(0))).not.toThrow();
    expect(piocher([presente], historique, TOUS_LES_PAQUETS, aleatoireFige(0))).toEqual(presente);
  });

  it("un paquet inactif reste exclu, même quand sa carte n'a jamais été vue", () => {
    const inactiveEtNeuve = carteDeTest("maison-001", "maison");
    const activeEtEntamee = carteDeTest("general-001", "general");
    const corpus: readonly Carte[] = [inactiveEtNeuve, activeEtEntamee];
    const historique: Historique = { [activeEtEntamee.id]: [1] };
    const paquetsActifs: readonly PaquetId[] = ["general"];

    expect(cartesRestantes(corpus, historique, paquetsActifs)).toEqual([activeEtEntamee]);
    // La priorite aux cartes jamais sorties ne s'exerce qu'apres le filtre des
    // paquets : les etapes 1 et 3 d'architecture.md section 6 sont ordonnees,
    // et c'est exactement ce que ce cas met en jeu.
    expect(piocher(corpus, historique, paquetsActifs, aleatoireFige(0))).toEqual(activeEtEntamee);
    expect(piocher(corpus, historique, paquetsActifs, aleatoireFige(PRESQUE_UN))).toEqual(
      activeEtEntamee,
    );
  });

  it("une entrée d'historique sans aucun niveau vaut une carte jamais sortie", () => {
    const jamaisSortie = carteDeTest("neuve-001", "general");
    const entamee = carteDeTest("entamee-001", "general");
    // L'entamee est placee en tete du corpus : un tirage qui designerait le
    // bon palier puis lirait l'index dans la liste complete la rendrait.
    const corpus: readonly Carte[] = [entamee, jamaisSortie];
    const historique: Historique = { [jamaisSortie.id]: [], [entamee.id]: [1] };

    expect(piocher(corpus, historique, TOUS_LES_PAQUETS, aleatoireFige(0))).toEqual(jamaisSortie);
    expect(piocher(corpus, historique, TOUS_LES_PAQUETS, aleatoireFige(PRESQUE_UN))).toEqual(
      jamaisSortie,
    );
  });

  it("une carte seule et neuve est tirée quelle que soit la valeur de l'aléatoire", () => {
    const seule = carteDeTest("seule-001", "general");

    expect(cartesRestantes([seule], {}, TOUS_LES_PAQUETS)).toEqual([seule]);
    expect(piocher([seule], {}, TOUS_LES_PAQUETS, aleatoireFige(0))).toEqual(seule);
    expect(piocher([seule], {}, TOUS_LES_PAQUETS, aleatoireFige(PRESQUE_UN))).toEqual(seule);
  });

  it("la priorité aux cartes jamais sorties est un ordre, jamais un filtre", () => {
    const seule = carteDeTest("seule-001", "general");
    // Seule et entamee : le palier des cartes neuves est vide, mais il reste
    // des questions inedites, donc le vivier ne l'est pas. Rendre `null` ici
    // afficherait l'ecran d'epuisement sur un stock qui n'est pas epuise.
    const historique: Historique = { [seule.id]: [1, 2, 3] };

    expect(cartesRestantes([seule], historique, TOUS_LES_PAQUETS)).toEqual([seule]);
    expect(piocher([seule], historique, TOUS_LES_PAQUETS, aleatoireFige(0))).toEqual(seule);
    expect(piocher([seule], historique, TOUS_LES_PAQUETS, aleatoireFige(PRESQUE_UN))).toEqual(
      seule,
    );
  });

  it("une carte seule dont tous les niveaux sont consommés laisse le vivier vide", () => {
    const seule = carteDeTest("seule-001", "general");
    const historique: Historique = { [seule.id]: NIVEAUX };

    expect(niveauxConsommes(historique, seule.id)).toHaveLength(NIVEAUX.length);
    expect(cartesRestantes([seule], historique, TOUS_LES_PAQUETS)).toEqual([]);
    expect(piocher([seule], historique, TOUS_LES_PAQUETS, aleatoireFige(0))).toBeNull();
  });
});
