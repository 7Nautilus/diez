/*
 * Diez : ce qu'un AUTRE document de la meme origine vient d'ecrire.
 *
 * LE DEFAUT QUE CE FICHIER FERME, ET IL A ETE MESURE PLUTOT QUE SUPPOSE. Aucun
 * ecouteur `storage` n'existait : chaque document lisait les quatre clefs une
 * fois a l'amorcage, puis les reecrivait depuis sa memoire. Deux documents de
 * la meme origine s'ecrasaient donc l'un l'autre. Sequence rejouee au
 * navigateur, deux onglets sur la meme application :
 *
 *   A joue la carte 009 niveau 1     base historique {"seconde-guerre-mondiale-001":[1]}
 *   B, ouvert avant, tire la meme    ses dix crans affiches "libre"
 *   B choisit le niveau 1            B pose LA MEME QUESTION MOT POUR MOT
 *   B revele                         base tour : celui de A est remplace
 *   B signale                        base signalements : celui de A a disparu
 *
 * Une question reentendue est ce que le projet tient pour cassant la partie
 * (architecture.md section 6), et le defaut COMPOSE avec le geste de retour :
 * on sortait de l'application par un balayage, on la rouvrait, et le second
 * document naissait la (app/navigation.ts).
 *
 * CE MODULE NE TRANSPORTE AUCUNE VALEUR, ET C'EST DELIBERE. L'evenement
 * `storage` porte bien `newValue`, mais s'en servir demanderait de redecoder et
 * revalider chaque forme une seconde fois, a cote des validateurs qui existent
 * deja. L'evenement ne sert donc que de SIGNAL : il dit quelle clef a bouge, et
 * l'appelant relit par le chemin normal, celui qui valide. Une forme validee a
 * un seul endroit ne peut pas diverger d'elle-meme.
 *
 * L'EVENEMENT N'ARRIVE JAMAIS DANS LE DOCUMENT QUI A ECRIT. C'est la
 * specification du navigateur, et c'est ce qui evite d'avoir a distinguer son
 * propre echo de celui du voisin.
 */

import { cleDe, SUFFIXES, type Suffixe } from "./cles";

/**
 * Quelles de nos clefs ce nom designe-t-il ?
 *
 * `nom` A `null` VEUT DIRE QUE LE VOISIN A TOUT EFFACE. C'est ce que le
 * navigateur envoie sur un `localStorage.clear()`, et le confondre avec "aucune
 * clef touchee" laisserait un document afficher un historique que plus rien ne
 * porte. Les quatre clefs sont alors declarees touchees.
 *
 * Un nom etranger rend une liste VIDE plutot qu'un signal : le stockage d'une
 * origine est partage par tout ce qui y tourne, et une autre application servie
 * depuis le meme hote ferait sinon relire les quatre clefs a chaque ecriture.
 */
export function suffixesTouches(nom: string | null): readonly Suffixe[] {
  if (nom === null) return SUFFIXES;
  const touche = SUFFIXES.find((suffixe) => cleDe(suffixe) === nom);
  return touche === undefined ? [] : [touche];
}

/**
 * Abonne `signaler` aux ecritures d'un autre document de la meme origine, et
 * rend de quoi se desabonner.
 *
 * EXTRAITE DU CABLAGE POUR ETRE TESTABLE, exactement comme
 * `abonnerALaVisibilite` (app/execution.ts) : la cible arrive en parametre,
 * donc la sonde peut voir l'ecouteur s'inscrire, se declencher et se retirer
 * sans navigateur. Un abonnement qu'aucun test n'a vu s'inscrire n'est pas un
 * abonnement, c'est un commentaire.
 *
 * `signaler` n'est PAS appele quand rien de connu n'a bouge : l'appelant
 * relirait alors le stockage pour rien, a chaque frappe d'une autre
 * application servie depuis le meme hote.
 */
export function abonnerAuxEcrituresVoisines(
  cible: Pick<Window, "addEventListener" | "removeEventListener">,
  signaler: (suffixes: readonly Suffixe[]) => void,
): () => void {
  const surEcriture = (evenement: StorageEvent) => {
    const touches = suffixesTouches(evenement.key);
    if (touches.length === 0) return;
    signaler(touches);
  };
  cible.addEventListener("storage", surEcriture);
  return () => cible.removeEventListener("storage", surEcriture);
}
