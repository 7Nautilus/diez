/*
 * Diez : la regle de dependance est-elle ARMEE, sur ses CINQ overrides ?
 *
 * La regle de dependance, dont P2 est le cas le plus strict, ne tient qu'a un
 * seul dispositif : cinq blocs `overrides` dans biome.json. Ce dispositif est
 * une chaine de caracteres dans un fichier de configuration, et rien ne le
 * testait.
 *
 * PREMIERE MESURE, celle qui a fait naitre ce fichier. Remplacer `src/domain/*`
 * par `src/domaine/*`, une lettre, laissait `biome ci`, `tsc` et tous les tests
 * au vert, tandis qu'un `import { useState } from "react"` dans src/domain/
 * devenait acceptable.
 *
 * SECONDE MESURE, celle qui a fait naitre CETTE version. La garde n'ecrivait
 * ses sondes qu'a src/domain/_garde.probe.ts, donc elle n'eprouvait que le
 * PREMIER des cinq overrides. La meme faute d'une lettre, portee cette fois sur
 * le SECOND override, celui qui couvre les sous-dossiers du domaine, laissait
 * les 245 tests verts et `biome ci` propre sur 96 fichiers, zero diagnostic ;
 * un module ecrit ensuite dans src/domain/regles/ pouvait importer `react` et
 * `../../storage/tour` sans que rien ne bronche. Une garde aveugle aux quatre
 * cinquiemes de son dispositif ne mesure pas ce qu'elle annonce.
 *
 * CE QUI EST EPROUVE ICI : les treize directions du tableau de
 * conventions-code.md section 3, chacune a l'endroit du depot ou elle se
 * produirait, plus les deux portes derobees de forme que sont l'import de type
 * seul et le reexport. Chaque override recoit ses sondes POSITIVES en plus de
 * ses negatives : sans elles, une regle qui refuserait tout satisferait toute
 * la colonne de droite du tableau, et la garde le confirmerait.
 *
 * ON CHERCHE LE NOM DE LA REGLE, JAMAIS LE CODE DE SORTIE. Une sonde qui ne lit
 * qu'un code de sortie confond « refuse par la regle visee » et « refuse pour
 * autre chose », et le piege a deja ete paye ici : la premiere version du
 * tableau de conventions-code.md section 3 annoncait treize refus, y compris
 * pour les six lignes qui doivent passer, parce que les fichiers de sonde
 * etaient mal formates.
 *
 * Ce test vit dans tools/ et non dans src/domain/__tests__/, pour une raison
 * qui est elle-meme une preuve que la regle mord : depuis le domaine, il ne
 * pourrait pas importer `node:child_process`.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RACINE = process.cwd();
const BIOME = join(RACINE, "node_modules", "@biomejs", "biome", "bin", "biome");

/**
 * Le nom que Biome imprime en tete de chaque diagnostic de la regle de
 * dependance. C'est LUI qu'on cherche dans la sortie, et non le code de sortie :
 * voir l'en-tete du fichier.
 */
const REGLE = "lint/style/noRestrictedImports";

/**
 * L'en-tete d'un diagnostic Biome, tel qu'il sort sous Windows :
 * `src\domain\x.probe.ts:1:26 lint/style/noRestrictedImports`. Le separateur est
 * ramene au slash au releve, pour que la clef soit la meme sur les deux systemes.
 *
 * La position est optionnelle parce qu'un diagnostic de FORMATAGE n'en porte
 * pas, et on veut le voir lui aussi : une sonde mal formatee doit tomber
 * bruyamment plutot que d'etre comptee comme acceptee.
 */
const ENTETE = /^(\S+\.probe\.ts)(?::\d+:\d+)?\s+(\S+)/;

/** La forme ordinaire : un import de valeur, consomme pour ne pas etre signale ailleurs. */
function importe(nom: string, module: string): string {
  return `import { ${nom} } from "${module}";\nexport const sonde = ${nom};\n`;
}

