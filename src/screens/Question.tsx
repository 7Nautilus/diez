import { Bouton } from "../design/components/Bouton";
import { Etiquette } from "../design/components/Etiquette";
import type { EnonceQuestion, ResumeCarte } from "../domain/types";
import styles from "./Question.module.css";

/*
 * Diez : l'ecran QUESTION.
 *
 * LA REPONSE N'EST NULLE PART, et c'est tout le sujet de cet ecran. Elle
 * n'est pas dans les proprietes, parce que la phase QUESTION ne la porte pas
 * (architecture.md section 5) ; elle ne peut pas y entrer par une propriete
 * ajoutee plus tard, parce que `EnonceQuestion` declare `r` et `note` a
 * `never` et refuse donc structurellement une `Question` complete ; elle
 * n'est par consequent dans aucun noeud ni aucun attribut du document rendu,
 * faute d'exister a ce niveau. Le narrateur lit a voix haute EN FIXANT son
 * ecran : une reponse presente dans le document serait a un noeud de
 * l'endroit qu'il est en train de prononcer.
 *
 * CET ECRAN N'EST PAS LU, IL EST DIT. Le narrateur le prononce a toute la
 * table en relevant les yeux, et doit retrouver sa ligne a chaque regard. Les
 * deux regles de prompteur qui en decoulent, l'interlignage et la mesure,
 * sont des tokens et sont citees par leur nom dans le module CSS.
 *
 * LE VERROU NE S'ANNONCE PLUS. Le label `VERROUILLE` a ete retire
 * (design-system.md section 4, QUESTION) : le geste de retour du telephone
 * reste absorbe, desormais en silence. Ce cablage appartient a app/, qui tient
 * l'History API ; rien ici ne l'explique, ne le signale ni ne l'anime.
 *
 * L'ecran est une fonction de ses proprietes : aucune horloge, aucun hasard,
 * aucun stockage, et AUCUN GARDE DE DELAI LOCAL. Le verrou d'entree est celui
 * du reducteur (`VERROU_MS`, architecture.md section 10) et il couvre deja ce
 * bouton. Le doubler ici, en desactivant la commande pendant la fenetre,
 * creerait une seconde source de verite pour la meme regle et rendrait
 * visible un dispositif dont l'invisibilite est precisement la qualite.
 */

export type ProprietesQuestion = {
  /*
   * Recue, jamais rendue, et ce n'est pas un oubli. La couche tertiaire de
   * QUESTION ne porte que `NIVEAU 07` (design-system.md section 4) : le
   * rappel du theme existe sur l'ecran NIVEAU et s'arrete la. Une seconde
   * ligne de texte a cote de l'enonce couterait exactement ce que la
   * composition de prompteur achete, retrouver sa ligne d'un coup d'oeil. La
   * propriete reste au contrat parce que la phase la porte.
   */
  carte: ResumeCarte;
  enonce: EnonceQuestion;
  onReveler: () => void;
};

export function Question({ enonce, onReveler }: ProprietesQuestion) {
  /*
   * `NIVEAU 07` et non `NIVEAU 7`. La metadonnee est en Space Mono, la voix
   * "panneau d'instruments" du systeme, et la largeur constante evite que le
   * seul libelle de la zone haute change de longueur d'un tour a l'autre
   * (design-system.md section 4, QUESTION).
   */
  const niveauAffiche = String(enonce.niveau).padStart(2, "0");

  return (
    <section className={styles.ecran}>
      <Etiquette fonction="metadonnee">Niveau {niveauAffiche}</Etiquette>

      {/*
       * Le `h1` de l'ecran porte le contenu primaire, ici l'enonce
       * (design-system.md section 9, Structure semantique).
       *
       * Ni landmark `main` ni conteneur `aria-live="polite"` ici, et c'est
       * delibere : une region live montee EN MEME TEMPS que son contenu n'est
       * pas annoncee de facon fiable, donc posee sur la racine d'un ecran
       * elle donnerait l'illusion de la couverture sans la couverture. Elle
       * doit vivre au niveau qui persiste d'une phase a l'autre, c'est-a-dire
       * dans app/. Meme raisonnement que le refus de `role="status"` dans le
       * composant Statut.
       */}
      <h1 className={styles.enonce}>{enonce.q}</h1>

      <Bouton variante="secondaire" className={styles.action} onClick={onReveler}>
        Révéler la réponse
      </Bouton>
    </section>
  );
}
