/*
 * Diez : `diez:v1:reglages`, les paquets actifs et le mode d'affichage.
 *
 * UNE SEULE CLEF POUR DEUX REGLAGES, comme l'ecrit architecture.md section 7.
 * D'ou la fusion a l'ecriture : une ecriture qui remplacerait la clef entiere
 * effacerait les paquets a chaque bascule de mode, et le defaut la remettrait
 * tous actifs sans que rien ne le signale.
 *
 * LE VOCABULAIRE ARRIVE PAR PREDICAT, il n'est pas redeclare ici. C'est
 * l'appelant qui sait quelles chaines sont des modes, et le corpus qui dit
 * quels paquets existent (`paquetsDuCorpus`, app/partie.ts) : `ModeAffichage`
 * et `PaquetId` restent ainsi ecrits une seule fois, la ou ils vivent, au lieu
 * d'etre recopies dans une couche qui n'a pas le droit de les importer. C'est
 * la seule des quatre clefs dont le contenu est un vocabulaire plutot qu'une
 * forme, et c'est ce qui la distingue.
 */

import { ecrireBrut, lireBrut } from "./stockage";
import { estListeDe, estObjet, estTexte } from "./validation";

/**
 * Le mode enregistre, ou `defaut` si la clef est absente, illisible ou porteuse
 * d'une valeur que l'appelant ne reconnait pas.
 */
export function lireMode<M extends string>(accepte: (valeur: string) => valeur is M, defaut: M): M {
  const brut = lireBrut("reglages");
  if (!estObjet(brut)) return defaut;
  const { mode } = brut;
  if (!estTexte(mode) || !accepte(mode)) return defaut;
  return mode;
}

/**
 * Les paquets actifs, ou `defaut` si la clef est absente ou de mauvaise FORME.
 *
 * DEUX TRAITEMENTS DIFFERENTS, ET LA DISTINCTION EST LE SUJET DE CETTE
 * FONCTION. Une valeur qui n'est pas une liste de chaines est une corruption :
 * on retombe sur le defaut, comme partout ailleurs. Un identifiant que
 * l'appelant ne reconnait pas est autre chose : le corpus change entre deux
 * versions de l'application, un lot peut disparaitre, et l'identifiant devenu
 * inconnu n'est pas la trace d'une clef abimee mais d'un paquet retire. Il est
 * donc ECARTE, et la selection du narrateur survit pour les autres. Tout ou
 * rien lui rendrait ici tous les paquets actifs, y compris ceux qu'il venait de
 * decocher.
 *
 * Une liste vide apres filtrage n'est pas une erreur : c'est l'etat "aucun
 * paquet coche", que l'accueil sait afficher, `PIOCHER` desactive et raison
 * donnee (recette.md section 1).
 */
export function lirePaquetsActifs<P extends string>(
  accepte: (valeur: string) => valeur is P,
  defaut: readonly P[],
): readonly P[] {
  const brut = lireBrut("reglages");
  if (!estObjet(brut)) return defaut;
  const { paquets } = brut;
  if (paquets === undefined) return defaut;
  if (!estListeDe(paquets, estTexte)) return defaut;
  return paquets.filter(accepte);
}

/**
 * Fusionne un champ dans la clef, en preservant ce qu'elle contient deja.
 *
 * Un contenu illisible est REMPLACE et non conserve : il n'y a rien a preserver
 * dans une valeur dont on vient d'etablir qu'aucune lecture ne l'accepte, et
 * s'obstiner a la garder empecherait la clef de redevenir saine.
 */
function fusionner(champ: string, valeur: unknown): void {
  const brut = lireBrut("reglages");
  const existant = estObjet(brut) ? brut : {};
  ecrireBrut("reglages", { ...existant, [champ]: valeur });
}

export function ecrireMode(mode: string): void {
  fusionner("mode", mode);
}

export function ecrirePaquetsActifs(paquets: readonly string[]): void {
  fusionner("paquets", paquets);
}
