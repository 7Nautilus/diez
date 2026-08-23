/*
 * Diez : les quatre clefs du stockage, et leur version.
 *
 * Les noms sont fixes par architecture.md section 7 et ne s'ecrivent qu'ici :
 * un module qui recopierait "diez:v1:tour" au point d'usage ferait diverger la
 * lecture de l'ecriture le jour d'une renumerotation, et cette divergence ne se
 * verrait qu'a l'execution, sur le telephone d'un ami.
 */

/**
 * Le prefixe de version, et il n'est pas decoratif.
 *
 * Le jour ou la forme d'une valeur change, on ecrit une migration `v1` vers
 * `v2` au lieu de faire planter un telephone sur une clef perimee
 * (architecture.md section 7). Le mecanisme qui la portera vit dans
 * migration.ts, ou le present commentaire dit pourquoi il est vide aujourd'hui.
 *
 * `cles.test.ts` fige les quatre noms complets : changer cette constante fait
 * echouer la suite. C'est voulu, et c'est le seul rappel automatique qui existe
 * qu'une version qui bouge sans migration abandonne les donnees des joueurs.
 */
export const VERSION = "v1";

/**
 * Les quatre valeurs persistees, dans l'ordre d'architecture.md section 7.
 *
 * Ecrites en VALEUR et le type deduit, comme `MODES_AFFICHAGE` cote ecrans : un
 * type union ne s'enumere pas a l'execution, or le test doit pouvoir parcourir
 * la liste pour verifier chaque nom.
 */
export const SUFFIXES = ["historique", "reglages", "signalements", "tour"] as const;

export type Suffixe = (typeof SUFFIXES)[number];

/**
 * Le nom complet d'une clef.
 *
 * `version` est un parametre plutot qu'une lecture directe de `VERSION` pour
 * une seule raison, et elle est le sujet de ce fichier : une migration doit
 * pouvoir fabriquer le nom d'une clef d'une version qu'on ne publie plus, sans
 * quoi elle n'aurait aucun moyen d'aller lire ce qu'elle vient convertir.
 */
export function cleDe(suffixe: Suffixe, version: string = VERSION): string {
  return `diez:${version}:${suffixe}`;
}
