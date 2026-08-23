/*
 * Diez : l'endroit ou s'ecrira la migration d'une version de stockage a la
 * suivante. Il est VIDE, et il est cable.
 *
 * POURQUOI VIDE. Une v1 n'a par definition aucune version anterieure a lire :
 * la premiere migration ne peut s'ecrire que le jour ou `VERSION` passe a
 * `v2`, donc le jour ou une forme change reellement. Ecrire aujourd'hui une
 * conversion imaginaire reviendrait a deviner la forme future, ce qui est
 * exactement le genre de code que personne ne relit et que personne ne teste.
 *
 * POURQUOI QUAND MEME CABLE. Ce qui coute cher le jour d'une migration n'est
 * pas la conversion, qui tient en quelques lignes, c'est la plomberie : savoir
 * ou l'appeler, dans quel ordre, et ne pas oublier une clef sur les quatre.
 * `lireBrut` appelle donc deja `valeurMigree` (stockage.ts) : ajouter une
 * migration se reduit a poser un objet dans `MIGRATIONS`, et le chemin qui l'y
 * mene est teste aujourd'hui avec une migration factice. Un point d'extension
 * qu'aucun test n'a vu s'executer n'est pas un point d'extension, c'est un
 * commentaire.
 */

import { cleDe, type Suffixe } from "./cles";

/**
 * Ce que sait faire une migration : lire une clef d'une version donnee et en
 * rendre le contenu sous la forme courante.
 *
 * `convertir` recoit le suffixe parce qu'un changement de forme touche rarement
 * une seule des quatre clefs, et qu'une migration par clef multiplierait par
 * quatre le nombre d'entrees a tenir a jour.
 *
 * Rendre `undefined` signifie "je ne sais pas recuperer cette valeur" : la
 * chaine continue, et a defaut le validateur de la clef retombera sur son
 * defaut. C'est la meme regle que partout ailleurs ici, une donnee qu'on ne
 * sait pas relire ne doit jamais faire echouer un demarrage.
 */
export type Migration = {
  /** La version dont cette migration sait lire les clefs, sans le prefixe. */
  depuis: string;
  convertir: (suffixe: Suffixe, ancien: unknown) => unknown;
};

/**
 * Vide aujourd'hui : voir l'en-tete de ce fichier. Les migrations se lisent
 * dans l'ordre de la liste, donc de la plus recente a la plus ancienne.
 */
export const MIGRATIONS: readonly Migration[] = [];

/**
 * Ce qu'une version anterieure a laisse pour une clef restee vide sous la
 * version courante, ou `undefined` s'il n'y a rien a recuperer.
 *
 * `lireVersion` est INJECTE plutot qu'appele directement : c'est ce qui rend
 * la chaine de migrations verifiable sans stockage du navigateur, exactement
 * comme le domaine recoit son horloge et son aleatoire en parametre
 * (architecture.md section 3). `migrations` l'est aussi, avec une valeur par
 * defaut, pour que le test puisse montrer le mecanisme en marche alors que la
 * liste publiee est vide.
 */
export function valeurMigree(
  suffixe: Suffixe,
  lireVersion: (cle: string) => unknown,
  migrations: readonly Migration[] = MIGRATIONS,
): unknown {
  for (const migration of migrations) {
    const ancien = lireVersion(cleDe(suffixe, migration.depuis));
    if (ancien === undefined) continue;
    const converti = migration.convertir(suffixe, ancien);
    if (converti !== undefined) return converti;
  }
  return undefined;
}
