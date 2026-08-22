/*
 * Diez : le modele de donnees du domaine.
 *
 * SOURCE UNIQUE des types du jeu. Ils viennent de docs/architecture.md
 * sections 4 et 5, qui fait foi ; ce fichier ne fait que les rendre
 * executables.
 *
 * Ce module n'importe rien, et les deux autres du domaine n'importent que
 * lui : c'est le principe P2 (architecture.md section 3). Ce dont le domaine
 * a besoin lui est injecte en parametre, jamais importe : le corpus,
 * l'horloge (`maintenant`), l'aleatoire.
 */

/** L'echelle du jeu, d'ou son nom. */
export type Niveau = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * Stable et jamais recycle. L'historique des parties reference des `id` :
 * renumeroter le corpus casserait l'anti-repetition sur les telephones
 * (architecture.md section 4).
 */
export type CarteId = string;

export type PaquetId = "general" | "maison" | "_fixtures";

/**
 * La liste fait foi dans content/schema/lot.schema.json, qui la fait
 * respecter a la saisie. Elle est reprise ici parce que TypeScript ne lit pas
 * le schema : un domaine ajoute la-bas doit l'etre ici aussi, sans quoi le
 * corpus compile ne se typera plus.
 */
export type Domaine =
  | "histoire-geo"
  | "sciences"
  | "cinema-series"
  | "musique"
  | "sport"
  | "jeux-video-internet"
  | "langue-litterature"
  | "vie-quotidienne"
  | "arts-mythologie"
  | "marques-business"
  | "insolite"
  | "_test";

export type Question = {
  niveau: Niveau;
  q: string;
  r: string;
  /** Precision d'arbitrage, affichee sous la reponse. */
  note?: string;
};

/**
 * Une carte du corpus, avec ses dix questions.
 *
 * Les plafonds de longueur de `theme`, `q`, `r` et `note` ne sont pas repris
 * ici : leur source unique est content/schema/lot.schema.json
 * (tokens-et-composants.md, "Ce qui n'est pas un token"). Les recopier en
 * TypeScript ouvrirait un second endroit ou ils pourraient deriver.
 */
export type Carte = {
  id: CarteId;
  theme: string;
  paquet: PaquetId;
  domaine: Domaine;
  questions: readonly Question[];
  source: "genere" | "manuel";
  /**
   * Relu par un humain. Le domaine ne filtre pas la-dessus, et c'est
   * volontaire : le compilateur de contenu ecarte les `false` avant le build
   * (architecture.md section 8), donc une carte non relue ne peut pas
   * atteindre le corpus qu'on lui passe.
   */
  valide: boolean;
};

/**
 * Quels niveaux ont ete consommes sur quelle carte, et non "carte vue ou pas
 * vue" : une carte reste jouable tant qu'il lui reste des questions inedites
 * (architecture.md section 6).
 */
export type Historique = Record<CarteId, readonly Niveau[]>;

/**
 * Ce que la phase THEME peut montrer d'une carte, et rien de plus.
 *
 * Les quatre champs a `never` ne sont pas une precaution de style, ils
 * REFUSENT une `Carte` entiere. Sans eux, P3 ne tenait que par discipline :
 * TypeScript etant structurel, une `Carte` satisfait `{ id, theme, paquet }`,
 * et le controle des proprietes en trop ne s'applique qu'a un litteral, jamais
 * a une variable. Or la phase 4 ecrira une variable :
 *
 *     const carte = piocher(...)                          // rend une Carte
 *     reduire(etat, { type: "piocher", carte }, maintenant)
 *
 * Mesure faite avant correctif : cette ligne compilait, et l'etat THEME
 * emportait les dix reponses de la carte. Le compilateur refusait la forme que
 * personne n'ecrit et acceptait celle que tout le monde ecrira.
 */
export type ResumeCarte = {
  id: CarteId;
  theme: string;
  paquet: PaquetId;
  questions?: never;
  domaine?: never;
  source?: never;
  valide?: never;
};

/**
 * L'enonce seul, sans sa reponse.
 *
 * `r` et `note` a `never` pour la meme raison, et l'enjeu y est le plus fort
 * du projet : une `Question` satisfait `{ niveau, q }`, donc passer
 * `carte.questions[n]` en `enonce` mettait la reponse dans l'etat de la phase
 * QUESTION, celle que le narrateur fixe en lisant a voix haute
 * (architecture.md section 5).
 */
export type EnonceQuestion = { niveau: Niveau; q: string; r?: never; note?: never };

export type Reponse = { r: string; note?: string };

