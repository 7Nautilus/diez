import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  useId,
  useLayoutEffect,
  useRef,
} from "react";
import styles from "./SelecteurNiveau.module.css";

/*
 * Diez : le SelecteurNiveau.
 *
 * Deux formes coexistent, la MOLETTE par defaut et la GRILLE conservee
 * (design-system.md section 4, NIVEAU). Un seul axe les separe, `data-forme`,
 * et un second qualifie chaque cran, `data-etat`. Les etats subis restent en
 * pseudo-classes, comme pour le Bouton : la matrice ne porte que les variantes
 * choisies (tokens-et-composants.md, Composants et variantes).
 *
 * PRIMITIVE DE DESIGN, donc elle ignore le domaine : `design/` est le bas de
 * la chaine de dependance et ne remonte jamais vers `domain/`, ce que le lint
 * refuse (architecture.md section 3). Le type `Niveau` n'est donc pas
 * importable ici.
 *
 * Il n'est pas recopie pour autant. Recopier l'union des dix membres ouvrirait
 * un second endroit ou l'echelle du jeu pourrait deriver, et rien ne
 * signalerait le desaccord. Le composant est generique sur le type des crans :
 * l'ecran passe sa propre echelle et la retrouve intacte dans les rappels,
 * sans que `design/` ait jamais eu a nommer un type du domaine.
 */

export type FormeSelecteur = "grille" | "molette";

export type ProprietesSelecteurNiveau<N extends number> = {
  /**
   * L'echelle COMPLETE, dans l'ordre de difficulte croissante. La rampe
   * d'opacite se calcule sur le rang d'un cran dans cette liste : une liste
   * amputee ou desordonnee donnerait une rampe fausse sans rien casser.
   */
  niveaux: readonly N[];
  /** Les niveaux deja joues sur cette carte, portes par la phase NIVEAU. */
  consommes: readonly N[];
  /** La molette par defaut. La grille reste commutable, elle est conservee. */
  forme?: FormeSelecteur;
  /** Le cran designe. Sans effet sur la grille, qui n'a pas de designation. */
  designe: N;
  /**
   * La designation, qui n'engage rien. C'est la moitie du geste de la
   * molette ; la grille ne l'emet pas, elle engage directement.
   */
  onDesigner: (niveau: N) => void;
  /** L'engagement. Grille : le tap. Molette : la touche Entree. */
  onValider: (niveau: N) => void;
};

export function SelecteurNiveau<N extends number>({
  niveaux,
  consommes,
  forme = "molette",
  designe,
  onDesigner,
  onValider,
}: ProprietesSelecteurNiveau<N>) {
  if (forme === "grille") {
    return <Grille niveaux={niveaux} consommes={consommes} onValider={onValider} />;
  }
  return (
    <Molette
      niveaux={niveaux}
      consommes={consommes}
      designe={designe}
      onDesigner={onDesigner}
      onValider={onValider}
    />
  );
}

/*
 * Le chiffre d'un cran consomme lui cede la place. Point median, U+00B7, ecrit
 * en echappement parce qu'a l'oeil il ne se distingue ni du point ni de la
 * puce, et que le lecteur du code doit savoir lequel des trois il tient.
 */
const POINT_MEDIAN = "\u00B7";

/** Le selecteur n'a aucun texte visible en propre : sans ce nom, il est muet. */
const NOM_ACCESSIBLE = "Niveau de la question";

/*
 * Un cran consomme doit l'annoncer a une aide technique et pas seulement a
 * l'oeil : le point median n'est qu'une forme, et une forme ne se lit pas a
 * voix haute. C'est la meme exigence que "aucune information portee par la
 * couleur seule" (design-system.md section 9), appliquee a la forme.
 */
function nomDuCran(niveau: number, consomme: boolean): string {
  return consomme ? `Niveau ${niveau}, déjà joué` : `Niveau ${niveau}`;
}

