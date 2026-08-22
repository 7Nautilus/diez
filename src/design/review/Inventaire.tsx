import { Fragment, useState } from "react";
import { Bouton, type VarianteBouton } from "../components/Bouton";
import { Chip } from "../components/Chip";
import { EtatVide } from "../components/EtatVide";
import { Etiquette } from "../components/Etiquette";
import { Feuille } from "../components/Feuille";
import { Segment } from "../components/Segment";
import { SelecteurNiveau, styleDeRampe } from "../components/SelecteurNiveau";
import { Statut } from "../components/Statut";
import { Echelles } from "./Echelles";
import styles from "./Inventaire.module.css";
import { Rubrique } from "./Rubrique";

/*
 * Diez : l'inventaire des primitives, rendu une fois par mode.
 *
 * Ce composant est instancie DEUX FOIS, une par panneau de la planche, et il
 * porte son etat localement : les deux colonnes se manipulent donc
 * independamment, ce qui permet de comparer un meme controle dans deux etats
 * differents et dans deux modes differents.
 *
 * Deux composants avaient anticipe ce montage et il faut le noter, parce que
 * c'est ce qui le rend possible : le Segment tire son `name` de `useId`, sans
 * quoi les deux colonnes n'auraient forme qu'un seul groupe radio et cocher a
 * gauche aurait decoche a droite ; et le SelecteurNiveau est generique sur le
 * type de ses crans, ce qui laisse la planche lui passer une echelle sans que
 * `design/` ait jamais a nommer un type du domaine.
 */

/*
 * L'echelle du selecteur, ecrite ici en DONNEE D'ESSAI et non en verite du
 * jeu. `design/` ne remonte jamais vers `domain/` (architecture.md section 3),
 * donc `NIVEAUX` n'est pas importable, et il n'est pas question de le recopier
 * sous un autre nom : ce serait ouvrir un second endroit ou l'echelle du jeu
 * pourrait deriver. Dix crans parce que c'est ce qui rend la rampe lisible,
 * pas parce que la planche saurait quoi que ce soit du jeu.
 */
const CRANS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
type Cran = (typeof CRANS)[number];

/*
 * Trois crans brules, DISPERSES dans l'echelle. Groupes en tete ou en queue,
 * on les prendrait pour un effet de la rampe ; disperses, on voit qu'un cran
 * consomme se distingue de ses deux voisins par la FORME et non par
 * l'opacite. C'est la comparaison que cette planche existe pour rendre
 * possible.
 */
const CRANS_JOUES: readonly Cran[] = [2, 5, 9];
const AUCUN_CRAN_JOUE: readonly Cran[] = [];

const VARIANTES_BOUTON: readonly VarianteBouton[] = ["primaire", "secondaire", "ghost"];

const FORMES = [
  { valeur: "toutes", libelle: "Les deux" },
  { valeur: "grille", libelle: "Grille" },
  { valeur: "molette", libelle: "Molette" },
] as const;
type ChoixForme = (typeof FORMES)[number]["valeur"];

const CONSOMMATION = [
  { valeur: "trois", libelle: "Trois joués" },
  { valeur: "aucun", libelle: "Aucun" },
] as const;
type ChoixConsommation = (typeof CONSOMMATION)[number]["valeur"];