/**
 * L'etat du tour, phase par phase.
 *
 * P3 s'exprime ici et nulle part ailleurs : a chaque phase, l'etat contient
 * exactement ce qui peut etre montre. THEME ne porte aucun enonce, QUESTION
 * porte l'enonce mais aucune reponse. Le narrateur lit a voix haute en fixant
 * son ecran : si la reponse vivait dans le meme etat, elle serait a un noeud
 * du DOM de ce qu'il est en train de prononcer (architecture.md section 5).
 *
 * `depuis` est l'horodatage de l'entree dans la phase, et sert au verrou
 * d'entree. REPOS n'en porte pas : il n'y a pas d'entree de phase a proteger.
 */
export type EtatTour =
  | { phase: "REPOS" }
  | { phase: "THEME"; carte: ResumeCarte; depuis: number }
  | { phase: "NIVEAU"; carte: ResumeCarte; consommes: readonly Niveau[]; depuis: number }
  | { phase: "QUESTION"; carte: ResumeCarte; enonce: EnonceQuestion; depuis: number }
  | {
      phase: "REPONSE";
      carte: ResumeCarte;
      enonce: EnonceQuestion;
      reponse: Reponse;
      depuis: number;
    };

/**
 * Les actions portent ce qu'elles revelent.
 *
 * La recherche a lieu chez l'appelant, qui possede le corpus ; l'action
 * transporte la seule donnee que la phase visee a le droit de montrer. Le
 * reducteur ne voit donc jamais une carte complete et ne peut structurellement
 * pas fuiter, quel que soit le bug commis plus tard dans les ecrans
 * (spec-fondations.md, phase 2, decision 3).
 *
 * ECART ASSUME avec la liste de spec-fondations.md, qui posait `consommes`
 * sur `piocher` et `suivante` et laissait `annoncer` sans charge. Ces deux
 * actions menent a THEME, dont architecture.md section 5 dit qu'il ne porte
 * pas `consommes` ; le reducteur n'avait donc aucun endroit ou le ranger, et
 * NIVEAU ne pouvait pas l'obtenir. La charge suit ici la regle que
 * spec-fondations.md enonce elle-meme : elle voyage avec l'action qui entre
 * dans la phase qui l'affiche, comme `enonce` avec `choisir` et `reponse`
 * avec `reveler`. architecture.md fait foi, la specification etait fausse.
 */
export type Action =
  | { type: "piocher"; carte: ResumeCarte }
  | { type: "annoncer"; consommes: readonly Niveau[] }
  | { type: "retour" }
  | { type: "choisir"; niveau: Niveau; enonce: EnonceQuestion }
  | { type: "reveler"; reponse: Reponse }
  | { type: "suivante"; carte: ResumeCarte }
  | { type: "terminer" };

/**
 * L'aleatoire, injecte. Rend un nombre de [0, 1), comme `Math.random`.
 *
 * Injecte plutot qu'appele directement pour que la pioche soit reproductible
 * en test, sans hasard (spec-fondations.md, phase 2, decision 2).
 */
export type Aleatoire = () => number;

/*
 * Les constantes du domaine. Meme regle que les tokens CSS : definies une
 * fois, citees par leur nom partout ailleurs (tokens-et-composants.md,
 * collection 4).
 */

/**
 * Verrou d'entree : architecture.md section 10.
 *
 * Sans lui, un double tap par impatience ou par tremblement revele la reponse
 * puis enchaine sur la carte suivante : la reponse s'affiche 200 ms et la
 * carte est perdue, sans que personne d'autre que le narrateur ait vu l'ecran.
 */
export const VERROU_MS = 400;

/**
 * Les dix niveaux d'une carte, dans l'ordre. Sa longueur est le seuil
 * d'epuisement d'une carte (paquet.ts).
 *
 * `satisfies` ne verifie qu'UN SEUL SENS : que chaque element est un `Niveau`.
 * Il laisse passer une liste amputee. Mesure : reduite a neuf elements, `tsc`,
 * Biome et les soixante-huit tests restaient au vert, alors que chaque carte
 * aurait ete declaree epuisee apres neuf questions. Les tests ne pouvaient pas
 * le voir, ils derivent tous de `NIVEAUX` et se deplacent avec lui.
 */
export const NIVEAUX = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const satisfies readonly Niveau[];

/**
 * L'autre sens, celui que `satisfies` ne couvre pas : tout `Niveau` figure
 * dans `NIVEAUX`. Si un niveau manque, le type vaut `never` et l'affectation
 * ci-dessous ne compile plus. C'est le seul lien mecanique entre le type
 * `Niveau` et la liste, qui ecrivent chacun le nombre dix de leur cote.
 */
type NiveauManquant = Exclude<Niveau, (typeof NIVEAUX)[number]>;
export const AUCUN_NIVEAU_MANQUANT: [NiveauManquant] extends [never] ? true : never = true;
