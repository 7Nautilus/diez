import { useId, useState } from "react";
import { Bouton } from "../design/components/Bouton";
import { Chip } from "../design/components/Chip";
import { Etiquette } from "../design/components/Etiquette";
import { Feuille } from "../design/components/Feuille";
import { type OptionSegment, Segment } from "../design/components/Segment";
import { Statut } from "../design/components/Statut";
import type { PaquetId } from "../domain/types";
import styles from "./Accueil.module.css";
import type { ModeAffichage, PaquetActif } from "./types";

/*
 * Diez : l'ecran d'accueil, phase REPOS.
 *
 * Le plus charge du parcours, et celui qui porte le plus de correctifs
 * d'audit. Trois couches et une seule rupture, comme partout
 * (docs/design-system.md section 4, ACCUEIL) : le wordmark en Doto, la
 * selection des paquets, puis la pile tertiaire en bord bas.
 *
 * L'ecran est une fonction de ses proprietes. Il ne lit aucune horloge, ne
 * tire aucun hasard, n'ecrit dans aucun stockage : `screens/` ne descend que
 * vers `design/` et `domain/` (architecture.md section 3). Tout ce qui
 * persiste, y compris la preference de mode, remonte par un rappel.
 *
 * AUCUNE CONSIGNE PERMANENTE ici, contre une recommandation d'audit et
 * volontairement : la ligne d'instruction a ete retiree pour epurer l'ecran,
 * et l'apprentissage repose entierement sur le menu, dont la premiere section
 * s'appelle "Les regles" (design-system.md section 4).
 */

/*
 * `PaquetActif` et `ModeAffichage` etaient declares ici, faute de pouvoir
 * toucher un fichier partage pendant que les quatre autres ecrans s'ecrivaient
 * en parallele. Ils sont passes dans ./types.ts a la composition : Theme lit
 * la meme table de libelles, et app/ fabrique les deux.
 */

/*
 * Les trois options du selecteur de mode, hors du composant : recreer ce
 * tableau a chaque rendu ferait changer l'identite d'une propriete qui ne
 * change jamais.
 *
 * Les libelles s'ecrivent en casse normale et c'est le style qui pose les
 * capitales, comme sur la Feuille : une synthese vocale epelle volontiers un
 * mot ecrit tout en majuscules dans le document.
 */
const MODES: readonly OptionSegment<ModeAffichage>[] = [
  { valeur: "auto", libelle: "Auto" },
  { valeur: "sombre", libelle: "Sombre" },
  { valeur: "clair", libelle: "Clair" },
];

/*
 * Le compteur annonce les CARTES RESTANTES, jamais le total du corpus
 * (correctif d'audit, architecture.md section 6) : un compteur qui annonce un
 * stock dont on ne dispose plus fait arriver l'epuisement sans prevenir.
 *
 * Le francais met au singulier a zero comme a un, d'ou le seuil a 1 et non
 * a 2.
 */
function libelleCompteur(restantes: number): string {
  return restantes <= 1 ? `${restantes} carte restante` : `${restantes} cartes restantes`;
}

function libelleCopie(signalements: number): string {
  return signalements === 1 ? "Copier le signalement" : `Copier les ${signalements} signalements`;
}

export type ProprietesAccueil = {
  cartesRestantes: number;
  paquets: readonly PaquetActif[];
  signalements: number;
  /*
   * DEUX CHAMPS AJOUTES AU CONTRAT, et deux seulement. Le selecteur de mode
   * vit sur cet ecran (design-system.md section 4, couche tertiaire), mais la
   * lecture et l'ecriture de la preference relevent de `storage/`, que
   * `screens/` ne peut pas atteindre. L'ecran recoit donc le mode courant et
   * rend le choix ; la pose de `data-mode` sur la racine appartient a `app/`,
   * pour une raison qui n'est pas de principe : le mode s'applique aussi aux
   * quatre autres ecrans, et un tour repris au demarrage en phase QUESTION
   * n'affiche jamais cet ecran-ci.
   */
  mode: ModeAffichage;
  onChoisirMode: (mode: ModeAffichage) => void;
  /*
   * TROISIEME CHAMP AJOUTE AU CONTRAT, arbitre a la composition, et il repare
   * un trou : sans lui, le narrateur tape COPIER, rien ne bouge, et il retape.
   * C'est le geste meme que le verrou existe pour empecher, et c'est le
   * symetrique exact du `signalee` de l'ecran REPONSE.
   *
   * Il vaut `true` UNE FOIS LE PRESSE-PAPIER REELLEMENT ECRIT, jamais de
   * facon optimiste : l'ecriture est asynchrone et peut echouer, et afficher
   * un succes qui n'a pas eu lieu serait un mensonge que P3 interdit. C'est
   * donc app/ qui le porte, seul a tenir la promesse.
   */
  copie: boolean;
  onPiocher: () => void;
  onBasculerPaquet: (id: PaquetId) => void;
  onReinitialiser: () => void;
  onCopierSignalements: () => void;
};

