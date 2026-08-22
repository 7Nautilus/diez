import { Bouton } from "../design/components/Bouton";
import { Etiquette } from "../design/components/Etiquette";
import { Statut } from "../design/components/Statut";
import type { EnonceQuestion, Reponse as ReponseQuestion, ResumeCarte } from "../domain/types";
import styles from "./Reponse.module.css";

/*
 * Diez : l'ecran REPONSE, le dernier du cycle.
 *
 * Trois couches et UNE SEULE rupture : la reponse en taille display est cette
 * rupture (design-system.md section 4, REPONSE). Rien d'autre sur cet ecran
 * n'a donc le droit de chercher a se faire remarquer, ni couleur, ni cadre, ni
 * graisse forte. YAMOUSSOUKRO en --txt-display-lg n'a besoin d'aucun decor.
 *
 * Un ecran est une fonction de ses proprietes : il ne lit aucune horloge, ne
 * tire aucun hasard, n'ecrit dans aucun stockage et ne remonte ni vers app/ ni
 * vers storage/. Tout cela vit dans app/ et redescend ici en propriete
 * (architecture.md section 3).
 *
 * Le type `Reponse` du domaine est importe sous le nom `ReponseQuestion` :
 * dans ce module, `Reponse` est le nom du composant. L'alias suit celui
 * d'`EnonceQuestion`, avec lequel il forme une paire (l'enonce d'une question,
 * la reponse d'une question), plutot que d'inventer un troisieme mot.
 */

/*
 * LE VERROU N'EST PAS ICI, ET C'EST UNE CONTRAINTE POUR LA COMPOSITION.
 *
 * SIGNALER occupe le dernier rang, donc exactement la position qu'occupait
 * REVELER sur l'ecran precedent. Un double tap signalait la question par
 * accident, et ce bouton n'etant pas une transition, il echappait au verrou
 * (design-system.md, Le controle se fait sur la chaine). Le correctif est que
 * TOUTE action utilisateur passe par le meme controle de delai, `onSignaler`
 * compris.
 *
 * Cet ecran ne peut pas l'appliquer lui-meme : le controle compare `maintenant`
 * a `depuis`, et un ecran ne lit aucune horloge. C'est donc app/ qui doit
 * soumettre `onSignaler` au meme controle que les transitions. Ce qui reste a
 * la charge de cet ecran est de ne pas l'affaiblir, et il le fait de deux
 * facons : le bouton n'est pas etire sur la largeur du rang, et il disparait
 * une fois la question signalee.
 */

/*
 * Taille par palier. Correctif d'audit : --txt-display-lg sur une reponse de
 * soixante caracteres donne cinq lignes de typographie display sur un ecran de
 * 320px, ce n'est plus de la donnee mise en valeur, c'est un mur
 * (design-system.md section 4, REPONSE, Taille par palier).
 *
 * Les deux bornes sont des longueurs mesurees et non des preferences : elles
 * sont nommees ici, et la taille qu'elles designent vit dans le module CSS, ou
 * vivent les valeurs.
 */
const PALIER_COURT = 12;
const PALIER_MOYEN = 30;

type Palier = "court" | "moyen" | "long";

function palierDe(texte: string): Palier {
  if (texte.length <= PALIER_COURT) return "court";
  if (texte.length <= PALIER_MOYEN) return "moyen";
  return "long";
}

/*
 * Une reponse numerique se compose en Space Mono, une reponse textuelle en
 * Space Grotesk : 206 et 1997 sont de la donnee, Yamoussoukro est du texte, et
 * le systeme traite les chiffres comme un objet visuel a part entiere
 * (design-system.md section 3).
 *
 * Le depart se fait sur l'ABSENCE DE LETTRE, et non sur une conversion en
 * nombre : "12 %" et "10/1" sont de la donnee et ne se convertissent pas,
 * tandis que "206 os" se convertirait a moitie sans en etre.
 */
const CHIFFRE = /\d/;
const LETTRE = /\p{L}/u;

type FormeReponse = "numerique" | "texte";

