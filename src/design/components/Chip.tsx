import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Chip.module.css";

/*
 * Diez : le Chip.
 *
 * EN SOMMEIL. Son seul usage prevu est la selection des paquets sur l'accueil
 * (design-system.md section 4, ACCUEIL), or le corpus n'en porte qu'un : un
 * selecteur a une option est un controle qui ne peut rien faire, et il ne
 * sera cable a aucun ecran tant que `maison` ne sera pas jouable a cote de
 * `general`. Le composant existe quand meme, pour deux raisons : il appartient
 * a l'inventaire du socle que la planche de controle doit rendre dans les deux
 * modes (roadmap.md, phase 3), et l'ecrire maintenant coute moins que de le
 * rajouter le jour ou un ecran l'attend.
 *
 * Un `button` natif, jamais un `div` cliquable, et surtout pas un `input`
 * masque : le clavier, la touche Entree et l'annonce du role viennent avec.
 *
 * Le chip est un interrupteur a deux positions, donc `aria-pressed` et non
 * `aria-checked` : le second appartient au groupe radio du Segment, ou les
 * options s'excluent. Ici, cocher un paquet n'en decoche aucun autre.
 *
 * Un seul axe de variante, `data-actif`, celui de docs/tokens-et-composants.md.
 * `aria-pressed` porte la meme information : l'etat n'est donc pas rendu par
 * la seule couleur, un lecteur d'ecran l'annonce.
 */

export type ProprietesChip = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "type" | "aria-pressed"
> & {
  actif: boolean;
  children: ReactNode;
};

export function Chip(proprietes: ProprietesChip) {
  const { actif, className, children, ...reste } = proprietes;

  return (
    <button
      {...reste}
      /* Meme raison que sur le Bouton : le type par defaut d'un `button` est
         `submit`, et l'oubli ne se manifesterait que le jour ou un formulaire
         apparaitrait, par un rechargement de page en pleine soiree. */
      type="button"
      data-actif={actif}
      aria-pressed={actif}
      className={className ? `${styles.chip} ${className}` : styles.chip}
    >
      {children}
    </button>
  );
}
