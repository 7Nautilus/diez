import { useState } from "react";
import { Bouton } from "../design/components/Bouton";
import { Confirmation } from "../design/components/Confirmation";
import { EtatVide } from "../design/components/EtatVide";
import { CONFIRMATION_REINITIALISATION } from "../screens/types";
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
 *
 * LA DISTANCE N'EST PLUS LE SEUL GARDE-FOU, et elle reste. C'est ici que le
 * risque etait le plus grand de toute l'application : un seul tap effacait la
 * memoire des soirees precedentes, la ou l'accueil en demandait deja deux pour
 * traverser son menu. Le bouton ouvre desormais la meme Confirmation que
 * l'accueil, avec les memes mots. La distance, elle, protege toujours du geste
 * qui n'a jamais eu l'intention d'ouvrir quoi que ce soit.
 */

export type ProprietesEpuisement = {
  onReinitialiser: () => void;
};

export function Epuisement({ onReinitialiser }: ProprietesEpuisement) {
  /*
   * Le seul etat local de l'ecran, et il n'appartient a personne d'autre :
   * l'ouverture d'une demande de confirmation n'est ni du jeu, ni un reglage
   * persiste. C'est le meme arrangement que sur l'accueil, sans le menu qui
   * n'existe que la-bas.
   */
  const [confirmationOuverte, setConfirmationOuverte] = useState(false);

  return (
    <main className={styles.ecran}>
      <EtatVide
        titre="Plus de questions"
        phrase="Toutes les questions des paquets sélectionnés ont déjà été posées."
      />
      <Bouton variante="secondaire" onClick={() => setConfirmationOuverte(true)}>
        Réinitialiser l'historique
      </Bouton>

      {/*
       * LE FOCUS NE REVIENT PAS AU DECLENCHEUR ICI, ET C'EST INEVITABLE. La
       * Feuille le rend au bouton qui l'a ouverte, mais l'effacement fait
       * repartir la partie : `epuise` retombe, l'accueil prend la place de cet
       * ecran, et le bouton n'existe plus au moment ou le focus lui serait
       * rendu. C'est ce qui separe ce cas de l'accueil, ou le menu reste
       * volontairement ouvert derriere pour garder son declencheur monte. Le
       * changement d'ecran est annonce par la zone de phase (App.tsx), qui est
       * la reponse du systeme a un ecran qui disparait.
       *
       * Rien n'est annule au clavier pour autant : la sortie non destructrice
       * est la premiere action du panneau, et Echap ferme.
       */}
      <Confirmation
        {...CONFIRMATION_REINITIALISATION}
        ouverte={confirmationOuverte}
        surAction={onReinitialiser}
        surFermeture={() => setConfirmationOuverte(false)}
      />
    </main>
  );
}
