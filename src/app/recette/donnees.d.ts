/*
 * Diez : le jeu de stockage de developpement, tel que TypeScript le voit.
 *
 * `content/_dev/historique-partiel.json` n'est pas du contenu de jeu : c'est un
 * etat de `localStorage` a poser, celui que docs/recette.md section 1 demande de
 * charger pour eprouver le selecteur de niveau avec neuf niveaux consommes. Il
 * ne passe donc pas par le compilateur de contenu, qui ne connait que des
 * cartes, et le banc l'importe directement.
 *
 * `valeur` EST DECLAREE `unknown`, ET C'EST DELIBERE. Un type ecrit ici ne
 * serait qu'une affirmation : rien ne relie ce fichier a la forme que le banc
 * va charger. Le banc le passe donc au validateur de `storage/`, le meme qui
 * garde la clef contre un contenu abime, et refuse de charger ce qu'il refuse.
 * Un jeu de developpement mal forme doit se signaler sur le banc, pas produire
 * un historique a moitie lu dont personne ne saurait ce qu'il contient.
 *
 * L'EXPORT PAR DEFAUT N'EST PAS UN CHOIX. Un module JSON n'expose que celui-la,
 * et Vite peut de surcroit basculer un JSON volumineux en `JSON.parse`, forme
 * qui n'a aucun export nomme. C'est la derogation deja ecrite dans
 * src/data/cartes.gen.d.ts, ou seule l'exclusion de `src/data` dans biome.json
 * la rend muette ; ici elle doit etre nommee.
 */

declare module "*/historique-partiel.json" {
  const jeu: {
    readonly note: string;
    readonly cle: string;
    readonly valeur: unknown;
  };
  // biome-ignore lint/style/noDefaultExport: un module JSON n'expose que celui-la, voir l'en-tete.
  export default jeu;
}
