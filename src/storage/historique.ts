/*
 * Diez : `diez:v1:historique`, quels niveaux ont ete consommes sur quelle carte.
 *
 * C'est la clef dont la perte se voit le plus vite en soiree : sans elle, une
 * question deja posee revient, et c'est le seul defaut que la table remarque
 * immediatement (architecture.md section 6).
 *
 * TOUT OU RIEN. Une entree mal formee fait retomber la clef entiere sur
 * l'historique vide, plutot que de conserver ce qui se lisait encore. Une
 * recuperation partielle produirait un etat qui n'est ni celui qu'on a
 * enregistre ni un etat neuf : l'anti-repetition serait incomplete d'une
 * quantite inconnue, silencieusement, alors qu'un historique vide est un etat
 * connu, annonce par le compteur de cartes restantes de l'accueil. La regle est
 * la meme pour les quatre clefs, ce qui evite d'avoir a se souvenir laquelle
 * recupere quoi.
 */

import { ecrireBrut, lireBrut } from "./stockage";
import { estIdentifiant, estListeDe, estNiveau, estObjet, type NiveauStocke } from "./validation";

/**
 * La forme validee, redeclaree faute de pouvoir importer `Historique`
 * (validation.ts, en-tete). Structurellement identique, donc assignable au type
 * du domaine au moment du cablage.
 */
export type HistoriqueStocke = Record<string, readonly NiveauStocke[]>;

/**
 * L'historique enregistre, ou `null` si la clef ne porte pas la forme attendue.
 *
 * EXPORTE separement de `lireHistorique`, contre l'habitude de garder prive un
 * detail d'implementation : c'est la fonction qui refuse, donc la seule qu'on
 * puisse montrer en train de refuser, sans stockage de navigateur ni horloge.
 */
export function validerHistorique(brut: unknown): HistoriqueStocke | null {
  if (!estObjet(brut)) return null;
  const paires: [string, readonly NiveauStocke[]][] = [];
  for (const [identifiant, niveaux] of Object.entries(brut)) {
    if (!estIdentifiant(identifiant)) return null;
    if (!estListeDe(niveaux, estNiveau)) return null;
    paires.push([identifiant, niveaux]);
  }
  // `Object.fromEntries` et non une affectation indexee : une clef nommee comme
  // le prototype serait interpretee comme une affectation de prototype et non
  // rangee, ce qui est precisement le genre de contenu qu'une clef abimee peut
  // porter.
  return Object.fromEntries(paires);
}

export function lireHistorique(): HistoriqueStocke {
  return validerHistorique(lireBrut("historique")) ?? {};
}

export function ecrireHistorique(historique: HistoriqueStocke): void {
  ecrireBrut("historique", historique);
}