export function Accueil(proprietes: ProprietesAccueil) {
  const {
    cartesRestantes,
    paquets,
    signalements,
    mode,
    onChoisirMode,
    copie,
    onPiocher,
    onBasculerPaquet,
    onReinitialiser,
    onCopierSignalements,
  } = proprietes;

  /*
   * Le seul etat local de l'ecran, et il n'appartient a personne d'autre :
   * l'ouverture du menu n'est ni du jeu, ni un reglage persiste, et rien dans
   * le contrat ne la porte. Le menu n'existe que sur l'accueil ; pendant un
   * tour, rien ne doit concurrencer l'ecran (design-system.md section 4).
   */
  const [menuOuvert, setMenuOuvert] = useState(false);

  const idRaison = useId();

  /*
   * Vrai aussi sur une liste vide, ce qui est le comportement voulu : sans
   * paquet, il n'y a rien a piocher.
   */
  const aucunPaquet = paquets.every((paquet) => !paquet.actif);

  return (
    <main className={styles.ecran}>
      {/*
       * Le menu se declenche par un mot et non par un chevron a trois barres,
       * pour la raison qui a fait ecrire "Fermer" en toutes lettres sur la
       * Feuille : a bout de bras dans une piece sombre, un mot se lit mieux
       * qu'un signe, et il n'y a plus de nom accessible a inventer.
       */}
      <div className={styles.barre}>
        <Bouton variante="ghost" onClick={() => setMenuOuvert(true)}>
          Menu
        </Bouton>
      </div>

      {/*
       * LA RUPTURE, et la seule : le wordmark en Doto, seul moment matriciel
       * de toute l'application. Sa rarete fait sa force, il n'y en a nulle
       * part ailleurs (design-system.md sections 1 et 4).
       */}
      <h1 className={styles.wordmark}>Diez</h1>

      {/*
       * UN `fieldset` NATIF, et non un `div role="group"` : trois pilules nues
       * ne disent pas de quoi elles sont les options, et l'element natif
       * rattache son `legend` au groupe sans qu'aucun identifiant n'ait a
       * etre fabrique ni maintenu. C'est la meme raison que le `button` du
       * Chip et le `radio` du Segment, l'element natif d'abord.
       */}
      <fieldset className={styles.paquets}>
        <legend>
          <Etiquette fonction="metadonnee">Paquets</Etiquette>
        </legend>
        <div className={styles.chips}>
          {paquets.map((paquet) => (
            <Chip key={paquet.id} actif={paquet.actif} onClick={() => onBasculerPaquet(paquet.id)}>
              {paquet.libelle}
            </Chip>
          ))}
        </div>
      </fieldset>

      {/*
       * La pile tertiaire, ancree en bord bas. La regle des deux emplacements
       * veut PIOCHER a l'emplacement AU-DESSUS, le compteur occupant le
       * dernier rang (design-system.md, La regle des deux emplacements) : sur
       * l'ecran suivant, ANNONCER LES CHIFFRES prend le dernier rang, et les
       * deux ne se superposent donc pas.
       *
       * Tout ce qui s'affiche par intermittence, la raison du blocage et
       * l'action de copie, est place AU-DESSUS de PIOCHER : pose en dessous,
       * il deplacerait le bouton d'avancement d'une soiree a l'autre.
       */}
      <div className={styles.pile}>
        <Segment
          etiquette="Mode d'affichage"
          options={MODES}
          valeur={mode}
          onChoisir={onChoisirMode}
          className={styles.modes}
        />

        {/* Visible uniquement s'il existe des signalements (correctif
            d'audit, architecture.md section 7) : sans signalement, l'action
            n'a rien a copier et n'est qu'une ligne de plus a lire. */}
        {signalements > 0 && (
          /*
           * Le retour de copie est SUR LA MEME RANGEE que le bouton, jamais
           * en dessous : la pile est ancree en bord bas, donc un rang qui
           * apparait pousse PIOCHER vers le haut, et l'emplacement de
           * l'avancement ne doit pas dependre de ce qu'on vient de faire
           * (design-system.md, La regle des deux emplacements). Le Statut
           * tenant dans la hauteur du bouton, la rangee ne change pas de
           * taille. C'est l'arrangement de `.rangSignalement` sur l'ecran
           * REPONSE, pour la meme raison.
           */
          <div className={styles.rangCopie}>
            <Bouton variante="ghost" onClick={onCopierSignalements}>
              {libelleCopie(signalements)}
            </Bouton>
            {copie ? <Statut>Copié</Statut> : null}
          </div>
        )}

        <div className={styles.avancement}>
          {/*
           * Un bouton desactive sans explication est une impasse (correctif
           * d'audit). La raison est en Etiquette de fonction `instruction`,
           * seule fonction en casse normale, parce que c'est la seule
           * etiquette qu'on lise vraiment (design-system.md section 3).
           *
           * `disabled` natif plutot qu'un `aria-disabled` : l'attribut retire
           * le bouton du champ du pointeur, du clavier et de la touche
           * Entree d'un seul geste, et le Bouton lui donne deja son etat
           * visuel. Un bouton desactive n'etant pas focusable, la raison est
           * en plus reliee par `aria-describedby`, sans quoi elle ne serait
           * qu'a cote de lui a l'oeil.
           */}
          {aucunPaquet && (
            <Etiquette fonction="instruction" id={idRaison} className={styles.raison}>
              Sélectionne au moins un paquet.
            </Etiquette>
          )}
          {/*
           * PIOCHER reste ACTIF quand il ne reste aucune carte, et ce n'est
           * pas un oubli : la pioche a vide mene a un ecran d'epuisement
           * explicite qui propose de reinitialiser (architecture.md section 6,
           * etape 5). Le compteur a "0 carte restante" a deja prevenu.
           */}
          <Bouton
            variante="primaire"
            className={styles.piocher}
            disabled={aucunPaquet}
            aria-describedby={aucunPaquet ? idRaison : undefined}
            onClick={onPiocher}
          >
            Piocher
          </Bouton>
        </div>

        <Etiquette fonction="metadonnee" className={styles.compteur}>
          {libelleCompteur(cartesRestantes)}
        </Etiquette>
      </div>

      <Feuille titre="Menu" ouverte={menuOuvert} surFermeture={() => setMenuOuvert(false)}>
        <div className={styles.menu}>
          <section className={styles.rubrique}>
            {/*
             * La premiere section s'appelle "Les regles", et le P1 "aucun
             * apprentissage" repose entierement sur elle depuis que la
             * consigne permanente a ete retiree de l'accueil
             * (design-system.md section 4).
             */}
            <h3 className={styles.titreRubrique}>
              <Etiquette fonction="metadonnee">Les règles</Etiquette>
            </h3>
            <ol className={styles.regles}>
              <li>Une seule personne tient le téléphone toute la partie : le narrateur.</li>
              <li>Elle pioche une carte et lit le thème à voix haute.</li>
              <li>Chacun autour de la table annonce son chiffre, de 1 à 10.</li>
              <li>Le narrateur en fait une moyenne à l'oreille, et choisit ce niveau.</li>
              <li>Il lit la question à toute la table. Le groupe cherche ensemble.</li>
              <li>Il révèle la réponse.</li>
            </ol>
            <p className={styles.precision}>
              Pas de score, pas de pions, pas de tour de rôle. Le narrateur joue aussi : il découvre
              la question après que chacun a annoncé son chiffre.
            </p>
          </section>

          <section className={styles.rubrique}>
            {/*
             * REINITIALISER EST ICI ET NON DANS LA PILE TERTIAIRE. Le
             * correctif d'audit exige que l'action soit accessible depuis
             * l'accueil et pas seulement depuis l'ecran d'epuisement, ce que
             * le menu satisfait ; et le systeme n'a pas de composant
             * `Confirmation`, alors que design-system.md section 6 en prevoit
             * un pour ce seul usage. Placee en bord bas, une action
             * destructrice irreversible tomberait dans l'arc du pouce, a un
             * rang de PIOCHER, sans rien pour rattraper le geste. Les deux
             * taps du menu sont la seule garde qui existe aujourd'hui.
             */}
            <h3 className={styles.titreRubrique}>
              <Etiquette fonction="metadonnee">L'historique</Etiquette>
            </h3>
            <p className={styles.precision}>
              Le téléphone retient les questions déjà posées pour ne pas les reposer. Si tu joues
              avec un autre groupe, réinitialise : sinon l'application continue d'écarter des
              questions que personne autour de la table n'a entendues.
            </p>
            <Bouton variante="secondaire" className={styles.action} onClick={onReinitialiser}>
              Réinitialiser l'historique
            </Bouton>
          </section>
        </div>
      </Feuille>
    </main>
  );
}
