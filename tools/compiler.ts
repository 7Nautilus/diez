/*
 * Diez : le compilateur de contenu.
 *
 * Lit content/cartes/ et ecrit src/data/cartes.gen.json, le corpus que
 * l'application embarque. C'est la frontiere entre le contenu et l'app
 * (architecture.md section 8), et le seul endroit ou une carte passe de
 * donnee brute a `Carte`.
 *
 * CE QU'IL GARDE DU SCHEMA, ET RIEN DE PLUS. Outre les invariantes
 * STRUCTURELLES (identifiant present et unique, dix questions, niveaux 1 a 10
 * couverts une fois chacun), il fait respecter les PLAFONDS DE LONGUEUR de
 * content/schema/lot.schema.json, qu'il LIT dans ce fichier au lieu de les
 * recopier. Le schema reste ainsi la source unique de ces nombres
 * (tokens-et-composants.md, « Ce qui n'est pas un token ») et devient
 * executable sans ajv. Un depassement arrete la compilation comme n'importe
 * quel autre manquement : une reponse de 112 caracteres la ou le plafond en
 * admet 60 ne casse pas le corpus, elle casse l'ecran REPONSE le soir ou elle
 * sort.
 *
 * CE QU'IL NE GARDE TOUJOURS PAS, et qui reste le chantier de contenu avec ajv
 * et tools/valider.ts, dont l'etape est encore commentee dans le workflow :
 * le theme duplique d'une carte a l'autre, que le schema n'exprime d'ailleurs
 * pas non plus ; la relecture des noms propres du paquet maison ; les motifs
 * de `id` et de `lot` ; les champs du lot lui-meme, dont son `statut` et sa
 * note ; et le refus des proprietes excedentaires, qui laisse aujourd'hui un
 * nom de champ mal orthographie passer en etant simplement ignore.
 *
 * Il tourne sous Node sans etape de compilation, Node effacant les types a la
 * lecture. C'est ce qui lui interdit d'importer une VALEUR du domaine :
 * l'effacement de types ne resout un specificateur relatif qu'avec son
 * extension, `../src/domain/types.ts`, que TypeScript refuse hors
 * `allowImportingTsExtensions`. Les tables ci-dessous sont donc locales, mais
 * liees aux types du domaine dans les deux sens (voir leur commentaire).
 */

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

import type { Carte, CarteId, Domaine, Niveau, PaquetId, Question } from "../src/domain/types";

const RACINE = process.cwd();
const DOSSIER_CARTES = join(RACINE, "content", "cartes");
const SORTIE = join(RACINE, "src", "data", "cartes.gen.json");

/**
 * Le schema du corpus, ouvert a la compilation et non seulement par l'editeur.
 *
 * C'est la seule ecriture des plafonds de longueur du depot : ce fichier les y
 * lit, aucun n'est recopie ici.
 */
const CHEMIN_SCHEMA = join(RACINE, "content", "schema", "lot.schema.json");

/**
 * La seconde sortie, et elle ne part JAMAIS en production.
 *
 * Les deux cartes de fixture existent pour eprouver les bornes de mise en page,
 * et docs/recette.md section 1 exige de les parcourir niveau par niveau. Elles
 * sont exclues du corpus par leur paquet, ce qui est juste : elles n'ont rien a
 * faire dans une soiree. Sans ce second fichier elles n'etaient atteignables
 * par rien du tout, donc la moitie de la recette technique etait injouable.
 *
 * CE FICHIER N'EST IMPORTE QUE PAR LE BANC DE RECETTE (src/app/recette/), dont
 * l'entree `recette.html` n'est pas une entree de build : ce qui n'est pas
 * atteignable depuis index.html n'est pas construit. Le controle se fait par
 * `npm run build` puis une recherche dans dist/, et non par la lecture.
 */
const SORTIE_FIXTURES = join(RACINE, "src", "data", "fixtures.gen.json");

/**
 * Interdit de publier une application vide (architecture.md section 8, qui
 * pose ce seuil a cinq cartes valides). Cinq et non dix : le corpus est
 * differe, le seuil est celui de la preuve de concept.
 */
export const SEUIL_PRODUCTION = 5;

/**
 * Le paquet dedie aux cas de test. Ses cartes existent pour eprouver les
 * bornes de mise en page, jamais pour etre jouees : elles sont exclues des
 * sorties de production par leur paquet, et non par leur lot
 * (architecture.md section 8).
 */
const PAQUET_FIXTURES = "_fixtures" satisfies PaquetId;

