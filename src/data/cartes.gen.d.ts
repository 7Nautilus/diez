/*
 * Diez : le type du corpus compile.
 *
 * src/data/cartes.gen.json est produit par tools/compiler.ts et n'est pas
 * versionne : il n'existe ni sur un poste neuf ni en CI avant `npm run
 * compiler`, d'ou la dependance du build (package.json).
 *
 * POURQUOI CETTE DECLARATION EXISTE. Importe directement, un module JSON se
 * type mal : TypeScript elargit toute chaine en `string`, donc `paquet`,
 * `domaine` et `source` cessent d'etre des unions et l'affectation a `Carte`
 * echoue. La parade habituelle est une assertion au point d'import, qui
 * affirme sans preuve et se recopie a chaque import. La declaration ci-dessous
 * enonce le contrat UNE fois, et c'est tools/compiler.ts qui le rend vrai : il
 * refuse d'ecrire le fichier des qu'une carte s'ecarte de la forme attendue,
 * et tools/compiler.test.ts eprouve ce refus.
 *
 * Elle n'est lue que parce que `resolveJsonModule` vaut `false` dans
 * tsconfig.json. A `true`, TypeScript resout le fichier reel, l'elargit, et
 * cette declaration devient invisible sans que rien ne le signale : les deux
 * reglages ne se separent pas.
 */

declare module "*/cartes.gen.json" {
  /**
   * Export par defaut et non nomme, contre la regle du depot
   * (conventions-code.md section 4) : Vite peut basculer un module JSON
   * volumineux en `JSON.parse`, forme qui n'expose plus les exports nommes.
   * Un corpus grandit, donc la forme nommee cesserait de fonctionner un jour,
   * a la taille pres, et sans prevenir.
   */
  const corpus: readonly import("../domain/types").Carte[];
  export default corpus;
}