/** La porte derobee classique : un import de TYPE, qui ne laisse aucune trace a l'execution. */
function importeUnType(nom: string, module: string): string {
  return `import type { ${nom} } from "${module}";\nexport type Sonde = ${nom};\n`;
}

/** L'autre porte derobee : un reexport, qu'une regle ecrite sur les seuls imports laisse passer. */
function reexporte(module: string): string {
  return `export * from "${module}";\n`;
}

type Sonde = {
  /** L'invariant protege, tel qu'il se lira six mois plus tard (conventions-code.md section 9). */
  invariant: string;
  /** Suffixe du fichier de sonde. Unique dans son lieu, il sert de clef de releve. */
  nom: string;
  code: string;
  /** `true` quand la regle de dependance DOIT refuser cette sonde. */
  refuse: boolean;
};

type Lieu = {
  /** Le titre du groupe : l'override de biome.json qu'il eprouve. */
  titre: string;
  /** Le dossier des sondes, relatif a src/, en separateurs POSIX. */
  dossier: string;
  sondes: readonly Sonde[];
};

/*
 * Les sondes citent des modules qui existent VRAIMENT et leurs vrais exports.
 * Biome ne resout aucun module, donc n'importe quelle chaine ferait l'affaire ;
 * des chemins reels evitent qu'une sonde survive a la disparition de la couche
 * qu'elle pretend eprouver.
 */
