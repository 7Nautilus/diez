/*
 * Diez : la regle de dependance est-elle ARMEE ?
 *
 * Le principe P2 tient a un seul dispositif : deux blocs `overrides` dans
 * biome.json. Ce dispositif est une chaine de caracteres dans un fichier de
 * configuration, et rien ne le testait. Mesure faite avant ce fichier :
 * remplacer `src/domain/*` par `src/domaine/*`, une lettre, laissait `biome
 * ci`, `tsc` et les tests du domaine entierement au vert, tandis qu'un
 * `import { useState } from "react"` dans src/domain/ devenait acceptable.
 *
 * Le risque n'est pas theorique : `biome ci` reclame deja une migration de ce
 * fichier, et une reecriture automatique passerait au vert quoi qu'elle fasse
 * aux `overrides`.
 *
 * Ce test vit dans tools/ et non dans src/domain/__tests__/, pour une raison
 * qui est elle-meme une preuve que la regle mord : depuis le domaine, il ne
 * pourrait pas importer `node:child_process`.
 */

import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RACINE = process.cwd();
const BIOME = join(RACINE, "node_modules", "@biomejs", "biome", "bin", "biome");

/** Rend le code de sortie de `biome ci` sur un seul fichier. */
function biomeRefuse(chemin: string): boolean {
  try {
    execFileSync(process.execPath, [BIOME, "ci", chemin], { stdio: "pipe" });
    return false;
  } catch {
    return true;
  }
}

/** Ecrit une sonde, interroge Biome, et la supprime quoi qu'il arrive. */
function sonde(nom: string, contenu: string): boolean {
  const chemin = join(RACINE, "src", "domain", nom);
  try {
    writeFileSync(chemin, contenu, "utf8");
    return biomeRefuse(chemin);
  } finally {
    rmSync(chemin, { force: true });
  }
}

describe("Le garde-fou du principe P2", () => {
  it("refuse un import qui sort du domaine", () => {
    expect(
      sonde("_garde.probe.ts", 'import { useState } from "react";\nexport const a = useState;\n'),
    ).toBe(true);
  });

  it("refuse aussi un import de type seul, qui est la porte derobee classique", () => {
    expect(
      sonde("_garde.probe.ts", 'import type { FC } from "react";\nexport type A = FC;\n'),
    ).toBe(true);
  });

  it("refuse un reexport, qui echappe a une regle ecrite sur les seuls imports", () => {
    expect(sonde("_garde.probe.ts", 'export * from "react";\n')).toBe(true);
  });

  /*
   * Sans ce controle negatif, les trois precedents passeraient aussi bien avec
   * une regle qui refuse tout, y compris ce dont le domaine a besoin.
   */
  it("laisse passer un import interne au domaine", () => {
    expect(
      sonde(
        "_garde.probe.ts",
        'import { VERROU_MS } from "./types";\nexport const a = VERROU_MS;\n',
      ),
    ).toBe(false);
  });
});
