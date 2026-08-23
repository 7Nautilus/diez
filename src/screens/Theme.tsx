import { Bouton } from "../design/components/Bouton";
import { Etiquette } from "../design/components/Etiquette";
import type { ResumeCarte } from "../domain/types";
import styles from "./Theme.module.css";
import { LIBELLE_PAQUET } from "./types";

/*
 * Diez : la phase THEME.
 *
 * Trois couches et une seule rupture (design-system.md section 4, THEME) :
 * l'intitule seul en primaire, RIEN en secondaire, le paquet en haut et le
 * numero de carte en bas en tertiaire. La rupture est le VIDE, et c'est la
 * seule chose de cet ecran qu'il ne faut pas combler : le narrateur lit a
 * voix haute en relevant la tete vers la table, et perd sa ligne a chaque
 * regard. Une typographie large isolee dans le vide se retrouve
 * instantanement, c'est la logique du prompteur.
 *
 * L'ecran est une fonction de ses proprietes : aucune horloge, aucun hasard,
 * aucun stockage, et AUCUN garde anti-double-tap. Le verrou d'entree vit dans
 * le reducteur, ou il couvre d'un seul geste toutes les actions de toutes les
 * phases (architecture.md section 10). Un second garde pose ici serait une
 * deuxieme source de verite pour VERROU_MS, donc une divergence en attente.
 *
 * AUCUN `aria-live` ici non plus. L'annonce de changement de phase est portee
 * une fois pour toutes par la zone de phase, dans app/ (design-system.md
 * section 9) : une region live imbriquee dans une autre fait annoncer son
 * contenu deux fois, ce que le Statut documente deja de son cote.
 */

/*
 * Paliers de taille de l'intitule, design-system.md section 4, THEME. Ce ne
 * sont pas des preferences de mise en page : au-dela de ces longueurs, la
 * taille display deborde ou consomme le vide, qui est precisement la rupture
 * de cet ecran. Le troisieme palier est un AVERTISSEMENT et non une cible,
 * un intitule qui y tombe doit etre raccourci plutot que la page pliee ; le
 * lot pilote plafonne a 26 caracteres, donc le cas reste rare.
 */
const PALIER_LARGE_MAX = 20;
const PALIER_MOYEN_MAX = 32;

type PalierIntitule = "large" | "moyen" | "reduit";

function palierDeLIntitule(intitule: string): PalierIntitule {
  if (intitule.length <= PALIER_LARGE_MAX) return "large";
  if (intitule.length <= PALIER_MOYEN_MAX) return "moyen";
  return "reduit";
}

/*
 * La table des libelles de paquet etait ecrite ici. Elle est passee dans
 * ./types.ts a la composition : l'accueil affiche les memes mots sur ses
 * pilules, et deux tables pour un seul jeu de paquets divergent sans que rien
 * ne le signale.
 */

/*
 * Le rang ARRIVE EN PROPRIETE, il ne se derive plus de l'identifiant.
 *
 * La derivation precedente etait correcte et affichait pourtant `CARTE 001`
 * sur toutes les cartes, constate en jouant : les identifiants du corpus sont
 * des slugs suffixes d'un rang PAR SUJET (`capitales-monde-001`,
 * `corps-humain-001`) et non d'un rang global. Le nombre lu en fin
 * d'identifiant ne numerote donc rien, et aucune lecture plus fine de la
 * chaine ne le rendra vrai : ce numero n'est pas dans l'identifiant.
 *
 * Le rang n'entre pas non plus dans `ResumeCarte`, qui porte ce que la phase
 * THEME a le droit de montrer du MODELE. Le rang ne change aucune regle, le
 * domaine n'en a pas l'usage, et seule la couche de composition peut l'etablir
 * puisqu'elle seule possede le corpus entier (architecture.md section 4).
 * C'est une metadonnee de presentation, elle voyage donc comme une propriete
 * d'ecran, a cote de la carte et non dedans.
 *
 * Un compteur local serait la reponse facile et la mauvaise : il repartirait
 * de 1 a chaque partie, et deux numerotations d'une meme carte divergent des
 * que l'une des deux bouge.
 */

/** Trois chiffres, la forme `CARTE 042` de design-system.md section 4. */
const LARGEUR_NUMERO = 3;

export type ProprietesTheme = {
  carte: ResumeCarte;
  /**
   * Le rang de la carte dans le corpus, ce que `CARTE 042` affiche.
   *
   * Entier a partir de 1, etabli par app/ : la propriete est REQUISE, donc une
   * composition qui oublierait de le calculer ne compile pas, au lieu de
   * rendre `CARTE NaN` un soir de partie.
   *
   * Au-dela de 999, le libelle s'allonge d'un chiffre plutot que de se
   * tronquer : `LARGEUR_NUMERO` est un remplissage minimal, pas un gabarit. Un
   * numero tronque designerait une autre carte, ce qui est pire qu'un libelle
   * plus long.
   */
  rang: number;
  onAnnoncer: () => void;
};

export function Theme({ carte, rang, onAnnoncer }: ProprietesTheme) {
  const numero = String(rang).padStart(LARGEUR_NUMERO, "0");

  return (
    <section className={styles.ecran}>
      <Etiquette fonction="metadonnee">Paquet {LIBELLE_PAQUET[carte.paquet]}</Etiquette>

      {/* Le `h1` porte le contenu primaire de la phase, ici l'intitule
          (design-system.md section 9, Structure semantique). */}
      <h1 className={styles.intitule} data-palier={palierDeLIntitule(carte.theme)}>
        {carte.theme}
      </h1>

      <div className={styles.pileBasse}>
        <Etiquette fonction="metadonnee">Carte {numero}</Etiquette>

        {/*
         * Le libelle porte le geste du modele, ou TOUT LE MONDE annonce son
         * chiffre : `ANNONCER` seul ne disait ni quoi ni qui (design-system.md
         * section 4, correctif d'audit). Les capitales viennent du Bouton.
         */}
        <Bouton className={styles.action} variante="primaire" onClick={onAnnoncer}>
          Annoncer les chiffres
        </Bouton>
      </div>
    </section>
  );
}
