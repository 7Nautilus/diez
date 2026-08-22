import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Bouton.module.css";

/*
 * Diez : le Bouton.
 *
 * Un element `button` natif, jamais un `div` cliquable : le clavier, la
 * touche Entree, l'annonce du role et l'attribut `disabled` viennent avec, et
 * aucun des quatre ne se reimplemente correctement a la main.
 *
 * Un seul axe de variante, celui de docs/tokens-et-composants.md. Les etats
 * n'en sont pas : ils vivent en pseudo-classes dans le module CSS, donc ce
 * composant n'expose ni propriete `etat` ni propriete `survole`. `disabled`
 * est deja un attribut du bouton natif, on ne le double pas.
 */

export type VarianteBouton = "primaire" | "secondaire" | "ghost";

/*
 * Le nom accessible est exige par le typage, pas par la relecture : un bouton
 * sans texte visible (une croix, un chevron) est muet pour un lecteur
 * d'ecran, et c'est precisement le cas qu'on oublie, parce qu'a l'oeil il ne
 * manque rien. Ecrites en union, les deux formes rendent l'oubli
 * incompilable, ce qui est le principe de conventions-code.md : ce qu'une
 * machine peut verifier, une machine le verifie.
 */
type Nommage =
  | { children: ReactNode; "aria-label"?: string }
  | { children?: undefined; "aria-label": string };

export type ProprietesBouton = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> &
  Nommage & {
    variante: VarianteBouton;
  };

export function Bouton(proprietes: ProprietesBouton) {
  /*
   * Le type par defaut d'un `button` est `submit`. Aucun formulaire n'existe
   * dans Diez aujourd'hui, mais le jour ou il en apparaitra un, l'oubli se
   * manifesterait par un rechargement de page en pleine soiree.
   */
  const { variante, className, type = "button", children, ...reste } = proprietes;

  return (
    <button
      {...reste}
      type={type}
      data-variante={variante}
      className={className ? `${styles.bouton} ${className}` : styles.bouton}
    >
      {children}
    </button>
  );
}
