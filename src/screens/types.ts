/*
 * Diez : ce que la couche des ecrans ajoute au vocabulaire du domaine.
 *
 * Trois declarations seulement, et aucune n'est du jeu : `EtatTour`, `Niveau`,
 * `ResumeCarte` et le reste vivent dans domain/types.ts, qui reste la source
 * unique du modele (architecture.md section 4). Ce fichier ne porte que ce
 * dont un ecran a besoin pour AFFICHER, et que le domaine n'a aucune raison
 * de connaitre : un libelle lisible, une preference de rendu.
 *
 * Il est ecrit ici plutot que dans chaque ecran parce que trois modules les
 * lisent : Accueil, Theme, et app/ qui fabrique les proprietes des deux. Trois
 * copies d'une meme table de libelles divergent sans que rien ne le signale,
 * et c'est exactement le defaut que le depot traque partout ailleurs.
 */

import type { PaquetId } from "../domain/types";

/**
 * Un paquet propose a la selection sur l'accueil.
 *
 * Le `libelle` ne se derive pas de l'`id` : `general` s'affiche "general", et
 * un identifiant de stockage n'a pas a dicter le mot que lit un narrateur.
 */
export type PaquetActif = {
  id: PaquetId;
  libelle: string;
  actif: boolean;
};

/**
 * Les trois etats du selecteur de mode (tokens.css, design-system.md
 * section 2).
 *
 * `auto` n'est pas un troisieme reglage : c'est l'ABSENCE d'attribut
 * `data-mode` sur la racine, donc le systeme qui decide. La pose de cet
 * attribut appartient a app/, seul a survivre au changement d'ecran.
 *
 * La liste est ecrite en VALEUR et le type en est deduit, a rebours de
 * l'habitude : un type union ne s'enumere pas a l'execution, or app/ doit
 * pouvoir reconnaitre le mode relu du stockage. L'ecrire dans l'autre sens
 * donnerait deux listes de trois mots dont rien ne garantirait l'accord.
 */
export const MODES_AFFICHAGE = ["auto", "sombre", "clair"] as const;

export type ModeAffichage = (typeof MODES_AFFICHAGE)[number];

/**
 * Le nom affichable d'un paquet, en table EXHAUSTIVE.
 *
 * `Record<PaquetId, string>` refuse de compiler des qu'un paquet est ajoute a
 * l'union sans libelle : le trou se decouvre a la compilation et non un soir
 * de partie, ou il se serait affiche en `undefined` sous le nez du narrateur.
 *
 * Les libelles sont en casse normale, les capitales etant posees par le style
 * de l'Etiquette et du Chip : une synthese vocale epelle volontiers un mot
 * ecrit tout en majuscules dans le document.
 */
export const LIBELLE_PAQUET: Record<PaquetId, string> = {
  general: "général",
  maison: "maison",
  _fixtures: "fixtures",
};

/**
 * Les mots de la demande de confirmation avant reinitialisation.
 *
 * DEUX ECRANS POSENT LA MEME QUESTION, et c'est la raison de cette table.
 * L'accueil l'ouvre depuis son menu, l'ecran d'epuisement depuis son unique
 * action ; c'est le meme effacement, donc ce doit etre la meme phrase. Les
 * deux appelants vivent dans des couches differentes, `screens/` et `app/`, et
 * ce fichier est le seul point que les deux atteignent sans prendre la regle
 * de dependance a rebours (architecture.md section 3).
 *
 * LA PHRASE DIT L'EFFET, ELLE NE LE JUGE PAS, et c'est ce qui permet de
 * l'ecrire une seule fois. Depuis le menu, "elles peuvent de nouveau sortir"
 * est le prix a payer ; depuis l'epuisement, c'est exactement ce que le
 * narrateur vient chercher. L'effet, lui, est identique dans les deux cas.
 *
 * `as const` N'EST PAS COSMETIQUE : la Confirmation refuse un libelle
 * generique par son TYPE, ce qui ne mord que sur un litteral. Sans `as const`,
 * `libelleAction` s'elargirait en `string` et le controle passerait sans rien
 * verifier. Mesure faite : la valeur remplacee par "Oui" arrete `tsc` sur les
 * deux appelants, et cesse de l'arreter des que `as const` est retire.
 */
export const CONFIRMATION_REINITIALISATION = {
  /** Le titre nomme l'intention du narrateur, le libelle d'action nomme
   * l'effet : l'ecart est voulu, et c'est le libelle d'action qui engage. */
  titre: "Réinitialiser l'historique",
  consequence:
    "Le téléphone oublie toutes les questions déjà posées. Elles peuvent de nouveau sortir, et ce qu'il a retenu des soirées précédentes ne revient pas.",
  libelleAction: "Effacer l'historique",
} as const;
