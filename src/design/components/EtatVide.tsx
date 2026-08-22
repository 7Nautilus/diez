/*
 * EtatVide : ce qui s'affiche quand il n'y a plus rien a montrer, la pioche
 * epuisee au premier chef.
 *
 * Un titre, une phrase, aucune variante (docs/tokens-et-composants.md, section
 * EtatVide). Et aucun dessin : l'illustration ou la mascotte sur l'ecran de
 * pioche epuisee figure nommement parmi les anti-patterns a surveiller
 * (docs/design-system.md section 8). Une phrase, pas deux : c'est une impasse
 * qu'on annonce, pas un texte a lire.
 */
import styles from "./EtatVide.module.css";

type ProprietesEtatVide = {
  titre: string;
  phrase: string;
};

export function EtatVide({ titre, phrase }: ProprietesEtatVide) {
  return (
    <div className={styles.bloc}>
      {/* Un titre et non un paragraphe : c'est ce qui donne a l'ecran une
          structure navigable, et l'ecran garde son `h1` pour son contenu
          primaire (docs/design-system.md section 9). */}
      <h2 className={styles.titre}>{titre}</h2>
      <p className={styles.phrase}>{phrase}</p>
    </div>
  );
}
