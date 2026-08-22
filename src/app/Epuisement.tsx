import { Bouton } from "../design/components/Bouton";
import { EtatVide } from "../design/components/EtatVide";
import styles from "./Epuisement.module.css";

/*
 * Diez : l'impasse, quand la pioche ne rend plus rien.
 *
 * C'est l'etape 5 de l'algorithme de pioche : vivier vide, ecran explicite
 * proposant de reinitialiser, JAMAIS de plantage silencieux (architecture.md
 * section 6). On y arrive de deux facons, PIOCHER depuis l'accueil et CARTE
 * SUIVANTE depuis la reponse, la seconde etant la plus probable puisque c'est
 * la derniere carte de la soiree qui vide le stock.
 *
 * IL VIT DANS app/ ET NON DANS screens/, ce qui est une dette assumee et non
 * une decision : les cinq ecrans du parcours ont ete ecrits en parallele et
 * celui-ci n'etait le perimetre d'aucun d'eux. Sa place naturelle est
 * screens/, il n'a besoin de rien d'autre que d'un rappel, et le deplacer ne
 * coutera que le fichier.
 */

/*
 * L'ACTION EST AU CENTRE, PAS DANS LA PILE BASSE, et c'est la seule chose de
 * cet ecran qu'il ne faut pas "ranger".
 *
 * Les deux emplacements du bas sont occupes sur l'ecran REPONSE, d'ou l'on
 * arrive : CARTE SUIVANTE au-dessus, SIGNALER au dernier rang
 * (design-system.md, La regle des deux emplacements). Une frappe restee sur
 * place tombe donc sur l'un des deux. Or l'action d'ici est destructrice et
 * irreversible, et le verrou d'entree ne la couvre pas : la phase est REPOS,
 * qui ne porte pas de `depuis` et n'est jamais verrouillee (domain/tour.ts).
 * La distance est le seul garde-fou qui reste.
 */

export type ProprietesEpuisement = {
  onReinitialiser: () => void;
};

export function Epuisement({ onReinitialiser }: ProprietesEpuisement) {
  return (
    <main className={styles.ecran}>
      <EtatVide
        titre="Plus de questions"
        phrase="Toutes les questions des paquets sélectionnés ont déjà été posées."
      />
      <Bouton variante="secondaire" onClick={onReinitialiser}>
        Réinitialiser l'historique
      </Bouton>
    </main>
  );
}
