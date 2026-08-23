/*
 * Diez : les predicats de forme, partages par les quatre clefs.
 *
 * UN `JSON.parse` REUSSI NE PROUVE RIEN. `{"historique": 42}` s'analyse tres
 * bien, et rendu tel quel il ferait echouer la premiere lecture d'un tableau de
 * niveaux, au demarrage, sans qu'aucun message ne dise pourquoi. Ce qui protege
 * n'est donc pas l'analyse mais le controle de FORME qui la suit, et c'est ce
 * fichier.
 *
 * LA DUPLICATION DE `NiveauStocke` EST LE PRIX DE LA REGLE DE DEPENDANCE, PAS
 * UN OUBLI. `storage/` n'importe rien, pas meme `domain/` : ce qu'il valide, il
 * doit le redeclarer (architecture.md section 3, et le lint le refuse par la
 * regle `noRestrictedImports`, verifiee en train de refuser).
 *
 * ELLE N'EST PAS LIVREE A LA VIGILANCE POUR AUTANT, et le point a ete mesure
 * plutot que suppose. Le cablage LIT et ECRIT chaque clef, ce qui donne au
 * compilateur les deux sens a la fois : une lecture affecte un
 * `EtatTourStocke` a un type du domaine, donc une echelle locale plus LARGE ne
 * compile plus ; une ecriture passe une valeur du domaine a `storage/`, donc
 * une echelle locale plus ETROITE ne compile plus non plus. Mesure sur une
 * sonde de cablage : `NiveauStocke` elargi a 11 et retreci a 1..9 font echouer
 * `tsc` tous les deux, chacun par un sens different.
 *
 * La condition tient a ce que chaque clef soit relue ET reecrite. Une clef qui
 * ne serait plus qu'ecrite, ou plus que lue, retomberait a un seul sens de
 * garde, et une derive de l'echelle passerait de ce cote-la.
 */

/** L'echelle du jeu, redeclaree. Voir l'en-tete. */
export type NiveauStocke = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/*
 * Les bornes de l'echelle, recopiees de `Niveau` et de `NIVEAUX`
 * (domain/types.ts, tokens-et-composants.md collection 4). Elles sont ecrites
 * en constantes et non en litteraux dans le test ci-dessous pour la raison
 * habituelle : un nombre nu au point d'usage se fait simplifier un jour par
 * quelqu'un qui ignore ce qu'il tient (conventions-code.md section 6).
 */
const NIVEAU_MIN = 1;
const NIVEAU_MAX = 10;

/**
 * Un objet, et pas un tableau.
 *
 * `typeof null === "object"` en JavaScript, et un tableau aussi : les deux
 * exclusions sont ce qui separe `{}` de `null` et de `[]`, trois valeurs qu'un
 * `JSON.parse` rend indifferemment.
 */
export function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

export function estTexte(valeur: unknown): valeur is string {
  return typeof valeur === "string";
}

/**
 * Un identifiant vide ne designe rien, et il ne peut pas venir du corpus : le
 * laisser passer creerait une entree d'historique que rien ne pourra jamais
 * rapprocher d'une carte.
 */
export function estIdentifiant(valeur: unknown): valeur is string {
  return typeof valeur === "string" && valeur.length > 0;
}

export function estNiveau(valeur: unknown): valeur is NiveauStocke {
  return (
    typeof valeur === "number" &&
    Number.isInteger(valeur) &&
    valeur >= NIVEAU_MIN &&
    valeur <= NIVEAU_MAX
  );
}

/**
 * Un horodatage exploitable.
 *
 * `Number.isFinite` ecarte `NaN` et les infinis, que `typeof` declare pourtant
 * `number` : `JSON.parse` ne peut pas les produire, mais `Date.now()` sur une
 * horloge cassee, un calcul intermediaire ou une clef editee a la main le
 * peuvent. Un `NaN` traverserait ensuite le controle de peremption sans jamais
 * le declencher, une comparaison avec `NaN` etant toujours fausse : le tour
 * serait repris quel que soit son age.
 */
export function estHorodatage(valeur: unknown): valeur is number {
  return typeof valeur === "number" && Number.isFinite(valeur) && valeur >= 0;
}

export function estListeDe<T>(
  valeur: unknown,
  accepte: (element: unknown) => element is T,
): valeur is readonly T[] {
  return Array.isArray(valeur) && valeur.every((element: unknown) => accepte(element));
}

/**
 * Un champ facultatif : absent, ou conforme. Present mais du mauvais type est
 * un refus, jamais un champ ignore en silence.
 */
export function estFacultatif<T>(
  valeur: unknown,
  accepte: (element: unknown) => element is T,
): valeur is T | undefined {
  return valeur === undefined || accepte(valeur);
}
