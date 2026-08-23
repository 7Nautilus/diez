/*
 * Diez : le seul endroit du projet qui touche `localStorage`.
 *
 * TROIS FONCTIONS, ET AUCUNE NE LEVE. C'est la raison d'etre du fichier, et le
 * point de fiabilite de toute la phase 5 : le telephone est celui d'un ami un
 * soir de soiree, une clef abimee doit produire une partie neuve et non un
 * ecran blanc (architecture.md section 7).
 *
 * `localStorage` LEVE, et pas seulement quand il est plein. Il est ABSENT en
 * navigation privee sur certaines configurations, absent hors contexte
 * securise, refuse par une politique de site, et il leve a l'ecriture au-dela
 * du quota. Le simple fait de NOMMER l'identifiant leve alors une
 * `ReferenceError`, ce qui n'est pas rattrapable au point d'appel par une garde
 * du genre `if (localStorage)`. D'ou l'enveloppe systematique, y compris autour
 * de la lecture.
 *
 * Aucune valeur n'est validee ici : ce module rend de l'`unknown`, et chaque
 * module de clef possede la forme qu'il accepte. La separation compte, parce
 * qu'un `JSON.parse` reussi ne prouve rien du tout.
 */

import { cleDe, type Suffixe } from "./cles";
import { MIGRATIONS, type Migration, valeurMigree } from "./migration";

function texteBrut(cle: string): string | null {
  try {
    return localStorage.getItem(cle);
  } catch {
    // Stockage indisponible : lecture impossible, pas de partie interrompue.
    return null;
  }
}

/**
 * `undefined` pour "rien a lire", ce qui distingue l'absence d'un `null`
 * reellement enregistre. La nuance n'est pas gratuite : sans elle, une clef
 * contenant le texte "null" declencherait la chaine de migrations a chaque
 * demarrage, alors qu'elle a bien ete ecrite sous la version courante.
 */
function analyser(texte: string | null): unknown {
  if (texte === null) return undefined;
  try {
    return JSON.parse(texte) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Le contenu brut d'une clef, sans aucune validation de forme.
 *
 * La chaine de migrations n'est consultee que si la clef de la version
 * courante est absente : une valeur deja ecrite sous la version courante fait
 * toujours foi, sinon une migration ecraserait a chaque demarrage ce que la
 * soiree vient d'enregistrer.
 *
 * `migrations` est injectable, avec la liste publiee pour defaut. La liste
 * publiee etant VIDE aujourd'hui (migration.ts), c'est la seule facon de voir
 * ce branchement s'executer : un point d'extension qu'aucun test n'a vu
 * fonctionner n'est pas un point d'extension, c'est un commentaire.
 */
export function lireBrut(suffixe: Suffixe, migrations: readonly Migration[] = MIGRATIONS): unknown {
  const courant = analyser(texteBrut(cleDe(suffixe)));
  if (courant !== undefined) return courant;
  return valeurMigree(suffixe, (cle) => analyser(texteBrut(cle)), migrations);
}

export function ecrireBrut(suffixe: Suffixe, valeur: unknown): void {
  try {
    localStorage.setItem(cleDe(suffixe), JSON.stringify(valeur));
  } catch {
    // Un quota atteint ou une politique de site ne valent pas une soiree
    // interrompue. La partie continue en memoire, ce qui est exactement l'etat
    // dans lequel les phases 1 a 4 la jouaient deja.
  }
}

export function effacer(suffixe: Suffixe): void {
  try {
    localStorage.removeItem(cleDe(suffixe));
  } catch {
    // Meme raison qu'a l'ecriture.
  }
}
