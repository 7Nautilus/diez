import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Statut.module.css";

/*
 * Diez : le Statut.
 *
 * `[ SIGNALEE ]` en ligne, a l'endroit ou l'action vient d'avoir lieu. JAMAIS
 * un toast : une bulle flottante qui s'efface toute seule est le contraire du
 * systeme, elle recouvre l'ecran, elle part avant qu'on l'ait lue, et elle
 * n'existe plus quand on la cherche (design-system.md section 8).
 *
 * La forme est celle du systeme Nothing : des crochets en Space Mono
 * capitales, la ponctuation faisant le cadre a la place d'un fond ou d'une
 * bordure.
 *
 * Les crochets sont deux `span` explicites, et non un `content` de
 * pseudo-element : ils doivent pouvoir prendre le rouge du ton `signal` sans
 * que le texte le prenne, et surtout etre retires de l'arbre d'accessibilite.
 * Un lecteur d'ecran doit annoncer "signalee", pas "crochet ouvrant signalee
 * crochet fermant".
 *
 * AUCUN `role="status"` ici, et c'est delibere. La zone de phase porte deja un
 * `aria-live="polite"` (design-system.md section 9, Annonce des changements de
 * phase) : une region live imbriquee ferait annoncer le statut deux fois. Et
 * une region live montee en meme temps que son contenu n'est de toute facon
 * pas annoncee de facon fiable, donc elle donnerait l'illusion de la
 * couverture sans la couverture. Un appelant qui aurait besoin de l'un ou de
 * l'autre le pose lui-meme : les attributs natifs passent au travers.
 */

export type TonStatut = "neutre" | "signal";

export type ProprietesStatut = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  ton?: TonStatut;
  children: ReactNode;
};

export function Statut(proprietes: ProprietesStatut) {
  const { ton = "neutre", className, children, ...reste } = proprietes;

  return (
    <span
      {...reste}
      data-ton={ton}
      className={className ? `${styles.statut} ${className}` : styles.statut}
    >
      <span aria-hidden="true" className={styles.crochet}>
        [
      </span>
      {children}
      <span aria-hidden="true" className={styles.crochet}>
        ]
      </span>
    </span>
  );
}