export function Inventaire() {
  const [general, setGeneral] = useState(true);
  const [maison, setMaison] = useState(false);
  const [forme, setForme] = useState<ChoixForme>("toutes");
  const [consommation, setConsommation] = useState<ChoixConsommation>("trois");
  /* Un cran quelconque au milieu de l'echelle : la molette doit s'ouvrir
     ailleurs qu'en butee, sinon la moitie de la rampe reste hors de vue. */
  const [designe, setDesigne] = useState<Cran>(4);
  const [feuilleOuverte, setFeuilleOuverte] = useState(false);

  const joues = consommation === "trois" ? CRANS_JOUES : AUCUN_CRAN_JOUE;

  return (
    <div className={styles.inventaire}>
      <Rubrique
        titre="Bouton"
        note="Trois variantes, deux états rendus. Le survol et le focus ne se figent pas : la colonne NORMAL en est la cible, survolez-la puis atteignez-la par tabulation. Les figer demanderait de redéclarer ici les règles du composant, et cette copie mentirait le jour où elles changeraient."
      >
        <div className={styles.matrice}>
          <span />
          <Etiquette fonction="metadonnee">Normal</Etiquette>
          <Etiquette fonction="metadonnee">Désactivé</Etiquette>
          {VARIANTES_BOUTON.map((variante) => (
            <Fragment key={variante}>
              <Etiquette fonction="metadonnee">{variante}</Etiquette>
              <Bouton variante={variante}>Continuer</Bouton>
              <Bouton variante={variante} disabled>
                Continuer
              </Bouton>
            </Fragment>
          ))}
        </div>
      </Rubrique>

      <Rubrique
        titre="Etiquette"
        note="La casse normale de l'instruction n'est pas un oubli : c'est le seul libellé qu'on lit vraiment, les deux autres se reconnaissent plus qu'ils ne se lisent."
      >
        <ul className={styles.liste}>
          <li>
            <Etiquette fonction="metadonnee">Paquet général</Etiquette>
          </li>
          <li>
            <Etiquette fonction="etat">Niveau 7 déjà joué</Etiquette>
          </li>
          <li>
            <Etiquette fonction="instruction">
              Annoncez votre chiffre en même temps que les autres.
            </Etiquette>
          </li>
        </ul>
      </Rubrique>

      <Rubrique
        titre="Chip"
        note="Actif et inactif, les deux réellement cliquables. L'état ne tient pas qu'à la bordure : aria-pressed porte la même information."
      >
        <div className={styles.rangee}>
          <Chip actif={general} onClick={() => setGeneral(!general)}>
            Général
          </Chip>
          <Chip actif={maison} onClick={() => setMaison(!maison)}>
            Maison
          </Chip>
        </div>
      </Rubrique>

      <Rubrique
        titre="Segment"
        note="Deux options et trois options. Les deux pilotent réellement le sélecteur ci-dessous : un contrôle qui ne fait rien ne prouve rien."
      >
        <div className={styles.rangee}>
          <Segment
            etiquette="Crans consommés"
            options={CONSOMMATION}
            valeur={consommation}
            onChoisir={setConsommation}
          />
          <Segment
            etiquette="Forme du sélecteur"
            options={FORMES}
            valeur={forme}
            onChoisir={setForme}
          />
        </div>
      </Rubrique>

      <Rubrique
        titre="SelecteurNiveau"
        note="La comparaison la plus importante de la planche. Un cran consommé perd son remplissage et son chiffre ; il ne perd JAMAIS d'opacité. Basculez « Aucun » ci-dessus : seuls les crans 2, 5 et 9 changent, et ils changent de forme."
      >
        <div className={styles.formes}>
          {forme === "molette" ? null : (
            <div className={styles.forme}>
              <Etiquette fonction="metadonnee">Grille</Etiquette>
              <SelecteurNiveau
                niveaux={CRANS}
                consommes={joues}
                forme="grille"
                designe={designe}
                onDesigner={setDesigne}
                onValider={setDesigne}
              />
            </div>
          )}
          {forme === "grille" ? null : (
            <div className={styles.forme}>
              <Etiquette fonction="metadonnee">Molette</Etiquette>
              <SelecteurNiveau
                niveaux={CRANS}
                consommes={joues}
                forme="molette"
                designe={designe}
                onDesigner={setDesigne}
                onValider={setDesigne}
              />
            </div>
          )}
        </div>
      </Rubrique>

      <Rubrique
        titre="Rampe de difficulté"
        note="Les dix crans côte à côte, pour lire la progression. L'opacité ne descend jamais sous --rampe-min, et la valeur d'un cran est interpolée : la planche lit la formule à sa source plutôt que d'en recopier dix nombres."
      >
        <ol className={styles.rampe}>
          {CRANS.map((cran, indice) => (
            <li
              key={cran}
              className={styles.echelon}
              style={styleDeRampe(indice, CRANS.length - 1)}
            >
              <span className={styles.pastille} />
              <Etiquette fonction="metadonnee">{cran}</Etiquette>
            </li>
          ))}
        </ol>
      </Rubrique>

      <Rubrique
        titre="Feuille"
        note="Fermée, elle ne rend rien du tout. Ouverte, elle passe par un portail vers le corps du document : elle sort donc de cette colonne et suit le mode global, pas celui du panneau. Elle rend aussi le reste inerte, y compris le sélecteur de mode."
      >
        <Bouton variante="secondaire" onClick={() => setFeuilleOuverte(true)}>
          Ouvrir la feuille
        </Bouton>
        <Feuille
          titre="Menu"
          ouverte={feuilleOuverte}
          surFermeture={() => setFeuilleOuverte(false)}
        >
          <div className={styles.menu}>
            <Bouton variante="ghost">Signaler la question</Bouton>
            <Bouton variante="ghost">Réinitialiser l'historique</Bouton>
          </div>
        </Feuille>
      </Rubrique>

      <Rubrique
        titre="Statut"
        note="Le texte ne passe en rouge dans aucun des deux tons : seuls les crochets prennent l'accent. Sur fond sombre, l'accent tombe sous le seuil exigé pour du texte courant."
      >
        <div className={styles.rangee}>
          <Statut>Prêt</Statut>
          <Statut ton="signal">Signalée</Statut>
        </div>
      </Rubrique>

      <Rubrique
        titre="EtatVide"
        note="Aucun dessin, aucune mascotte, une phrase et pas deux : la marge est le composant."
      >
        <EtatVide titre="Pioche épuisée" phrase="Toutes les questions du paquet ont été jouées." />
      </Rubrique>

      <Echelles />
    </div>
  );
}