/*
 * Les valeurs que le domaine declare en union et que ce fichier doit
 * parcourir a l'execution.
 *
 * `Record<Union, true>` impose les DEUX SENS d'un seul coup, la ou un tableau
 * `satisfies` n'en impose qu'un : une cle manquante et l'objet est incomplet,
 * une cle en trop et le controle des proprietes excedentaires la refuse.
 * C'est ce qui rend ces copies sures. domain/types.ts previent qu'un domaine
 * ajoute au schema doit l'etre aussi en TypeScript, faute de quoi le corpus
 * compile ne se typera plus : la table ci-dessous est l'endroit ou cet oubli
 * devient bruyant, puisque la carte fautive arrete alors la compilation.
 */

const PAQUETS: Record<PaquetId, true> = { general: true, maison: true, _fixtures: true };

const DOMAINES: Record<Domaine, true> = {
  "histoire-geo": true,
  sciences: true,
  "cinema-series": true,
  musique: true,
  sport: true,
  "jeux-video-internet": true,
  "langue-litterature": true,
  "vie-quotidienne": true,
  "arts-mythologie": true,
  "marques-business": true,
  insolite: true,
  _test: true,
};

const SOURCES: Record<Carte["source"], true> = { genere: true, manuel: true };

const NIVEAUX_ATTENDUS: Record<Niveau, true> = {
  1: true,
  2: true,
  3: true,
  4: true,
  5: true,
  6: true,
  7: true,
  8: true,
  9: true,
  10: true,
};

/**
 * Le nombre de questions d'une carte, derive et jamais ecrit.
 *
 * Il doit valoir la longueur de `NIVEAUX` dans domain/types.ts, qui est le
 * seuil d'epuisement d'une carte : une carte plus courte serait declaree
 * epuisee apres sa derniere question, une carte plus longue ne le serait
 * jamais. Les deux listes etant chacune prouvees exhaustives sur `Niveau`,
 * elles ne peuvent pas diverger.
 */
const NB_QUESTIONS = Object.keys(NIVEAUX_ATTENDUS).length;

/** Un manquement, avec l'endroit exact ou le relire. */
export type Faute = { readonly ou: string; readonly quoi: string };

/**
 * Les plafonds de longueur du contenu, tels que le schema les declare.
 *
 * Aucune de ces valeurs n'est ecrite dans ce fichier : elles arrivent par
 * `lirePlafonds`. Chacune protege un geste de mise en page precis, et la
 * raison de chacune est portee par le `description` du champ correspondant
 * dans le schema, la aussi a un seul endroit.
 */
export type Plafonds = {
  readonly theme: number;
  readonly q: number;
  readonly r: number;
  readonly note: number;
};

/** Un fichier de contenu, lu mais pas encore interprete. */
export type LotLu = { readonly chemin: string; readonly brut: unknown };

export type Rapport = {
  /** Les cartes retenues pour la production, dans l'ordre du corpus. */
  readonly cartes: readonly Carte[];
  /**
   * Les cartes du paquet de fixtures, dans l'ordre, pour le banc de recette
   * seul (voir SORTIE_FIXTURES).
   *
   * Elles passent exactement les memes controles structurels que les autres :
   * une fixture mal formee arrete la compilation entiere. C'est la seule
   * garantie qui vaille ici, une carte de test qui ne se comporterait pas comme
   * une carte reelle n'eprouvant plus rien.
   */
  readonly fixtures: readonly Carte[];
  /** Vide, et seulement vide, le corpus est sain et le fichier peut s'ecrire. */
  readonly fautes: readonly Faute[];
  readonly lues: number;
  readonly questions: number;
  readonly ecarteesFixtures: number;
  readonly ecarteesNonRelues: number;
};

type Objet = Readonly<Record<string, unknown>>;

