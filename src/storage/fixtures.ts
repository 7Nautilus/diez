/*
 * Diez : de quoi eprouver `storage/` sans navigateur.
 *
 * POURQUOI CE FICHIER EST A PLAT et non dans un `__tests__/`, contrairement a
 * ceux du domaine : la regle de dependance de `storage/` n'autorise que les
 * imports en `./*`, et un fichier place dans un sous-dossier devrait remonter
 * en `../`. Mesure faite avant d'ecrire une ligne : Biome refuse alors l'import
 * par `lint/style/noRestrictedImports`, en citant la regle de `storage/`. La
 * disposition a plat est la consequence de la regle, pas une preference.
 *
 * Le vrai `localStorage` n'existe pas sous Node, et c'est utile : l'absence
 * pure et simple est justement l'un des etats a eprouver, celui d'un navigateur
 * en navigation privee ou d'un stockage refuse par une politique de site. Les
 * fonctions ci-dessous permettent les deux autres, un stockage qui marche et un
 * stockage qui leve.
 */

/** Un stockage en memoire, conforme a l'interface du navigateur. */
export function stockageEnMemoire(contenu: Map<string, string> = new Map()): Storage {
  return {
    get length() {
      return contenu.size;
    },
    clear: () => contenu.clear(),
    getItem: (cle: string) => contenu.get(cle) ?? null,
    key: (index: number) => [...contenu.keys()][index] ?? null,
    removeItem: (cle: string) => {
      contenu.delete(cle);
    },
    setItem: (cle: string, valeur: string) => {
      contenu.set(cle, String(valeur));
    },
  };
}

/**
 * Un stockage qui leve a chaque acces.
 *
 * Ce n'est pas un cas theorique : au-dela du quota, `setItem` leve, et hors
 * contexte securise ou sous certaines politiques de site, `getItem` aussi. Une
 * exception remontee de la ferait planter le demarrage sur une preference de
 * couleur, ce qui serait hors de proportion.
 */
export function stockageQuiLeve(): Storage {
  const refus = () => {
    throw new DOMException("Stockage indisponible", "SecurityError");
  };
  return {
    get length(): number {
      return refus();
    },
    clear: refus,
    getItem: refus,
    key: refus,
    removeItem: refus,
    setItem: refus,
  };
}

export function installerStockage(stockage: Storage): void {
  globalThis.localStorage = stockage;
}

/**
 * Retire le stockage du contexte global, ce qui remet Node dans son etat
 * naturel : `localStorage` n'y est pas declare, donc le NOMMER leve une
 * `ReferenceError`. C'est precisement ce que `storage/` doit absorber, et
 * `Reflect.deleteProperty` est la seule facon d'y revenir, `delete` refusant
 * une propriete que le typage declare obligatoire.
 */
export function retirerStockage(): void {
  Reflect.deleteProperty(globalThis, "localStorage");
}

/*
 * Le vocabulaire que l'appelant fournit par predicat. Il est FICTIF et le
 * reste : `PaquetId` et `ModeAffichage` vivent respectivement dans
 * domain/types.ts et screens/types.ts, que `storage/` n'a pas le droit
 * d'importer. Recopier ici les vraies listes donnerait l'illusion d'un accord
 * que rien ne verifie ; un vocabulaire visiblement invente rappelle que ce qui
 * est teste, c'est le MECANISME du predicat et non le contenu des listes.
 */

const PAQUETS_FICTIFS = ["alpha", "beta"] as const;

export type PaquetFictif = (typeof PAQUETS_FICTIFS)[number];

export function estPaquetFictif(valeur: string): valeur is PaquetFictif {
  return PAQUETS_FICTIFS.some((connu) => connu === valeur);
}

const MODES_FICTIFS = ["auto", "sombre"] as const;

export type ModeFictif = (typeof MODES_FICTIFS)[number];

export function estModeFictif(valeur: string): valeur is ModeFictif {
  return MODES_FICTIFS.some((connu) => connu === valeur);
}
