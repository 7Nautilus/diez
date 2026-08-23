/*
 * Diez : le type du corpus de fixtures.
 *
 * src/data/fixtures.gen.json est produit par tools/compiler.ts a cote du corpus
 * de production, et n'est pas versionne pour la meme raison que lui.
 *
 * IL N'EXISTE QUE POUR LE BANC DE RECETTE. Les deux cartes de fixture eprouvent
 * les bornes de mise en page et docs/recette.md section 1 exige de les parcourir
 * niveau par niveau ; le compilateur les ecarte du corpus par leur paquet, ce
 * qui est juste, et les rendait par la meme inatteignables. Le seul importateur
 * est src/app/recette/, dont l'entree n'est pas une entree de build.
 *
 * La declaration existe pour la raison ecrite dans cartes.gen.d.ts, qu'on ne
 * repete pas ici : `resolveJsonModule` vaut `false`, donc un module JSON n'est
 * pas resolu et c'est le compilateur de contenu qui rend ce contrat vrai.
 */

declare module "*/fixtures.gen.json" {
  /** Export par defaut, meme raison que le corpus de production. */
  const fixtures: readonly import("../domain/types").Carte[];
  export default fixtures;
}
