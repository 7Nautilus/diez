/*
 * Feuille : le panneau du bas.
 *
 * Une seule forme, aucune variante (docs/tokens-et-composants.md, section
 * Feuille). Elle porte le menu, qui n'existe que sur l'accueil et prend cette
 * forme plutot qu'un panneau lateral parce qu'elle arrive dans l'arc du pouce
 * (docs/design-system.md section 4, ACCUEIL).
 *
 * Le confinement du focus est ici un COMPORTEMENT et non un attribut. Un
 * `aria-modal` pose sans confinement reel avait ete releve par l'audit
 * d'accessibilite de ce projet : il annonce a la synthese vocale que
 * l'arriere-plan n'existe plus, alors que la tabulation continue de s'y
 * promener. Les quatre pieces qui rendent l'annonce vraie sont donc reunies :
 * `inert` sur tout ce qui n'est pas le panneau, le focus deplace a
 * l'ouverture, RENDU au declencheur a la fermeture, et Echap qui ferme.
 *
 * Le panneau est rendu par un portail en fin de `<body>`, pour deux raisons.
 * `inert` etant herite, marquer l'arriere-plan sans marquer le panneau exige
 * qu'il ne soit descendant d'aucun de ses voisins. Et pose en dernier, il
 * peint au-dessus du reste sans qu'aucun `z-index` n'ait a etre invente.
 */
import { type ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./Feuille.module.css";

type ProprietesFeuille = {
  /** Rendu en tete du panneau, et sert de nom accessible : un panneau sans nom
   * est annonce comme un simple groupe. */
  titre: string;
  ouverte: boolean;
  surFermeture: () => void;
  children: ReactNode;
};

export function Feuille({ titre, ouverte, surFermeture, children }: ProprietesFeuille) {
  /*
   * Fermee, la Feuille ne rend rien, plutot que de rester montee sous
   * l'attribut `hidden`. Ce n'est pas un detail de gout : `[hidden]` de la
   * feuille du navigateur a une specificite nulle, et toute regle d'auteur
   * declarant un `display` l'ecrase en silence. Le correctif porteur d'un
   * `!important` est dans base.css, mais le plus sur reste de ne jamais mettre
   * les deux en presence. Demonter garantit en prime que l'arriere-plan
   * redevient actif et que le focus repart vers son declencheur.
   */
  if (!ouverte) return null;

  return createPortal(
    <PanneauOuvert titre={titre} surFermeture={surFermeture}>
      {children}
    </PanneauOuvert>,
    document.body,
  );
}

function PanneauOuvert({ titre, surFermeture, children }: Omit<ProprietesFeuille, "ouverte">) {
  const idTitre = useId();
  const refPanneau = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panneau = refPanneau.current;
    if (!panneau) return;

    const declencheur = document.activeElement;
    panneau.focus();

    /*
     * `inert` retire l'arriere-plan de la tabulation ET de l'arbre
     * d'accessibilite : c'est le comportement qu'aucun attribut declaratif ne
     * produit a lui seul. On ne touche pas a un voisin deja inerte, sinon la
     * fermeture le reveillerait alors que quelqu'un d'autre l'avait endormi.
     */
    const endormis: Element[] = [];
    for (const voisin of Array.from(document.body.children)) {
      if (voisin.contains(panneau) || voisin.hasAttribute("inert")) continue;
      voisin.setAttribute("inert", "");
      endormis.push(voisin);
    }

    return () => {
      for (const voisin of endormis) voisin.removeAttribute("inert");
      // Sans cette restitution, le focus retombe sur `<body>` et la navigation
      // au clavier repart du haut de la page, loin du bouton qui a ouvert.
      if (declencheur instanceof HTMLElement) declencheur.focus();
    };
  }, []);

  useEffect(() => {
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === "Escape") surFermeture();
    };
    /*
     * Ecoute posee sur `window` et non sur le panneau : une touche pressee
     * alors que le focus a echappe doit fermer quand meme.
     * Piege connu au moment de tester : un `KeyboardEvent` construit sans
     * `bubbles: true` n'atteint jamais un ecouteur pose sur `window`.
     */
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [surFermeture]);

  return (
    <div className={styles.voile}>
      <div
        className={styles.feuille}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        ref={refPanneau}
        tabIndex={-1}
      >
        {/* Poignee decorative : elle dit "panneau du bas" a l'oeil, et n'a rien
            a dire a la synthese vocale, que le titre renseigne deja. */}
        <div className={styles.poignee} aria-hidden="true" />
        <div className={styles.entete}>
          <h2 className={styles.titre} id={idTitre}>
            {titre}
          </h2>
          {/* Un vrai `button`, et un libelle visible plutot qu'une croix : a
              bout de bras dans une piece sombre, un mot se lit mieux qu'un
              signe de 24 px, et il n'y a plus de nom accessible a inventer. */}
          <button className={styles.fermer} type="button" onClick={surFermeture}>
            Fermer
          </button>
        </div>
        <div className={styles.contenu}>{children}</div>
      </div>
    </div>
  );
}