function estObjet(valeur: unknown): valeur is Objet {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

/**
 * `Array.isArray` sur un `unknown` rend `any[]`, donc rouvre exactement ce que
 * `noExplicitAny` ferme (conventions-code.md section 1).
 */
function estTableau(valeur: unknown): valeur is readonly unknown[] {
  return Array.isArray(valeur);
}

function chaineNonVide(valeur: unknown): valeur is string {
  return typeof valeur === "string" && valeur.trim().length > 0;
}

function estPaquet(valeur: unknown): valeur is PaquetId {
  return typeof valeur === "string" && Object.hasOwn(PAQUETS, valeur);
}

function estDomaine(valeur: unknown): valeur is Domaine {
  return typeof valeur === "string" && Object.hasOwn(DOMAINES, valeur);
}

function estSource(valeur: unknown): valeur is Carte["source"] {
  return typeof valeur === "string" && Object.hasOwn(SOURCES, valeur);
}

function estNiveau(valeur: unknown): valeur is Niveau {
  return typeof valeur === "number" && Object.hasOwn(NIVEAUX_ATTENDUS, valeur);
}

/**
 * Extrait les quatre plafonds d'un schema deja analyse, ou LEVE.
 *
 * Lever, et non relever une faute : un plafond introuvable n'est pas un defaut
 * du corpus mais du cablage (conventions-code.md section 7). Le cas qui compte
 * est la cle deplacee ou renommee dans le schema. Sans ce refus, la lecture
 * rendrait `undefined`, la comparaison ci-dessous ne comparerait plus rien, et
 * la porte se rouvrirait en silence : c'est exactement l'etat d'avant, ou le
 * schema etait cite par neuf fichiers et execute par aucun.
 */
export function extrairePlafonds(schema: unknown): Plafonds {
  const plafond = (...cles: readonly string[]): number => {
    let courant: unknown = schema;
    for (const cle of cles) courant = estObjet(courant) ? courant[cle] : undefined;
    if (typeof courant !== "number" || !Number.isInteger(courant) || courant < 1) {
      throw new Error(
        `plafond de longueur absent ou invalide dans le schema du corpus : ${cles.join(".")}`,
      );
    }
    return courant;
  };

  return {
    theme: plafond("$defs", "carte", "properties", "theme", "maxLength"),
    q: plafond("$defs", "question", "properties", "q", "maxLength"),
    r: plafond("$defs", "question", "properties", "r", "maxLength"),
    note: plafond("$defs", "question", "properties", "note", "maxLength"),
  };
}

/** Ouvre le schema du depot et en extrait les plafonds. */
export function lirePlafonds(chemin: string = CHEMIN_SCHEMA): Plafonds {
  const schema: unknown = JSON.parse(readFileSync(chemin, "utf8"));
  return extrairePlafonds(schema);
}

/**
 * Vrai si la chaine tient dans son plafond, sinon releve la mesure exacte.
 *
 * La longueur se compte en POINTS DE CODE, parce que c'est ainsi que JSON
 * Schema definit `maxLength`. Compter en unites UTF-16, ce que fait `.length`,
 * ferait diverger ce controle de celui que l'editeur applique a la frappe des
 * le premier caractere hors du plan multilingue de base : deux verdicts
 * opposes pour un seul plafond et un seul fichier.
 */
function tientDansSonPlafond(
  champ: string,
  valeur: string,
  plafond: number,
  releve: (quoi: string) => void,
): boolean {
  const longueur = [...valeur].length;
  if (longueur <= plafond) return true;
  releve(
    `${champ} de ${longueur} caracteres pour un plafond de ${plafond}, ` +
      "fixe par content/schema/lot.schema.json",
  );
  return false;
}

function analyserQuestion(
  brut: unknown,
  releve: (quoi: string) => void,
  plafonds: Plafonds,
): Question | null {
  if (!estObjet(brut)) {
    releve("une question n'est pas un objet");
    return null;
  }

  const { niveau, q, r, note } = brut;

  const niveauOk = estNiveau(niveau);
  if (!niveauOk) releve(`niveau absent ou hors de 1 a ${NB_QUESTIONS}`);

  const qOk = chaineNonVide(q);
  if (!qOk) releve("enonce absent ou vide");

  const rOk = chaineNonVide(r);
  if (!rOk) releve("reponse absente ou vide");

  const noteOk = note === undefined || typeof note === "string";
  if (!noteOk) releve("note d'arbitrage presente mais pas une chaine");

  /*
   * Les plafonds ne se mesurent que sur une chaine effectivement presente : le
   * `typeof` de gauche n'est pas une precaution, c'est ce qui evite d'annoncer
   * une longueur sur une valeur qui n'existe pas, alors que son absence vient
   * deja d'etre relevee juste au-dessus.
   */
  const qCourt = typeof q !== "string" || tientDansSonPlafond("enonce", q, plafonds.q, releve);
  const rCourt = typeof r !== "string" || tientDansSonPlafond("reponse", r, plafonds.r, releve);
  const noteCourte =
    typeof note !== "string" ||
    tientDansSonPlafond("note d'arbitrage", note, plafonds.note, releve);

  if (!(niveauOk && qOk && rOk && noteOk && qCourt && rCourt && noteCourte)) return null;
  return note === undefined ? { niveau, q, r } : { niveau, q, r, note };
}

function analyserQuestions(
  brut: unknown,
  releve: (quoi: string) => void,
  plafonds: Plafonds,
): readonly Question[] | null {
  if (!estTableau(brut)) {
    releve("questions absentes ou pas un tableau");
    return null;
  }

  if (brut.length !== NB_QUESTIONS) {
    releve(`${brut.length} question(s) au lieu de ${NB_QUESTIONS}`);
    return null;
  }

  const lues: Question[] = [];
  for (const element of brut) {
    const question = analyserQuestion(element, releve, plafonds);
    if (question !== null) lues.push(question);
  }
  if (lues.length !== NB_QUESTIONS) return null;

  // Les niveaux 1 a 10 exactement une fois. La longueur etant deja acquise,
  // il suffit de compter les niveaux distincts : dix questions portant dix
  // niveaux distincts pris dans 1 a 10 les couvrent tous.
  const distincts = new Set<number>(lues.map((question) => question.niveau));
  if (distincts.size !== NB_QUESTIONS) {
    const manquants = Object.keys(NIVEAUX_ATTENDUS).filter(
      (niveau) => !distincts.has(Number(niveau)),
    );
    releve(`niveaux non couverts exactement une fois, manquants : ${manquants.join(", ")}`);
    return null;
  }

  return lues;
}

/**
 * Interprete une carte brute, ou rend `null` en relevant ce qui cloche.
 *
 * Tous les manquements d'une carte sont releves, pas seulement le premier :
 * corriger un corpus une faute a la fois coute une compilation par faute.
 */
export function analyserCarte(
  brut: unknown,
  ou: string,
  plafonds: Plafonds,
): { readonly carte: Carte | null; readonly fautes: readonly Faute[] } {
  const fautes: Faute[] = [];
  const releve = (quoi: string) => {
    fautes.push({ ou, quoi });
  };

  if (!estObjet(brut)) {
    releve("la carte n'est pas un objet");
    return { carte: null, fautes };
  }

  const { id, theme, paquet, domaine, source, valide } = brut;

  const idOk = chaineNonVide(id);
  if (!idOk) releve("identifiant absent ou vide");

  const themeOk = chaineNonVide(theme);
  if (!themeOk) releve("theme absent ou vide");

  const themeCourt =
    typeof theme !== "string" || tientDansSonPlafond("theme", theme, plafonds.theme, releve);

  const paquetOk = estPaquet(paquet);
  if (!paquetOk) releve(`paquet inconnu : ${String(paquet)}`);

  const domaineOk = estDomaine(domaine);
  if (!domaineOk) releve(`domaine inconnu : ${String(domaine)}`);

  const sourceOk = estSource(source);
  if (!sourceOk) releve(`source inconnue : ${String(source)}`);

  const valideOk = typeof valide === "boolean";
  if (!valideOk) releve("champ valide absent ou pas un booleen");

  const questions = analyserQuestions(brut.questions, releve, plafonds);

  if (
    idOk &&
    themeOk &&
    themeCourt &&
    paquetOk &&
    domaineOk &&
    sourceOk &&
    valideOk &&
    questions !== null &&
    // Redondant avec les drapeaux ci-dessus, et garde volontairement :
    // l'appelant retient la carte et empile les fautes separement, donc
    // « carte rendue » doit signifier « aucune faute », y compris apres un
    // controle ajoute plus tard qui oublierait son drapeau.
    fautes.length === 0
  ) {
    return { carte: { id, theme, paquet, domaine, questions, source, valide }, fautes };
  }
  return { carte: null, fautes };
}

/**
 * Parcourt un dossier de contenu et rend ses fichiers JSON, tries par chemin.
 *
 * Le tri n'est pas cosmetique : il fixe l'ordre du corpus compile, donc rend
 * la sortie reproductible d'une machine a l'autre, la ou l'ordre de lecture
 * du systeme de fichiers ne l'est pas.
 */
export function lireLots(dossier: string): readonly LotLu[] {
  const chemins: string[] = [];
  const descendre = (courant: string) => {
    for (const entree of readdirSync(courant).sort()) {
      const chemin = join(courant, entree);
      if (statSync(chemin).isDirectory()) descendre(chemin);
      else if (extname(entree) === ".json") chemins.push(chemin);
    }
  };
  descendre(dossier);

  return chemins.map((chemin) => {
    const texte = readFileSync(chemin, "utf8");
    let brut: unknown;
    try {
      brut = JSON.parse(texte);
    } catch {
      // Le seul `catch` du fichier, et il ne fait rien taire : un JSON
      // illisible ressort en faute par `brut` reste indefini, avec le chemin
      // du fichier (conventions-code.md section 7).
      brut = undefined;
    }
    return { chemin, brut };
  });
}

/**
 * Le coeur du compilateur, sans aucune entree-sortie : il prend les lots lus
 * et rend ce qu'il faut ecrire, plus ce qui l'empeche de l'etre. C'est cette
 * separation qui rend les invariantes testables sans toucher au disque.
 *
 * Les plafonds sont INJECTES pour la meme raison, et non lus ici : un test peut
 * alors en passer d'autres et prouver que le controle depend bien de ce qui
 * vient du schema, la ou une lecture interne rendrait la mesure invisible.
 */
export function compilerCorpus(lots: readonly LotLu[], plafonds: Plafonds): Rapport {
  const fautes: Faute[] = [];
  const saines: Carte[] = [];

  /*
   * L'unicite se compte sur TOUT ce qui est lu, fixtures et cartes non relues
   * comprises. Un identifiant est reference par l'historique des parties sur
   * les telephones (architecture.md section 4) : le recycler casse
   * l'anti-repetition, que la carte soit jouee aujourd'hui ou demain.
   */
  const vus = new Map<CarteId, string>();

  for (const lot of lots) {
    const ouLot = relative(RACINE, lot.chemin).split(sep).join("/");

    if (!estObjet(lot.brut)) {
      fautes.push({ ou: ouLot, quoi: "fichier illisible ou racine qui n'est pas un objet" });
      continue;
    }
    if (!estTableau(lot.brut.cartes)) {
      fautes.push({ ou: ouLot, quoi: "champ cartes absent ou pas un tableau" });
      continue;
    }

    lot.brut.cartes.forEach((brut, index) => {
      const identifiant =
        estObjet(brut) && chaineNonVide(brut.id) ? brut.id : `carte en position ${index + 1}`;
      const ou = `${ouLot} : ${identifiant}`;

      const { carte, fautes: relevees } = analyserCarte(brut, ou, plafonds);
      fautes.push(...relevees);
      if (carte === null) return;

      const deja = vus.get(carte.id);
      if (deja !== undefined) {
        fautes.push({ ou, quoi: `identifiant deja porte par ${deja}` });
        return;
      }
      vus.set(carte.id, ou);
      saines.push(carte);
    });
  }

  const horsFixtures = saines.filter((carte) => carte.paquet !== PAQUET_FIXTURES);
  const cartes = horsFixtures.filter((carte) => carte.valide);

  if (cartes.length < SEUIL_PRODUCTION) {
    fautes.push({
      ou: "corpus",
      quoi: `${cartes.length} carte(s) retenue(s) pour un seuil de ${SEUIL_PRODUCTION}`,
    });
  }

  return {
    cartes,
    fixtures: saines.filter((carte) => carte.paquet === PAQUET_FIXTURES),
    fautes,
    lues: saines.length,
    questions: cartes.reduce((total, carte) => total + carte.questions.length, 0),
    ecarteesFixtures: saines.length - horsFixtures.length,
    ecarteesNonRelues: horsFixtures.length - cartes.length,
  };
}

function principal(): void {
  const rapport = compilerCorpus(lireLots(DOSSIER_CARTES), lirePlafonds());

  if (rapport.fautes.length > 0) {
    process.stdout.write(
      `Compilation du corpus : ${rapport.fautes.length} manquement(s), rien n'est ecrit.\n\n`,
    );
    for (const faute of rapport.fautes) {
      process.stdout.write(`  ${faute.quoi}\n    ${faute.ou}\n\n`);
    }
    process.exit(1);
  }

  mkdirSync(dirname(SORTIE), { recursive: true });
  writeFileSync(SORTIE, `${JSON.stringify(rapport.cartes, null, 2)}\n`, "utf8");
  writeFileSync(SORTIE_FIXTURES, `${JSON.stringify(rapport.fixtures, null, 2)}\n`, "utf8");

  const nom = (chemin: string) => relative(RACINE, chemin).split(sep).join("/");
  process.stdout.write(
    `Compilation du corpus : ${rapport.cartes.length} cartes, ${rapport.questions} questions.\n` +
      `  lues : ${rapport.lues}, dont ecartees ${rapport.ecarteesFixtures} de fixture ` +
      `et ${rapport.ecarteesNonRelues} non relue(s).\n` +
      `  ecrit : ${nom(SORTIE)}\n` +
      `  ecrit : ${nom(SORTIE_FIXTURES)} (${rapport.fixtures.length} carte(s), banc de recette)\n`,
  );
}

/*
 * tools/compiler.test.ts importe ce module pour eprouver ses invariantes, et
 * doit obtenir les fonctions sans declencher l'ecriture du fichier. Le garde
 * compare le module au script que Node a recu en argument : vrai en ligne de
 * commande, faux sous Vitest.
 */
const lance = process.argv[1];
if (lance !== undefined && import.meta.url === pathToFileURL(lance).href) principal();