const LIEUX: readonly Lieu[] = [
  {
    titre: "L'override src/domain/*",
    dossier: "domain",
    sondes: [
      {
        invariant: "domain/ ne peut pas importer react",
        nom: "react",
        code: importe("useState", "react"),
        refuse: true,
      },
      {
        invariant: "domain/ ne peut pas importer un type seul, la porte derobee classique",
        nom: "react-type",
        code: importeUnType("FC", "react"),
        refuse: true,
      },
      {
        invariant: "domain/ ne peut pas reexporter ce qu'il n'a pas le droit d'importer",
        nom: "react-reexport",
        code: reexporte("react"),
        refuse: true,
      },
      {
        invariant: "domain/ ne peut pas importer app/",
        nom: "app",
        code: importe("avancer", "../app/partie"),
        refuse: true,
      },
      {
        invariant: "domain/ ne peut pas importer storage/",
        nom: "storage",
        code: importe("cleDe", "../storage/cles"),
        refuse: true,
      },
      {
        invariant: "domain/ importe librement a l'interieur de domain/",
        nom: "interne",
        code: importe("VERROU_MS", "./types"),
        refuse: false,
      },
    ],
  },
  {
    /*
     * LE TROU MESURE. Ce lieu n'existait pas, et c'est lui qui porte les
     * sous-dossiers du domaine : __tests__/ aujourd'hui, n'importe quel
     * decoupage demain. Le dossier est cree puis efface par la garde, plutot
     * que pris parmi ceux qui existent : le trou s'ouvrait precisement sur un
     * dossier que personne n'avait encore ecrit.
     */
    titre: "L'override src/domain/*/**, celui que la garde ne voyait pas",
    dossier: "domain/_garde",
    sondes: [
      {
        invariant: "un sous-dossier de domain/ ne peut pas importer react",
        nom: "react",
        code: importe("useState", "react"),
        refuse: true,
      },
      {
        invariant: "un sous-dossier de domain/ ne peut pas importer app/",
        nom: "app",
        code: importe("avancer", "../../app/partie"),
        refuse: true,
      },
      {
        invariant: "un sous-dossier de domain/ ne peut pas importer storage/",
        nom: "storage",
        code: importe("cleDe", "../../storage/cles"),
        refuse: true,
      },
      {
        /*
         * Le controle qui distingue les deux overrides du domaine : le premier
         * n'autorise que `./*`, donc il refuserait cette ligne. La voir passer
         * prouve que c'est bien le second qui s'applique ici, et non le premier
         * par debordement.
         */
        invariant: "un sous-dossier de domain/ remonte d'un cran dans domain/, comme ses tests",
        nom: "parent",
        code: importe("VERROU_MS", "../types"),
        refuse: false,
      },
      {
        invariant: "un sous-dossier de domain/ importe librement chez son voisin",
        nom: "voisin",
        code: importe("regle", "./voisin"),
        refuse: false,
      },
    ],
  },
  {
    titre: "L'override src/storage/**",
    dossier: "storage",
    sondes: [
      {
        invariant: "storage/ ne peut pas importer app/",
        nom: "app",
        code: importe("avancer", "../app/partie"),
        refuse: true,
      },
      {
        invariant: "storage/ ne peut pas importer domain/, pas meme une constante",
        nom: "domain",
        code: importe("VERROU_MS", "../domain/types"),
        refuse: true,
      },
      {
        invariant: "storage/ importe librement a l'interieur de storage/",
        nom: "interne",
        code: importe("cleDe", "./cles"),
        refuse: false,
      },
    ],
  },
  {
    titre: "L'override src/screens/**",
    dossier: "screens",
    sondes: [
      {
        invariant: "screens/ ne peut pas importer app/",
        nom: "app",
        code: importe("avancer", "../app/partie"),
        refuse: true,
      },
      {
        invariant: "screens/ ne peut pas importer storage/",
        nom: "storage",
        code: importe("cleDe", "../storage/cles"),
        refuse: true,
      },
      {
        invariant: "screens/ descend vers design/",
        nom: "design",
        code: importe("Bouton", "../design/components/Bouton"),
        refuse: false,
      },
      {
        invariant: "screens/ descend vers domain/, ce sans quoi aucun ecran n'atteindrait reduire",
        nom: "domain",
        code: importe("reduire", "../domain/tour"),
        refuse: false,
      },
      {
        invariant: "screens/ importe react, un ecran etant un composant",
        nom: "react",
        code: importe("useState", "react"),
        refuse: false,
      },
      {
        invariant: "screens/ importe librement a l'interieur de screens/",
        nom: "interne",
        code: importe("MODES_AFFICHAGE", "./types"),
        refuse: false,
      },
    ],
  },
  {
    /*
     * Le seul override ecrit en liste de REFUS et non en liste d'autorisation,
     * design/ important legitimement react et ses propres sous-dossiers. Les
     * deux portes derobees de forme y sont donc reprises : ce qu'on a prouve
     * sur la forme d'en face ne s'y transporte pas.
     */
    titre: "L'override src/design/**",
    dossier: "design",
    sondes: [
      {
        invariant: "design/ ne peut pas remonter vers app/",
        nom: "app",
        code: importe("avancer", "../app/partie"),
        refuse: true,
      },
      {
        invariant: "design/ ne peut pas remonter vers screens/",
        nom: "screens",
        code: importe("Theme", "../screens/Theme"),
        refuse: true,
      },
      {
        invariant: "design/ ne peut pas remonter vers domain/",
        nom: "domain",
        code: importe("reduire", "../domain/tour"),
        refuse: true,
      },
      {
        invariant: "design/ ne peut pas remonter vers storage/",
        nom: "storage",
        code: importe("cleDe", "../storage/cles"),
        refuse: true,
      },
      {
        invariant: "design/ ne remonte pas davantage par un import de type seul",
        nom: "app-type",
        code: importeUnType("Signalement", "../app/partie"),
        refuse: true,
      },
      {
        invariant: "design/ ne remonte pas davantage par un reexport",
        nom: "screens-reexport",
        code: reexporte("../screens/Theme"),
        refuse: true,
      },
      {
        invariant: "design/ importe react",
        nom: "react",
        code: importe("useState", "react"),
        refuse: false,
      },
      {
        invariant: "design/ importe librement ses propres sous-dossiers",
        nom: "interne",
        code: importe("Bouton", "./components/Bouton"),
        refuse: false,
      },
    ],
  },
  {
    /*
     * app/ n'a DELIBEREMENT aucun override : c'est la couche de composition, et
     * la contrainte porte sur l'autre sens (architecture.md section 3). Ces
     * quatre sondes sont les quatre premieres lignes de la colonne gauche du
     * tableau ; elles echoueraient si l'un des overrides voisins debordait sur
     * app/, ce qu'aucune sonde negative ne pourrait signaler.
     */
    titre: "app/, que rien ne restreint et qui doit le rester",
    dossier: "app",
    sondes: [
      {
        invariant: "app/ compose avec screens/",
        nom: "screens",
        code: importe("Theme", "../screens/Theme"),
        refuse: false,
      },
      {
        invariant: "app/ compose avec design/",
        nom: "design",
        code: importe("Bouton", "../design/components/Bouton"),
        refuse: false,
      },
      {
        invariant: "app/ compose avec domain/",
        nom: "domain",
        code: importe("reduire", "../domain/tour"),
        refuse: false,
      },
      {
        invariant: "app/ compose avec storage/",
        nom: "storage",
        code: importe("cleDe", "../storage/cles"),
        refuse: false,
      },
    ],
  },
];

