/*
 * Diez : configuration des tests.
 *
 * Fichier separe de vite.config.ts, et non une section `test` ajoutee
 * dedans : Vitest ignore vite.config.ts des lors que celui-ci existe, donc la
 * suite tourne sans le plugin React ni le plugin PWA. Un domaine pur n'a
 * besoin ni de JSX ni de service worker pour se prouver.
 *
 * Export par defaut, comme vite.config.ts : c'est la seule forme que l'outil
 * lit (conventions-code.md section 4, qui cible `src/` et non la racine).
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Vitest ne teste que domain/, tools/ et le reducteur pur d'app/ : c'est
    // la qu'est la logique (conventions-code.md section 9). Restreindre ici
    // plutot qu'en revue evite qu'un test d'ecran s'installe sans qu'on l'ait
    // decide.
    //
    // `src/app/` a ete ajoute en phase 4, et pour une raison precise : le
    // moment ou un niveau est consomme est un CONTRAT DE COMPOSITION que ni le
    // domaine ni les ecrans ne peuvent tenir, `reduire` ne recevant ni ne
    // rendant d'Historique (architecture.md section 6). Il ne se prouve qu'en
    // rejouant une sequence complete au niveau de l'appelant. La restriction
    // tient toujours : `avancer` est pur, aucun composant n'est monte.
    include: ["src/domain/**/*.test.ts", "src/app/**/*.test.ts", "tools/**/*.test.ts"],
    // `describe`, `it` et `expect` sans import, et c'est la seule forme
    // ecrivable ici : la regle de dependance interdit a domain/ tout import
    // qui sort de domain/, `vitest` compris, et le lint l'applique jusque dans
    // __tests__/ (biome.json, conventions-code.md section 3). Un fichier qui
    // ecrirait `import { describe } from "vitest"` passerait la suite et
    // ferait echouer `npm run lint`, donc la publication.
    globals: true,
  },
});
