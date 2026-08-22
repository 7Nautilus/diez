import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PlancheDeControle } from "./PlancheDeControle";
import "../fonts.css";
import "../tokens.css";
import "../base.css";

/*
 * Diez : le point d'entree de la planche de controle.
 *
 * ELLE NE PART JAMAIS EN PRODUCTION, ET CE N'EST PLUS UNE BRANCHE MORTE. La
 * phase 3 la montait dans src/App.tsx sous `import.meta.env.DEV`, faute d'un
 * autre point d'entree ; la phase 4 a remplace ce composant par la composition
 * reelle des cinq ecrans, et une planche de revue n'a rien a faire dans le
 * fichier qui cable le jeu.
 *
 * LE DISPOSITIF EST STRUCTUREL PLUTOT QUE CONDITIONNEL. Ce module est l'entree
 * de `planche.html`, a la racine du depot. Le serveur de developpement sert
 * n'importe quel fichier HTML de la racine, donc la planche s'ouvre sur
 * /planche.html ; le build, lui, ne connait qu'une seule entree, `index.html`,
 * et n'ira jamais chercher celle-ci faute de la trouver dans
 * `rollupOptions.input` (vite.config.ts n'en declare aucune, donc le defaut
 * s'applique). Il n'y a donc plus de branche a eliminer, plus de drapeau a
 * evaluer, et rien qui puisse partir par inadvertance : ce qui n'est pas une
 * entree n'est pas construit.
 *
 * Le controle reste a executer et pas a supposer : `npm run build`, puis
 * chercher "planche", "PlancheDeControle" ou "Inventaire" dans dist/. Il ne
 * doit rien y avoir, pas plus qu'un planche.html.
 *
 * Les trois feuilles sont importees dans le meme ordre que main.tsx : la
 * planche rend l'inventaire du socle, elle doit donc le rendre avec exactement
 * les memes tokens et le meme socle que l'application.
 */

const racine = document.getElementById("racine");
if (!racine) throw new Error("Point de montage #racine introuvable");

createRoot(racine).render(
  <StrictMode>
    <PlancheDeControle />
  </StrictMode>,
);
