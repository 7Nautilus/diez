/*
 * Diez : `diez:v1:signalements`, les questions jugees douteuses par le
 * narrateur.
 *
 * Elles parlent du CONTENU et non de la soiree : elles survivent a une
 * reinitialisation d'historique, et leur destination est le depot, par le geste
 * `COPIER LES SIGNALEMENTS` de l'accueil (architecture.md section 7). Une liste
 * qui ne survit pas au rechargement ne peut pas remplir cette fonction, un
 * narrateur ne recopiant pas des signalements a mesure qu'il les pose.
 *
 * LES QUATRE CHAMPS SONT RECONSTRUITS UN A UN, jamais l'objet relu tel quel.
 * C'est la meme discipline qu'`avancer` applique a l'enonce (app/partie.ts) et
 * elle a ici le meme effet : une clef editee a la main portant une reponse en
 * plus ne pourrait pas la faire entrer dans l'etat de l'application.
 */

import { ecrireBrut, lireBrut } from "./stockage";
import {
  estIdentifiant,
  estListeDe,
  estNiveau,
  estObjet,
  estTexte,
  type NiveauStocke,
} from "./validation";

/**
 * La forme validee, redeclaree faute de pouvoir importer `Signalement`
 * (validation.ts, en-tete).
 *
 * `theme` et `q` accompagnent `carte` et `niveau` pour que la liste collee dans
 * une conversation se lise sans avoir le corpus sous les yeux : ils sont donc
 * exiges, mais leur contenu n'est qu'un texte a afficher, et le vide y est
 * tolere la ou il ne l'est pas pour un identifiant.
 */
export type SignalementStocke = {
  carte: string;
  niveau: NiveauStocke;
  theme: string;
  q: string;
};

function estSignalement(valeur: unknown): valeur is SignalementStocke {
  if (!estObjet(valeur)) return false;
  return (
    estIdentifiant(valeur.carte) &&
    estNiveau(valeur.niveau) &&
    estTexte(valeur.theme) &&
    estTexte(valeur.q)
  );
}

/**
 * La liste enregistree, ou `null` si la clef ne porte pas la forme attendue.
 * Exportee pour la raison ecrite dans historique.ts : c'est la fonction qui
 * refuse.
 */
export function validerSignalements(brut: unknown): readonly SignalementStocke[] | null {
  if (!estListeDe(brut, estSignalement)) return null;
  return brut.map((signalement) => ({
    carte: signalement.carte,
    niveau: signalement.niveau,
    theme: signalement.theme,
    q: signalement.q,
  }));
}

export function lireSignalements(): readonly SignalementStocke[] {
  return validerSignalements(lireBrut("signalements")) ?? [];
}

export function ecrireSignalements(signalements: readonly SignalementStocke[]): void {
  ecrireBrut("signalements", signalements);
}
