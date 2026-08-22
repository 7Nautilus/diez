import { PlancheDeControle } from "./design/review/PlancheDeControle";

/*
 * Phase 1 : le tuyau de deploiement, a vide.
 *
 * Cet ecran n'a qu'un role, prouver que la chaine tient de bout en bout :
 * le chemin de base, l'enregistrement du service worker, les polices servies
 * en local, et la publication automatique. Les cinq ecrans du jeu arrivent
 * en phase 4. Voir docs/roadmap.md.
 */
export function App() {
  /*
   * MONTAGE TEMPORAIRE DE LA PLANCHE DE CONTROLE.
   *
   * La planche est le critere de sortie de la phase 3 et elle n'a aucun point
   * d'entree a elle : App est le seul qui existe aujourd'hui. Vite remplace
   * `import.meta.env.DEV` par `false` au build, la branche devient morte et
   * l'import cesse d'etre reference, si bien que ni le composant ni ses
   * modules CSS ne se retrouvent dans dist/. Ce n'est pas une supposition, le
   * controle est de lancer `npm run build` puis de chercher "planche" dans
   * dist/ : il ne doit rien y avoir.
   *
   * TEMPORAIRE, donc. La phase 4 remplace le corps de ce composant par la
   * composition reelle des cinq ecrans et par la navigation ; la planche
   * devra alors trouver un autre point d'entree, une entree Vite dediee ou un
   * parametre d'URL lu en developpement seulement.
   */
  if (import.meta.env.DEV) return <PlancheDeControle />;

  return (
    <main className="page">
      <h1 className="mot">DIEZ</h1>
    </main>
  );
}
