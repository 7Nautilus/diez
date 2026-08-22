/*
 * Diez : les controles que la documentation decrivait sans que rien ne les lance.
 *
 * Le principe qui gouverne conventions-code.md est "ce qu'une machine peut
 * verifier, une machine le verifie". Trois controles y etaient pourtant ecrits
 * sous forme de commandes a taper : le cadratin, la couleur litterale hors de
 * tokens.css, et les termes de vocabulaire interdits. Aucun script, aucune
 * etape de CI, aucun hook ne les executait, donc ils ne protegeaient rien.
 *
 * Ecrit en JavaScript et sans aucune dependance, volontairement : ce fichier
 * doit tourner avant l'installation d'un outil et sans etape de compilation,
 * sinon il ne peut pas garder la porte. C'est la meme exception, et pour la
 * meme raison, que tools/icones.py.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

const RACINE = process.cwd();

/** Dossiers qui ne nous appartiennent pas, ou qui sont produits. */
const IGNORES = new Set(["node_modules", "dist", ".git", ".vite", "coverage", ".impeccable"]);

const EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".jsx",
  ".css",
  ".html",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".py",
]);

/*
 * Ce fichier s'exclut de ses propres controles : un detecteur contient
 * necessairement les motifs qu'il cherche, et se signaler lui-meme rendrait
 * le controle inutilisable.
 */
const MOI = "tools/verifier.mjs";

const CADRATIN = String.fromCharCode(0x2014);
const TERMES_INTERDITS = /\b(card|deck|level|draw|reveal)s?\b/i;
const COULEUR_LITTERALE = /#[0-9a-fA-F]{3,8}\b/;
const CHAINES = /"[^"]*"|'[^']*'|`[^`]*`/g;

function fichiers(dossier) {
  const trouves = [];
  for (const entree of readdirSync(dossier)) {
    if (IGNORES.has(entree)) continue;
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) trouves.push(...fichiers(chemin));
    else if (EXTENSIONS.has(extname(entree))) trouves.push(chemin);
  }
  return trouves;
}

const TOUS = fichiers(RACINE);
const relatif = (f) => relative(RACINE, f).split(sep).join("/");
const dans = (f, prefixe) => relatif(f).startsWith(prefixe);

const manquements = [];
function releve(regle, fichier, ligne, extrait) {
  manquements.push({
    regle,
    ou: `${relatif(fichier)}:${ligne}`,
    extrait: extrait.trim().slice(0, 90),
  });
}

for (const f of TOUS) {
  if (relatif(f) === MOI) continue;
  const lignes = readFileSync(f, "utf8").split("\n");

  lignes.forEach((ligne, i) => {
    const n = i + 1;

    // CLAUDE.md : jamais de cadratin, dans quoi que ce soit, commentaires compris.
    if (ligne.includes(CADRATIN)) releve("cadratin (U+2014)", f, n, ligne);

    // conventions-code.md section 8 : aucune couleur litterale hors de tokens.css,
    // sinon le double mode clair et sombre casse dans l'un des deux sans que rien
    // ne le signale. index.html et vite.config.ts sont les deux exceptions deja
    // ecrites, et sont hors de src/ : une balise meta et un manifest ne savent
    // pas lire une variable CSS.
    if (dans(f, "src/") && !relatif(f).endsWith("design/tokens.css")) {
      if (COULEUR_LITTERALE.test(ligne))
        releve("couleur litterale hors de tokens.css", f, n, ligne);
    }

    // architecture.md section 2 : ces termes ont deja un equivalent francais
    // retenu. Limite a src/, parce que le lexique regit NOTRE nommage et non
    // celui des bibliotheques qu'appelle tools/, ou `ImageDraw.Draw` est le nom
    // que Pillow donne a sa propre fonction.
    if (dans(f, "src/")) {
      const trouve = ligne.replace(CHAINES, '""').match(TERMES_INTERDITS);
      if (trouve) releve(`terme interdit : ${trouve[1]}`, f, n, ligne);
    }
  });
}

if (manquements.length === 0) {
  process.stdout.write(`Verification : ${TOUS.length} fichiers, aucun manquement.\n`);
  process.exit(0);
}

process.stdout.write(`Verification : ${manquements.length} manquement(s).\n\n`);
for (const m of manquements) {
  process.stdout.write(`  ${m.regle}\n    ${m.ou}\n    ${m.extrait}\n\n`);
}
process.exit(1);