function idDuCran(prefixe: string, niveau: number): string {
  return `${prefixe}-cran-${niveau}`;
}

export type StyleDeCran = CSSProperties & Record<"--op", string>;

/*
 * LA RAMPE EST UNE FORMULE, JAMAIS UNE TABLE. Dix valeurs recopiees se
 * desynchronisent le jour ou le seuil bouge, une interpolation ne le peut pas.
 * tokens-et-composants.md donne les dix nombres "pour information et non pour
 * recopie" ; les voici donc calcules :
 *
 *   op(n) = --rampe-min + (n - 1) x (--rampe-max - --rampe-min) / 9
 *
 * C'est le seul style en ligne autorise du projet, et conventions-code.md
 * section 8 le prevoit nommement pour l'opacite d'un cran : la valeur depend
 * du rendu, aucune feuille statique ne peut la porter.
 *
 * Deux precautions le gardent DRY. Les deux bornes sont LUES par leur nom et
 * jamais recopiees, donc deplacer le plancher dans tokens.css deplace la rampe
 * entiere. Et le diviseur vient de la longueur de l'echelle recue, si bien que
 * meme le 9 de la formule n'est pas un litteral : c'est le nombre
 * d'intervalles entre les crans, il se deduit.
 *
 * `indice` est le rang du cran, compte a partir de zero, soit le (n - 1) de la
 * formule.
 *
 * EXPORTEE, contre l'habitude de garder un detail d'implementation prive : la
 * planche de controle doit rendre les dix crans cote a cote pour qu'on lise la
 * progression d'un coup d'oeil, et si elle recopiait l'interpolation, les deux
 * ecritures se desynchroniseraient le jour ou le plancher bouge. C'est
 * exactement ce que cette fonction existe pour empecher. La planche lit donc
 * la rampe a sa source.
 */
export function styleDeRampe(indice: number, intervalles: number): StyleDeCran {
  /* Une echelle a un seul cran n'a pas de rampe : elle est a pleine intensite,
     et diviser par zero rendrait la declaration invalide en silence. */
  if (intervalles <= 0) return { "--op": "var(--rampe-max)" };
  return {
    "--op": `calc(var(--rampe-min) + ${indice} * (var(--rampe-max) - var(--rampe-min)) / ${intervalles})`,
  };
}

/* --- La grille, conservee. Engagement immediat : taper choisit. --- */

type ProprietesGrille<N extends number> = {
  niveaux: readonly N[];
  consommes: readonly N[];
  onValider: (niveau: N) => void;
};

function Grille<N extends number>({ niveaux, consommes, onValider }: ProprietesGrille<N>) {
  const intervalles = niveaux.length - 1;

  /*
   * `fieldset` et non un `div` porteur de `role="group"` : c'est l'element
   * natif du regroupement de controles, et le lint refuse le role quand
   * l'element existe. La legende donne le nom accessible sans qu'aucun
   * attribut ARIA n'ait a le porter, et les lecteurs d'ecran l'annoncent en
   * entrant dans le groupe, ce qu'un `aria-label` sur un conteneur ne fait
   * pas. Elle est masquee a l'oeil : l'ecran NIVEAU porte deja son titre.
   */
  return (
    <fieldset className={styles.selecteur} data-forme="grille">
      <legend className={styles.legende}>{NOM_ACCESSIBLE}</legend>
      {niveaux.map((niveau, indice) => {
        const consomme = consommes.includes(niveau);
        return (
          <button
            key={niveau}
            type="button"
            className={styles.cran}
            data-etat={consomme ? "consomme" : "libre"}
            /*
             * `aria-disabled` et non l'attribut `disabled` natif, contre
             * l'habitude : `disabled` sort le bouton de l'ordre de tabulation,
             * donc quelqu'un qui navigue au clavier ou au lecteur d'ecran ne
             * rencontrerait jamais le cran et n'apprendrait jamais que le
             * niveau est brule. L'information redeviendrait visuelle seule.
             * Le cran reste atteignable et annonce ce qu'il est ; c'est
             * l'absence de gestionnaire qui le rend inoperant.
             */
            aria-disabled={consomme || undefined}
            aria-label={nomDuCran(niveau, consomme)}
            style={consomme ? undefined : styleDeRampe(indice, intervalles)}
            onClick={consomme ? undefined : () => onValider(niveau)}
          >
            {consomme ? POINT_MEDIAN : niveau}
          </button>
        );
      })}
    </fieldset>
  );
}

