import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

/*
 * Le chemin de base est LE point que la phase 1 existe pour prouver. Quatre
 * valeurs doivent s'accorder, sinon la page est blanche ou le service worker
 * ne s'enregistre jamais : `base` ici, puis `start_url`, `scope` du manifest
 * et portee du service worker. Voir docs/architecture.md section 9.
 */
const BASE = "/diez/";

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      // Jamais `autoUpdate` : un rechargement en pleine question ferait
      // disparaitre la carte au milieu d'une phrase. Voir architecture.md
      // section 10.
      registerType: "prompt",
      includeAssets: ["icone.svg", "apple-touch-icon.png"],
      // Le manifest est declare ici et nulle part ailleurs : une seule
      // source, conformement a docs/tokens-et-composants.md.
      manifest: {
        name: "Diez",
        short_name: "Diez",
        description: "Jeu de questions coopératif",
        lang: "fr",
        dir: "ltr",
        start_url: BASE,
        scope: BASE,
        display: "standalone",
        // La composition de l'ecran THEME repose sur du vide vertical.
        orientation: "portrait",
        // Le manifest n'accepte qu'une valeur alors que l'application a deux
        // modes a egalite. Noir retenu : le contexte d'usage est une soiree,
        // et un bref ecran noir y est moins agressif qu'un blanc pleine
        // luminosite. Le HTML corrige au chargement avec deux `theme-color`
        // conditionnelles.
        background_color: "#000000",
        theme_color: "#000000",
        icons: [
          { src: "icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "icone-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Les polices sont precachees : c'est ce que la phase 1 eprouve, en
        // plus du chemin de base.
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,webmanifest}"],
      },
    }),
  ],
});
