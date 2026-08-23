import { Bouton } from "./Bouton";
import styles from "./Confirmation.module.css";
import { Feuille } from "./Feuille";

/*
 * Diez : la Confirmation.
 *
 * L'inventaire des composants la prevoit pour UN SEUL usage, reinitialiser
 * l'historique (design-system.md section 6). C'est la seule action
 * destructrice et irreversible de l'application : elle efface la memoire des
 * soirees precedentes, et rien ne la rend. Tant que ce composant n'existait
 * pas, la garde tenait aux deux taps du menu ; sur l'ecran d'epuisement, un
 * seul tap suffisait.
 *
 * ELLE EST BATIE SUR LA FEUILLE, et n'est pas un second panneau. Le
 * confinement du focus y est un COMPORTEMENT et non un attribut : `inert` sur
 * l'arriere-plan, focus deplace a l'ouverture et RENDU au declencheur a la
 * fermeture, Echap qui ferme. Un `aria-modal` pose sans ces quatre pieces a
 * deja ete releve par l'audit d'accessibilite de ce projet. Elles existent une
 * seule fois, dans la Feuille ; les reecrire ici produirait deux confinements
 * dont un seul serait maintenu.
 *
 * La Feuille se porte elle-meme par un portail en fin de `<body>`, si bien
 * qu'une Confirmation ouverte depuis le menu, lui-meme une Feuille, endort le
 * menu comme le reste : les deux panneaux sont des voisins et non des
 * imbriques, et le focus repart vers le bouton du menu a la fermeture.
 */

/*
 * LES LIBELLES QUE LE TYPE REFUSE.
 *
 * Un OUI generique oblige a relire la question pour savoir a quoi l'on
 * consent, et personne ne relit une question dans une piece bruyante a onze
 * heures du soir. Le libelle d'action doit donc enoncer la consequence :
 * "Effacer l'historique", jamais "Oui" ni "Confirmer".
 *
 * La regle est portee par le TYPE et non par la relecture, ce qui est le
 * principe de conventions-code.md : ce qu'une machine peut verifier, une
 * machine le verifie. Le Bouton fait deja de meme avec son nom accessible.
 *
 * Le controle ne mord que sur un litteral, cas qui est precisement celui que
 * l'on veut attraper : un libelle ecrit dans le JSX. Une chaine calculee
 * s'infere `string`, qu'aucune de ces valeurs ne recouvre, et passe.
 */
type LibelleGenerique =
  | "Oui"
  | "OUI"
  | "Non"
  | "OK"
  | "Confirmer"
  | "Valider"
  | "Continuer"
  | "Effacer"
  | "Supprimer";

type RefuseGenerique<Libelle extends string> = Libelle extends LibelleGenerique ? never : Libelle;

export type ProprietesConfirmation = {
  /** Rendu en tete du panneau, et sert de nom accessible a la Feuille. */
  titre: string;
  ouverte: boolean;
  /** Ce que l'action detruit, en une phrase, au present et sans detour. */
  consequence: string;
  surAction: () => void;
  surFermeture: () => void;
};

export function Confirmation<Libelle extends string>(
  proprietes: ProprietesConfirmation & { libelleAction: RefuseGenerique<Libelle> },
) {
  const { titre, ouverte, consequence, surAction, surFermeture } = proprietes;
  const libelleAction: string = proprietes.libelleAction;

  return (
    <Feuille titre={titre} ouverte={ouverte} surFermeture={surFermeture}>
      <p className={styles.consequence}>{consequence}</p>
      <div className={styles.actions}>
        {/*
         * LA SORTIE NON DESTRUCTRICE EST LA PREMIERE, dans l'ordre du DOM donc
         * dans l'ordre de lecture, de tabulation et d'annonce. L'action
         * irreversible est la derniere chose atteinte, jamais la premiere.
         *
         * Elle est aussi la variante `primaire`, seule inversion de rang que
         * ce composant se permette : le chemin recommande devant une action
         * qui ne se rattrape pas est celui qui ne detruit rien. Le rouge
         * n'entre pas dans cette decision, il est reserve au signalement et
         * aux erreurs (design-system.md section 5).
         *
         * Son libelle est fixe et n'est pas une propriete, comme le "Fermer"
         * de la Feuille : une sortie qui change de nom d'un appelant a l'autre
         * se relit a chaque fois. Le projet n'a pas d'internationalisation, la
         * chaine vit donc ici.
         *
         * Elle fait doublon avec le "Fermer" de l'entete, et c'est voulu :
         * plusieurs sorties sures pour une seule action destructrice est la
         * bonne dissymetrie. Qui vient de lire une question cherche sa reponse
         * parmi les actions, pas dans le chrome du panneau.
         */}
        <Bouton variante="primaire" onClick={surFermeture}>
          Annuler
        </Bouton>
        <Bouton
          variante="secondaire"
          onClick={() => {
            /*
             * La Confirmation se referme elle-meme. Un panneau reste ouvert
             * derriere une action deja commise laisse le bouton destructeur
             * sous le doigt, et l'appelant qui oublierait de fermer ne s'en
             * apercevrait qu'a la deuxieme reinitialisation.
             */
            surAction();
            surFermeture();
          }}
        >
          {libelleAction}
        </Bouton>
      </div>
    </Feuille>
  );
}
