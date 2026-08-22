/*
 * Diez : les reglages persistes, version MINIMALE de la phase 4.
 *
 * PERIMETRE ASSUME, ecrit ici pour qu'il ne se decouvre pas a l'usage. La
 * persistance est le chantier de la phase 5 (roadmap.md) : `diez:v1:historique`,
 * `diez:v1:signalements` et `diez:v1:tour` n'existent pas encore, donc un
 * rechargement perd l'anti-repetition, les signalements et le tour en cours.
 * Une seule clef est ecrite aujourd'hui, et une seule valeur dedans, le mode
 * d'affichage : un selecteur de preference qui ne survit pas au rechargement
 * n'est pas une preference, c'est un bouton. Les paquets actifs rejoindront la
 * meme clef en phase 5, avec la lecture versionnee et la migration `v1` vers
 * `v2` que decrit architecture.md section 7.
 *
 * `storage/` n'importe RIEN, pas meme un type du domaine (architecture.md
 * section 3, et le lint le refuse). D'ou la forme des fonctions ci-dessous :
 * ce module possede la clef, la forme JSON et la tolerance a la corruption ;
 * l'appelant possede le vocabulaire et le prouve par un predicat. Le type
 * `ModeAffichage` reste ainsi ecrit une seule fois, dans screens/types.ts, au
 * lieu d'etre recopie ici ou il aurait derive en silence.
 */

const CLE = "diez:v1:reglages";

/*
 * Chaque acces est enveloppe. `localStorage` LEVE, et pas seulement quand il
 * est plein : un navigateur en navigation privee, un stockage bloque par une
 * politique de site, ou un contexte non securise suffisent. Une exception
 * remontee d'ici planterait l'application au demarrage, sur une preference de
 * couleur, ce qui serait hors de proportion.
 */
function lireBrut(): unknown {
  try {
    const texte = localStorage.getItem(CLE);
    if (texte === null) return null;
    return JSON.parse(texte);
  } catch {
    return null;
  }
}

/**
 * Le mode enregistre, ou `defaut` si la clef est absente, illisible ou
 * porteuse d'une valeur que l'appelant ne reconnait pas.
 *
 * `accepte` est un predicat de type fourni par l'appelant : c'est lui qui sait
 * quelles chaines sont des modes, et c'est ce qui evite de redeclarer ici
 * l'union des trois. Jamais de `JSON.parse` non valide : une clef corrompue
 * retombe sur le defaut, elle ne fait pas planter le demarrage
 * (architecture.md section 7).
 */
export function lireMode<M extends string>(accepte: (valeur: string) => valeur is M, defaut: M): M {
  const brut = lireBrut();
  if (typeof brut !== "object" || brut === null) return defaut;
  const mode = (brut as { mode?: unknown }).mode;
  if (typeof mode !== "string" || !accepte(mode)) return defaut;
  return mode;
}

/**
 * Enregistre le mode, en preservant ce que la clef contient deja.
 *
 * La fusion n'est pas une precaution de style : la phase 5 ajoutera les
 * paquets actifs dans la meme clef, et une ecriture qui la remplacerait
 * entierement les effacerait a chaque bascule de mode. Un echec d'ecriture est
 * ignore, pour la raison qui vaut a la lecture : le quota ou une politique de
 * site ne doivent pas interrompre une soiree.
 */
export function ecrireMode(mode: string): void {
  const brut = lireBrut();
  const existant = typeof brut === "object" && brut !== null ? brut : {};
  try {
    localStorage.setItem(CLE, JSON.stringify({ ...existant, mode }));
  } catch {
    /* Une preference perdue ne vaut pas une soiree interrompue. */
  }
}
