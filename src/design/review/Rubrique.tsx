import type { ReactNode } from "react";
import { Etiquette } from "../components/Etiquette";
import styles from "./Rubrique.module.css";

/*
 * Diez : une rubrique de la planche de controle.
 *
 * La planche est un INSTRUMENT et non un ecran du jeu. Elle se compose malgre
 * tout avec les primitives du systeme plutot qu'avec des styles ad hoc : une
 * planche ecrite en dehors du systeme mesurerait autre chose que le systeme,
 * et le premier ecart entre les deux passerait inapercu.
 *
 * Le titre est un `h3` parce que la planche porte son `h1` et chaque panneau
 * de mode son `h2`. Le niveau vient donc de la structure du document, jamais
 * d'un choix de taille (docs/design-system.md section 9).
 */

export type ProprietesRubrique = {
  titre: string;
  /** Ce qu'il faut regarder, ou le geste a faire quand un etat ne se fige pas. */
  note?: string;
  children: ReactNode;
};

export function Rubrique({ titre, note, children }: ProprietesRubrique) {
  return (
    <section className={styles.rubrique}>
      <h3 className={styles.titre}>
        <Etiquette fonction="metadonnee">{titre}</Etiquette>
      </h3>
      {note === undefined ? null : (
        <p className={styles.note}>
          <Etiquette fonction="instruction">{note}</Etiquette>
        </p>
      )}
      <div className={styles.corps}>{children}</div>
    </section>
  );
}