/* --- La molette, le defaut. --- */

type ProprietesMolette<N extends number> = {
  niveaux: readonly N[];
  consommes: readonly N[];
  designe: N;
  onDesigner: (niveau: N) => void;
  onValider: (niveau: N) => void;
};

/*
 * Le pas de defilement, MESURE plutot que relu.
 *
 * La liste porte en haut et en bas un vide d'exactement la moitie de ce qui
 * separe la fenetre d'un cran, sans quoi le premier et le dernier cran ne
 * pourraient pas atteindre la bande de lecture. Le defilement maximal vaut
 * donc exactement le nombre d'intervalles fois la hauteur d'un cran, et la
 * division rend cette hauteur.
 *
 * On la mesure au lieu de relire --niveau-cran-h en JavaScript : la valeur
 * reste definie a un seul endroit, tokens.css, et le composant ne peut pas
 * diverger de sa propre mise en page.
 */
function pasDeDefilement(element: HTMLElement, intervalles: number): number {
  if (intervalles <= 0) return 0;
  return (element.scrollHeight - element.clientHeight) / intervalles;
}

function borner(valeur: number, maximum: number): number {
  return Math.min(maximum, Math.max(0, valeur));
}

function Molette<N extends number>({
  niveaux,
  consommes,
  designe,
  onDesigner,
  onValider,
}: ProprietesMolette<N>) {
  const liste = useRef<HTMLDivElement>(null);
  const prefixe = useId();
  const intervalles = niveaux.length - 1;
  const indiceDesigne = niveaux.indexOf(designe);

  /*
   * Le defilement suit la designation, et non l'inverse : le composant est
   * pilote par ses proprietes, donc la position de la molette est un rendu de
   * `designe` et pas un etat parallele qui pourrait s'en ecarter.
   *
   * En `useLayoutEffect` parce qu'un cran mal place puis corrige apres la
   * peinture serait un saut visible, ce qui est exactement le mouvement que le
   * systeme refuse.
   */
  useLayoutEffect(() => {
    const element = liste.current;
    if (element === null || indiceDesigne < 0) return;
    const pas = pasDeDefilement(element, intervalles);
    /* Fenetre pas encore mise en page, ou masquee : rien a positionner. */
    if (pas <= 0) return;
    const cible = indiceDesigne * pas;
    /* Un ecart inferieur au pixel vient de l'arrondi du navigateur et non d'un
       desaccord : le corriger relancerait un defilement a chaque rendu. */
    if (Math.abs(element.scrollTop - cible) >= 1) element.scrollTop = cible;
  }, [indiceDesigne, intervalles]);

  const designer = (indice: number) => {
    const cran = niveaux[borner(indice, intervalles)];
    if (cran !== undefined && cran !== designe) onDesigner(cran);
  };

  /*
   * La designation suit le doigt pendant qu'il fait tourner la molette, cran
   * par cran, parce que c'est ce que fait une molette : la valeur change en
   * passant. Aucun evenement de defilement n'est detourne, c'est un vrai
   * conteneur qui defile et il garde l'inertie du systeme.
   */
  const surDefilement = () => {
    const element = liste.current;
    if (element === null) return;
    const pas = pasDeDefilement(element, intervalles);
    if (pas <= 0) return;
    designer(Math.round(element.scrollTop / pas));
  };

  /*
   * Un cran consomme se DESIGNE mais ne s'engage pas. La bande peut tomber
   * dessus, et c'est voulu : une molette qui esquiverait des crans toute seule
   * serait incomprehensible (design-system.md section 4, La molette). Le refus
   * vit ici parce que le composant est seul a connaitre `consommes` ; l'ecran,
   * lui, desactive son bouton en disant pourquoi, NIVEAU 7 DÉJÀ JOUÉ.
   */
  const valider = () => {
    if (consommes.includes(designe)) return;
    onValider(designe);
  };

  const surTouche = (evenement: KeyboardEvent<HTMLDivElement>) => {
    switch (evenement.key) {
      case "ArrowDown":
        designer(indiceDesigne + 1);
        break;
      case "ArrowUp":
        designer(indiceDesigne - 1);
        break;
      /* Bornes et non bouclage : une echelle qui repasserait de 10 a 1 ne
         correspondrait a aucun geste possible sur le conteneur, qui bute. */
      case "Home":
        designer(0);
        break;
      case "End":
        designer(intervalles);
        break;
      case "Enter":
        valider();
        break;
      default:
        return;
    }
    /* Sinon les fleches defilent AUSSI la fenetre par-dessus le positionnement
       du composant, et Entree activerait le cran sous le curseur. */
    evenement.preventDefault();
  };

  /*
   * Le focus appartient a la liste, pas aux crans : c'est elle qui porte
   * `aria-activedescendant`, donc un clic qui le lui prendrait ferait perdre
   * le fil a un lecteur d'ecran au milieu d'une designation.
   */
  const garderLeFocus = (evenement: MouseEvent<HTMLButtonElement>) => {
    evenement.preventDefault();
  };

  return (
    <div className={styles.selecteur} data-forme="molette">
      <div className={styles.fenetre}>
        {/* La bande de lecture n'apprend rien qu'une aide technique n'ait deja
            par `aria-activedescendant` : elle designe a l'oeil, et seulement
            a l'oeil. */}
        <div className={styles.bande} aria-hidden="true" />
        {/*
         * Une molette est une liste dont on choisit un element, et aucun
         * element natif ne la rend : `select` ouvrirait le selecteur du
         * systeme, incapable de porter la rampe. D'ou le motif `listbox`, ou
         * la liste est le seul point de tabulation et designe son cran actif.
         * Les crans restent malgre tout des `button` : le clic, la touche
         * Entree et l'annonce du role viennent avec, et aucun des trois ne se
         * reimplemente correctement sur un `div`.
         */}
        <div
          ref={liste}
          className={styles.liste}
          role="listbox"
          tabIndex={0}
          aria-label={NOM_ACCESSIBLE}
          aria-activedescendant={indiceDesigne < 0 ? undefined : idDuCran(prefixe, designe)}
          onKeyDown={surTouche}
          onScroll={surDefilement}
        >
          {niveaux.map((niveau, indice) => {
            const consomme = consommes.includes(niveau);
            return (
              <button
                key={niveau}
                id={idDuCran(prefixe, niveau)}
                type="button"
                role="option"
                tabIndex={-1}
                className={styles.cran}
                data-etat={consomme ? "consomme" : "libre"}
                aria-selected={niveau === designe}
                /*
                 * Pas d'`aria-disabled` ici, a l'inverse de la grille, et ce
                 * n'est pas un oubli : sur la molette un cran consomme se
                 * designe reellement, la bande peut tomber dessus. Le declarer
                 * desactive annoncerait "non selectionnable" a propos d'un cran
                 * que le doigt selectionne sous les yeux de tout le monde. Ce
                 * qu'il faut annoncer, c'est ce qu'il est, et son nom le dit.
                 */
                aria-label={nomDuCran(niveau, consomme)}
                style={consomme ? undefined : styleDeRampe(indice, intervalles)}
                onMouseDown={garderLeFocus}
                onClick={() => designer(indice)}
              >
                {consomme ? POINT_MEDIAN : niveau}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
