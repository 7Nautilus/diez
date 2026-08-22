import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Etiquette.module.css";

/*
 * Diez : l'Etiquette.
 *
 * Un `span` : une etiquette qualifie ce qui l'entoure, elle ne structure
 * rien. Le titre d'un ecran est un `h1` porte par l'ecran lui-meme
 * (design-system.md section 9, Structure semantique), pas par ce composant.
 * Les attributs natifs passent au travers, ce qui permet a un appelant de
 * poser un `id` pour un `aria-labelledby`, ou un `aria-live` sur un etat qui
 * change sans rechargement.
 *
 * Un seul axe, `data-fonction`. Ses trois valeurs sont celles de
 * docs/tokens-et-composants.md ; la casse normale d'`instruction` est une
 * regle et non un oubli, la raison est ecrite dans le module CSS, la ou
 * quelqu'un aura envie de "corriger" l'absence de capitales.
 */

export type FonctionEtiquette = "metadonnee" | "etat" | "instruction";

export type ProprietesEtiquette = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  fonction: FonctionEtiquette;
  children: ReactNode;
};

export function Etiquette(proprietes: ProprietesEtiquette) {
  const { fonction, className, children, ...reste } = proprietes;

  return (
    <span
      {...reste}
      data-fonction={fonction}
      className={className ? `${styles.etiquette} ${className}` : styles.etiquette}
    >
      {children}
    </span>
  );
}
