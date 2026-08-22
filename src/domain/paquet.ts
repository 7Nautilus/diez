/*
 * Diez : pioche, filtres et anti-repetition.
 *
 * Toutes les fonctions sont pures et rendent de nouvelles valeurs.
 * `Historique` n'est jamais mute : c'est ce qui permet de rejouer une
 * sequence entiere en test sans etat cache.
 */

import {
  type Aleatoire,
  type Carte,
  type CarteId,
  type Historique,
  NIVEAUX,
  type Niveau,
  type PaquetId,
  type ResumeCarte,
} from "./types";

/**
 * Les niveaux deja brules sur une carte, dans leur ordre de consommation.
 *
 * Une carte inconnue de l'historique n'a rien de consomme : c'est le cas
 * normal d'une carte jamais sortie, pas une anomalie.
 */
export function niveauxConsommes(historique: Historique, carteId: CarteId): readonly Niveau[] {
  return historique[carteId] ?? [];
}

/**
 * Les cartes encore jouables : celles des paquets actifs auxquelles il reste
 * au moins une question inedite (architecture.md section 6, etapes 1 et 2).
 *
 * L'ordre du corpus est preserve. C'est ce qui rend la pioche reproductible a
 * `aleatoire` fixe, donc testable.
 */
export function cartesRestantes(
  corpus: readonly Carte[],
  historique: Historique,
  paquetsActifs: readonly PaquetId[],
): readonly Carte[] {
  return corpus.filter(
    (carte) =>
      paquetsActifs.includes(carte.paquet) &&
      niveauxConsommes(historique, carte.id).length < NIVEAUX.length,
  );
}

/**
 * Tire une carte, ou rend `null` si le vivier est vide.
 *
 * `null` et non une exception : l'epuisement du stock est un etat de jeu
 * normal, il a son ecran (architecture.md section 6, etape 5). Lever ici
 * transformerait une fin de soiree en plantage.
 */
export function piocher(
  corpus: readonly Carte[],
  historique: Historique,
  paquetsActifs: readonly PaquetId[],
  aleatoire: Aleatoire,
): Carte | null {
  const restantes = cartesRestantes(corpus, historique, paquetsActifs);
  if (restantes.length === 0) return null;

  // Priorite aux cartes jamais sorties, puis aux cartes entamees
  // (architecture.md section 6, etape 3). Une carte entamee n'est tiree que
  // lorsqu'il n'existe plus aucun theme neuf : la table decouvre d'abord, elle
  // termine les fonds de tiroir ensuite.
  const inedites = restantes.filter((carte) => niveauxConsommes(historique, carte.id).length === 0);
  const palier = inedites.length > 0 ? inedites : restantes;

  const index = Math.floor(aleatoire() * palier.length);
  const tiree = palier[index];
  if (tiree === undefined) {
    // `aleatoire` doit rendre un nombre de [0, 1). Hors de cet intervalle
    // l'index sort du palier : c'est un defaut de cablage de la dependance
    // injectee, pas un etat de jeu, et il doit etre bruyant
    // (conventions-code.md section 7).
    throw new Error(
      `aleatoire hors de [0, 1) : index ${index} tire dans un palier de ${palier.length} cartes`,
    );
  }
  return tiree;
}

/**
 * Marque un niveau comme consomme et rend un nouvel historique.
 *
 * L'appelant l'invoque a l'entree en phase QUESTION, sur `choisir`, jamais a
 * la fin du tour (architecture.md section 6). Bruler une question qui ne sera
 * peut-etre jamais lue coute une question sur dix, ce qui est invisible ;
 * reentendre une question deja posee casse la partie.
 */
export function consommer(historique: Historique, carteId: CarteId, niveau: Niveau): Historique {
  const deja = niveauxConsommes(historique, carteId);
  // Un doublon rendrait la carte epuisee avant l'heure : l'epuisement se
  // compte sur la longueur de la liste, pas sur ses valeurs distinctes.
  const suite = deja.includes(niveau) ? deja : [...deja, niveau];
  return { ...historique, [carteId]: suite };
}

/**
 * Reduit une carte a ce que la phase THEME peut montrer.
 *
 * C'est le point ou la carte perd ses questions, et le seul endroit du projet
 * qui fabrique un `ResumeCarte`. P3 tient parce que le reducteur ne recoit
 * jamais autre chose que ce resume : aucun bug d'ecran ne peut divulguer un
 * enonce qui n'est pas dans l'etat.
 */
export function resumer(carte: Carte): ResumeCarte {
  return { id: carte.id, theme: carte.theme, paquet: carte.paquet };
}
