import { Etiquette } from "../components/Etiquette";
import styles from "./Echelles.module.css";
import { Rubrique } from "./Rubrique";

/*
 * Diez : les deux echelles du systeme, rendues.
 *
 * LES NOMS SONT ECRITS ICI, LES VALEURS NULLE PART. Chaque ligne pose un
 * attribut `data-*` portant le nom d'un token, et le module CSS lui applique
 * la variable du meme nom. Une echelle rendue en recopiant ses nombres ne
 * mesurerait qu'elle-meme : elle continuerait d'afficher l'ancienne echelle
 * apres qu'on ait deplace un cran dans tokens.css, sans que rien ne le
 * signale.
 *
 * Les deux listes ci-dessous sont donc a tenir a jour avec tokens.css, et
 * c'est la planche elle-meme qui le dit : un token ajoute sans sa ligne
 * n'apparait pas, un nom sans regle CSS s'affiche a la taille heritee. Les
 * deux se voient d'un coup d'oeil, ce qui est precisement le service que rend
 * une planche.
 */

const PALIERS = [
  "display-xl",
  "display-lg",
  "display-md",
  "heading",
  "body",
  "body-sm",
  "caption",
  "label",
] as const;

const PAS = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"] as const;

export function Echelles() {
  return (
    <>
      <Rubrique
        titre="Échelle typographique"
        note="Huit paliers, en rem pour suivre le réglage de taille de texte du téléphone, qui est le premier que touche une personne qui voit mal."
      >
        <ol className={styles.echelle}>
          {PALIERS.map((palier) => (
            <li key={palier} className={styles.palier} data-palier={palier}>
              <Etiquette fonction="metadonnee">{`--txt-${palier}`}</Etiquette>
              <span className={styles.echantillon}>Diez</span>
            </li>
          ))}
        </ol>
      </Rubrique>

      <Rubrique
        titre="Échelle d'espacement"
        note="Base 8. C'est l'espacement qui dit les relations : serré signifie « ces choses vont ensemble », vaste signifie « nouveau contexte »."
      >
        <ol className={styles.echelle}>
          {PAS.map((pas) => (
            <li key={pas} className={styles.pas} data-pas={pas}>
              <Etiquette fonction="metadonnee">{`--esp-${pas}`}</Etiquette>
              <span className={styles.barre} />
            </li>
          ))}
        </ol>
      </Rubrique>
    </>
  );
}