/** Le seul dossier que la garde cree ; les cinq autres lieux existent deja. */
const DOSSIER_CREE = join(RACINE, "src", "domain", "_garde");

function clefDe(lieu: Lieu, sonde: Sonde): string {
  return `src/${lieu.dossier}/_garde-${sonde.nom}.probe.ts`;
}

/** Les noms de regles relevees par Biome, sonde par sonde. */
const RELEVE = new Map<string, readonly string[]>();

/*
 * UN SEUL appel a Biome pour toutes les sondes, et non un par sonde : le
 * demarrage de Node domine le cout, et une trentaine de demarrages faisaient
 * passer la suite entiere de moins de deux secondes a une dizaine. Le releve se
 * fait ensuite par chemin de fichier, ce qui est de toute facon plus precis
 * qu'un code de sortie global.
 */
function relever(): void {
  const sondes = LIEUX.flatMap((lieu) =>
    lieu.sondes.map((sonde) => ({ clef: clefDe(lieu, sonde), code: sonde.code })),
  );
  mkdirSync(DOSSIER_CREE, { recursive: true });
  try {
    for (const { clef, code } of sondes) writeFileSync(join(RACINE, clef), code, "utf8");
    for (const { clef } of sondes) RELEVE.set(clef, []);

    const resultat = spawnSync(
      process.execPath,
      [BIOME, "ci", "--colors=off", ...sondes.map(({ clef }) => clef)],
      { cwd: RACINE, encoding: "utf8" },
    );
    // Biome injoignable rendrait toutes les sondes muettes, donc toutes les
    // negatives en echec, sans que la cause reelle apparaisse nulle part.
    if (resultat.error !== undefined) throw resultat.error;

    for (const ligne of `${resultat.stdout}${resultat.stderr}`.split("\n")) {
      const trouve = ENTETE.exec(ligne);
      if (trouve === null) continue;
      const [, chemin, regle] = trouve;
      if (chemin === undefined || regle === undefined) continue;
      const clef = chemin.split("\\").join("/");
      RELEVE.set(clef, [...(RELEVE.get(clef) ?? []), regle]);
    }
  } finally {
    for (const { clef } of sondes) rmSync(join(RACINE, clef), { force: true });
    rmSync(DOSSIER_CREE, { recursive: true, force: true });
  }
}

beforeAll(relever);

for (const lieu of LIEUX) {
  describe(lieu.titre, () => {
    for (const sonde of lieu.sondes) {
      it(sonde.invariant, () => {
        const releve = RELEVE.get(clefDe(lieu, sonde));
        /*
         * Une sonde absente du releve signifie que Biome ne l'a pas examinee,
         * et non qu'elle est passee. Les confondre serait exactement
         * l'aveuglement que cette version du fichier corrige.
         */
        expect(releve).toBeDefined();
        if (sonde.refuse) {
          expect(releve).toContain(REGLE);
        } else {
          // Une sonde positive doit sortir SANS AUCUN diagnostic : la limiter a
          // l'absence de REGLE laisserait passer une sonde mal formatee, donc
          // une sonde qui ne prouve pas ce qu'elle pretend.
          expect(releve).toEqual([]);
        }
      });
    }
  });
}
