import type { HTMLAttributes } from "react";
import { useId } from "react";
import styles from "./Segment.module.css";

/*
 * Diez : le Segment, controle segmente a options exclusives.
 *
 * Son usage prevu est le selecteur de mode AUTO / SOMBRE / CLAIR, en tertiaire
 * de l'accueil (design-system.md sections 2 et 6). Ce selecteur n'est PAS un
 * composant de plus : docs/tokens-et-composants.md, qui fait foi des composants
 * et de leurs axes, ne connait que `Segment`, et l'inventaire de
 * design-system.md section 6 renvoie `SelecteurMode` a la meme section 8 de la
 * skill, celle du controle segmente. C'est donc un Segment a trois options.
 * Une deuxieme raison rend la chose non negociable : ce selecteur lit et ecrit
 * un reglage persiste, or `design/` ne remonte jamais vers `storage/`. Le
 * cablage appartient a l'ecran, la forme appartient ici.
 *
 * UN VRAI GROUPE RADIO, pas une rangee de div cliquables ni de boutons a qui
 * on aurait pose un `role`. Les options s'excluent : c'est exactement la
 * semantique de `input type="radio"`, et le navigateur donne alors gratuitement
 * ce qu'il aurait fallu reimplementer en entier, fleches dans les deux axes,
 * bouclage, arret de tabulation unique sur l'option cochee, et l'annonce
 * "2 sur 3" par un lecteur d'ecran. Un comportement reimplemente est un
 * comportement a tester ; celui-la est teste par le navigateur.
 *
 * Le `input` est masque a l'oeil mais reste dans l'arbre d'accessibilite et
 * dans l'ordre de tabulation : c'est une opacite nulle, jamais un `display:
 * none` ni un `visibility: hidden`, qui le retireraient des deux. Le contour de
 * focus est reporte sur le libelle visible, dans le module CSS.
 *
 * Un seul axe de variante, `data-actif` sur chaque option
 * (docs/tokens-et-composants.md, Chip et Segment).
 */

export type OptionSegment<V extends string> = {
  valeur: V;
  libelle: string;
};

export type ProprietesSegment<V extends string> = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "role" | "onChange"
> & {
  /* Nom accessible du groupe. Les trois libelles disent chacun leur option,
     aucun ne dit de quoi il est une option : sans ce nom, le groupe est un
     choix sans question. */
  etiquette: string;
  options: readonly OptionSegment<V>[];
  valeur: V;
  onChoisir: (valeur: V) => void;
};

export function Segment<V extends string>(proprietes: ProprietesSegment<V>) {
  const { etiquette, options, valeur, onChoisir, className, ...reste } = proprietes;

  /*
   * C'est le `name` partage qui fait le groupe pour le navigateur, pas le
   * conteneur : il doit donc etre unique par instance, sinon deux Segments
   * rendus sur la meme page n'en forment plus qu'un et cocher a gauche decoche
   * a droite. Le cas n'est pas theorique, c'est exactement ce que fait la
   * planche de controle en montrant les deux modes cote a cote.
   */
  const nom = useId();

  return (
    <div
      {...reste}
      role="radiogroup"
      aria-label={etiquette}
      className={className ? `${styles.groupe} ${className}` : styles.groupe}
    >
      {options.map((option) => {
        const actif = option.valeur === valeur;
        return (
          <label key={option.valeur} data-actif={actif} className={styles.option}>
            <input
              type="radio"
              name={nom}
              value={option.valeur}
              checked={actif}
              onChange={() => onChoisir(option.valeur)}
              className={styles.controle}
            />
            {option.libelle}
          </label>
        );
      })}
    </div>
  );
}
