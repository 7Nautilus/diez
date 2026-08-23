import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Banc } from "./Banc";
import "../../design/fonts.css";
import "../../design/tokens.css";
import "../../design/base.css";

/*
 * Diez : le point d'entree du banc de recette.
 *
 * IL NE PART JAMAIS EN PRODUCTION, ET DEUX DISPOSITIFS INDEPENDANTS LE
 * GARANTISSENT. Le premier est structurel et suffit a lui seul : ce module est
 * l'entree de `recette.html`, a la racine du depot. Le serveur de developpement
 * sert n'importe quel fichier HTML de la racine, donc le banc s'ouvre sur
 * /recette.html ; le build ne connait qu'une seule entree, `index.html`, et
 * n'ira jamais chercher celle-ci faute de la trouver dans `rollupOptions.input`
 * (vite.config.ts n'en declare aucune, donc le defaut s'applique). Ce qui n'est
 * pas une entree n'est pas construit : il n'y a ni branche a eliminer, ni
 * drapeau a evaluer, ni fichier de fixture a esperer voir disparaitre. C'est le
 * meme dispositif que la planche de controle (design/review/planche.tsx).
 *
 * Le second est le garde ci-dessous, et il ne remplace pas le premier : il
 * couvre le seul scenario que le premier ne couvre pas, celui ou quelqu'un
 * ajoute cette entree au build un jour, pour voir. La page refuse alors de se
 * monter au lieu d'exposer un outil qui efface le stockage en un tap.
 *
 * Le controle reste a EXECUTER et pas a supposer : `npm run build`, puis
 * chercher "recette", "Banc" ou "_fixture" dans dist/. Il ne doit rien y avoir,
 * pas plus qu'un recette.html.
 *
 * Les trois feuilles sont importees dans le meme ordre que main.tsx : le banc
 * monte l'application reelle, il doit donc la monter avec exactement les memes
 * tokens et le meme socle.
 */

if (!import.meta.env.DEV) {
  throw new Error("Le banc de recette n'existe qu'en developpement.");
}

const racine = document.getElementById("racine");
if (!racine) throw new Error("Point de montage #racine introuvable");

createRoot(racine).render(
  <StrictMode>
    <Banc />
  </StrictMode>,
);