function formeDe(texte: string): FormeReponse {
  return CHIFFRE.test(texte) && !LETTRE.test(texte) ? "numerique" : "texte";
}

export type ProprietesReponse = {
  /*
   * Recu parce que la phase REPONSE le porte (architecture.md section 5), et
   * volontairement NON RENDU : la couche tertiaire de cet ecran est NIVEAU 07
   * et les actions, le theme n'y figure pas (design-system.md section 4,
   * REPONSE). C'est app/ qui a besoin de `carte.id` pour ranger un
   * signalement, pas cet ecran.
   */
  carte: ResumeCarte;
  enonce: EnonceQuestion;
  reponse: ReponseQuestion;
  /*
   * AJOUT AU CONTRAT FIXE, a arbitrer par la composition.
   *
   * Sans lui, le narrateur tape SIGNALER, rien ne bouge a l'ecran, et il
   * retape : c'est exactement le geste que le verrou existe pour empecher. Le
   * systeme a un composant pour ce retour, `Statut`, et il interdit le toast
   * (design-system.md section 8). L'ecran ne peut pas tenir l'information
   * lui-meme : un signalement est ecrit dans storage/, donc il descend d'app/
   * comme tout le reste.
   */
  signalee: boolean;
  onSuivante: () => void;
  onTerminer: () => void;
  onSignaler: () => void;
};

export function Reponse(proprietes: ProprietesReponse) {
  const { enonce, reponse, signalee, onSuivante, onTerminer, onSignaler } = proprietes;

  /*
   * Deux chiffres, comme le NIVEAU 07 du document : le libelle garde la meme
   * largeur du niveau 1 au niveau 10, qui se suivent dans une meme soiree.
   */
  const niveau = String(enonce.niveau).padStart(2, "0");

  return (
    <section className={styles.ecran}>
      <header className={styles.entete}>
        <Etiquette fonction="metadonnee">Niveau {niveau}</Etiquette>
        {/*
          TERMINER est en haut, pas dans la pile basse. Les deux emplacements
          du bas sont pris par CARTE SUIVANTE et SIGNALER, et un troisieme
          bouton dans cette zone remettrait une action a portee de la frappe
          restee sur place (design-system.md, La regle des deux emplacements).
          En haut, aucun controle de l'ecran QUESTION ne le precede a cette
          position, donc aucune frappe ne peut y enchainer.
        */}
        <Bouton variante="ghost" className={styles.terminer} onClick={onTerminer}>
          Terminer
        </Bouton>
      </header>

      <div className={styles.corps}>
        {/*
          Le h1 porte le contenu primaire de l'ecran, ici la reponse
          (design-system.md section 9, Structure semantique). Les deux axes
          sont des attributs de donnee et non des styles en ligne : les tailles
          et les familles restent dans le module CSS, ou elles sont definies.
        */}
        <h1
          className={styles.reponse}
          data-palier={palierDe(reponse.r)}
          data-forme={formeDe(reponse.r)}
        >
          {reponse.r}
        </h1>
        <div className={styles.secondaire}>
          <p className={styles.rappel}>{enonce.q}</p>
          {reponse.note ? <p className={styles.note}>{reponse.note}</p> : null}
        </div>
      </div>

      <div className={styles.pile}>
        <Bouton variante="primaire" onClick={onSuivante}>
          Carte suivante
        </Bouton>
        <div className={styles.rangSignalement} data-signalee={signalee}>
          {/*
            Le bouton reste monte une fois la question signalee, le module le
            rend invisible : c'est lui qui donne sa hauteur au rang, et un rang
            qui retrecirait ferait descendre CARTE SUIVANTE sous le pouce.
            `disabled` double la protection du cote du DOM, la ou le module la
            tient du cote de la mise en page.
          */}
          <Bouton
            variante="ghost"
            className={styles.signaler}
            disabled={signalee}
            onClick={onSignaler}
          >
            Signaler
          </Bouton>
          {signalee ? <Statut ton="signal">Signalée</Statut> : null}
        </div>
      </div>
    </section>
  );
}
