import { useId, useState } from "react";
import { Bouton } from "../design/components/Bouton";
import { Confirmation } from "../design/components/Confirmation";
import { Etiquette } from "../design/components/Etiquette";
import { Feuille } from "../design/components/Feuille";
import { type OptionSegment, Segment } from "../design/components/Segment";
import { Statut } from "../design/components/Statut";
import type { PaquetId } from "../domain/types";
import styles from "./Accueil.module.css";
import {
  CONFIRMATION_REINITIALISATION,
  type ModeAffichage,
  type PaquetActif,
  type RetourCopie,
} from "./types";

/*
 * Diez : l'ecran d'accueil, phase REPOS.
 *
 * Trois couches et une seule rupture, comme partout (docs/design-system.md
 * section 4, ACCUEIL) : le wordmark en Doto pour la rupture et pour la couche
 * primaire, PIOCHER pour la secondaire, et la pile tertiaire en bord bas,
 * compteur et copie des signalements.
 *
 * LA COUCHE SECONDAIRE N'EST PLUS LA SELECTION DES PAQUETS, a rebours du
 * tableau de design-system.md section 4 : ce tableau decrit un ecran qui
 * portait un selecteur de paquets et un selecteur de mode, et les deux sont
 * partis (plus bas, et dans le menu). Le document reste a mettre a jour, ce
 * fichier ne pouvant pas le faire.
 *
 * L'ecran est une fonction de ses proprietes. Il ne lit aucune horloge, ne
 * tire aucun hasard, n'ecrit dans aucun stockage : `screens/` ne descend que
 * vers `design/` et `domain/` (architecture.md section 3). Tout ce qui
 * persiste, y compris la preference de mode, remonte par un rappel.
 *
 * AUCUNE CONSIGNE PERMANENTE ici, contre une recommandation d'audit et
 * volontairement : la ligne d'instruction a ete retiree pour epurer l'ecran,
 * et l'apprentissage repose entierement sur le menu, dont la premiere section
 * s'appelle "Les regles" (design-system.md section 4). Le selecteur de mode a
 * suivi le meme chemin, pour la meme raison et vers le meme endroit.
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
   * vit dans le menu de cet ecran, mais la lecture et l'ecriture de la
   * preference relevent de `storage/`, que `screens/` ne peut pas atteindre.
   * L'ecran recoit donc le mode courant et rend le choix ; la pose de
   * `data-mode` sur la racine appartient a `app/`, pour une raison qui n'est
   * pas de principe : le mode s'applique aussi aux quatre autres ecrans, et un
   * tour repris au demarrage en phase QUESTION n'affiche jamais cet ecran-ci.
   */
  mode: ModeAffichage;
  onChoisirMode: (mode: ModeAffichage) => void;
  /*
   * TROISIEME CHAMP AJOUTE AU CONTRAT, arbitre a la composition, et il repare
   * un trou : sans lui, le narrateur tape COPIER, rien ne bouge, et il retape.
   * C'est le geste meme que le verrou existe pour empecher, et c'est le
   * symetrique exact du `signalee` de l'ecran REPONSE.
   *
   * Il ne passe a `reussie` QU'UNE FOIS LE PRESSE-PAPIER REELLEMENT ECRIT,
   * jamais de facon optimiste : l'ecriture est asynchrone et peut echouer, et
   * afficher un succes qui n'a pas eu lieu serait un mensonge que P3 interdit.
   * C'est donc app/ qui le porte, seul a tenir la promesse.
   *
   * Il porte TROIS etats depuis la phase 5, et la raison du troisieme est
   * ecrite avec le type (./types.ts) : un booleen rendait l'echec par le meme
   * ecran vide que l'inaction, ce qui laissait le trou a moitie ouvert.
   */
  retourCopie: RetourCopie;
  /*
   * QUATRIEME ET CINQUIEME CHAMPS, POSES EN PHASE 5. La strategie de mise a
   * jour est `prompt` et jamais `autoUpdate` : un rechargement en pleine
   * question ferait disparaitre la carte au milieu d'une phrase, donc la
   * proposition n'est presentee qu'en phase REPOS (architecture.md section 10).
   *
   * L'ecran ne connait pas cette regle et n'a pas a la connaitre : `app/` ne
   * pose `miseAJourPrete` a vrai qu'au repos, et c'est le seul endroit qui sait
   * dans quelle phase la soiree se trouve. Un ecran est une fonction de ses
   * proprietes.
   */
  miseAJourPrete: boolean;
  onMettreAJour: () => void;
  onPiocher: () => void;
  /*
   * PLUS AUCUN CONTROLE DE L'ECRAN NE LE DECLENCHE, et il reste au contrat.
   * Il n'est pas non plus destructure dans le corps, ce qui est la seule
   * facon de le garder sans qu'un rappel jamais appele traine dans une
   * portee. La raison du maintien est ecrite au point ou la section PAQUETS
   * etait rendue, dans le corps du composant.
   */
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
    retourCopie,
    miseAJourPrete,
    onMettreAJour,
    onPiocher,
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

  /*
   * Meme raison, et un etat distinct plutot qu'un seul a trois valeurs : les
   * deux panneaux sont ouverts EN MEME TEMPS, la Confirmation par-dessus le
   * menu qu'elle endort. Un etat unique forcerait a refermer le menu pour
   * ouvrir la demande, et le focus n'aurait plus de declencheur ou revenir.
   */
  const [confirmationOuverte, setConfirmationOuverte] = useState(false);

  const idRaison = useId();

  /*
   * Vrai aussi sur une liste vide, ce qui est le comportement voulu : sans
   * paquet, il n'y a rien a piocher.
   *
   * INATTEIGNABLE AUJOURD'HUI, et la branche reste. Depuis le retrait de la
   * section PAQUETS, plus aucun geste ne permet de tout decocher, donc le
   * correctif d'audit "PIOCHER est desactive si aucun paquet n'est coche,
   * avec la raison" (design-system.md section 4) ne peut plus se declencher.
   * Il redevient atteignable le jour ou le paquet maison rend le selecteur.
   * L'effacer maintenant reviendrait a le reecrire ce jour-la, c'est-a-dire a
   * le perdre : un correctif d'audit supprime est un correctif a redecouvrir.
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
       * ICI SE RENDAIT LA SECTION PAQUETS, ET SON ABSENCE N'EST PAS UN OUBLI.
       * Un seul paquet existe, `general`, et docs/tokens-et-composants.md le
       * dit deja : "Chip est en sommeil tant qu'un seul paquet existe, un
       * selecteur a une option etant un controle qui ne peut rien faire." Un
       * groupe d'une seule pilule occupait la couche secondaire de l'ecran
       * pour n'offrir aucun choix.
       *
       * CE QUI DISPARAIT EST LE RENDU D'UN CONTROLE, PAS LA NOTION DE PAQUET
       * ACTIF. Le contrat garde `paquets` et `onBasculerPaquet`, et l'etat de
       * selection sert encore ici meme, a `aucunPaquet` plus bas. Le jour ou
       * le paquet maison arrive, la section revient autour d'un `fieldset`
       * natif dont le `legend` porte une Etiquette de metadonnee, et rien
       * d'autre ne bouge. Retirer les deux champs du contrat obligerait au
       * contraire a rouvrir app/ et screens/types.ts pour rendre a l'ecran une
       * capacite qu'il n'avait jamais perdue.
       */}

      {/*
       * La pile tertiaire, ancree en bord bas. La regle des deux emplacements
       * veut PIOCHER a l'emplacement AU-DESSUS, le compteur occupant le
       * dernier rang (design-system.md, La regle des deux emplacements) : sur
       * l'ecran suivant, ANNONCER LES CHIFFRES prend le dernier rang, et les
       * deux ne se superposent donc pas. Le depart du selecteur de mode ne
       * touche a rien de cet arrangement : il etait en TETE de pile, au-dessus
       * de tout ce que la regle contraint.
       *
       * Tout ce qui s'affiche par intermittence, la raison du blocage et
       * l'action de copie, est place AU-DESSUS de PIOCHER : pose en dessous,
       * il deplacerait le bouton d'avancement d'une soiree a l'autre.
       */}
      <div className={styles.pile}>
        {/*
         * LA PROPOSITION DE MISE A JOUR, EN TETE DE PILE ET NULLE PART
         * AILLEURS. Elle occupe le rang le plus haut des elements
         * intermittents, donc le plus loin de PIOCHER : son apparition ne
         * deplace ni l'action d'avancement ni le compteur, qui gardent les deux
         * emplacements que la regle leur reserve (design-system.md, La regle
         * des deux emplacements).
         *
         * En ghost, parce qu'elle ne fait pas avancer la soiree. Le libelle dit
         * l'effet et non le fait : une version en attente n'interesse personne,
         * ce qui interesse est qu'il y ait quelque chose a faire.
         */}
        {miseAJourPrete && (
          <Bouton variante="ghost" onClick={onMettreAJour}>
            Mettre à jour l'application
          </Bouton>
        )}

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
            {/*
             * UN SEUL MOT COURT, ET LA LONGUEUR EST LE CRITERE, PAS LE TON.
             * Le retour partage la rangee avec un bouton qui peut lire "Copier
             * les 12 signalements", et la rangee ne se replie pas : c'est le
             * BOUTON qui se comprime, et son libelle qui passe sur deux lignes.
             *
             * Mesure au navigateur, 375 px, douze signalements, polices reelles.
             * Rien ne deborde dans aucun des trois cas, ce n'est donc pas le
             * debordement qui tranche :
             *   "Echec"                       statut  66 px, bouton 242, rangee 48
             *   "Copie impossible"            statut 121 px, bouton 198, rangee 50
             *   "Presse-papier indisponible"  statut 150 px, bouton 169, rangee 50
             * La rangee GRANDIT de 2 px des la formule explicite. Or la pile est
             * ancree en bord bas : une rangee qui grandit remonte PIOCHER, a
             * l'instant precis ou le narrateur vient de taper a cote. C'est ce
             * que `.rangCopie` existe pour empecher (Accueil.module.css), et
             * deux pixels suffisent a le defaire.
             *
             * Le rouge est sur les CROCHETS et jamais sur le texte, ce dont le
             * Statut se charge : un echec est une erreur, donc l'un des deux
             * seuls emplois du signal admis par le systeme.
             */}
            {retourCopie === "reussie" && <Statut>Copié</Statut>}
            {retourCopie === "echouee" && <Statut ton="signal">Échec</Statut>}
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
             * LE SELECTEUR DE MODE EST ICI ET NON PLUS EN TERTIAIRE DE
             * L'ECRAN. C'est la decision deja prise pour la consigne
             * permanente, appliquee au seul autre element de l'accueil qui ne
             * servait pas a jouer : l'ecran ne garde que PIOCHER, et tout ce
             * qui s'apprend ou se regle tient dans le menu (design-system.md
             * section 4).
             *
             * Le menu n'existe QUE sur l'accueil, et c'est voulu : pendant un
             * tour, rien ne doit concurrencer l'ecran. Le mode se regle donc
             * au seul endroit ou l'on ne joue pas, qui est aussi le seul
             * moment ou l'on regle un mode d'affichage.
             */}
            <h3 className={styles.titreRubrique}>
              <Etiquette fonction="metadonnee">L'affichage</Etiquette>
            </h3>
            <p className={styles.precision}>
              Auto suit le réglage du téléphone ; sombre et clair le forcent, pour cette application
              seulement.
            </p>
            <Segment
              etiquette="Mode d'affichage"
              options={MODES}
              valeur={mode}
              onChoisir={onChoisirMode}
              className={styles.modes}
            />
          </section>

          <section className={styles.rubrique}>
            {/*
             * REINITIALISER EST ICI ET NON DANS LA PILE TERTIAIRE. Le
             * correctif d'audit exige que l'action soit accessible depuis
             * l'accueil et pas seulement depuis l'ecran d'epuisement, ce que
             * le menu satisfait. Placee en bord bas, une action destructrice
             * irreversible tomberait dans l'arc du pouce, a un rang de
             * PIOCHER, sans rien pour rattraper le geste.
             *
             * Les deux taps du menu ne sont plus la seule garde : le bouton
             * ouvre desormais une Confirmation, plus bas.
             */}
            <h3 className={styles.titreRubrique}>
              <Etiquette fonction="metadonnee">L'historique</Etiquette>
            </h3>
            <p className={styles.precision}>
              Le téléphone retient les questions déjà posées pour ne pas les reposer. Si tu joues
              avec un autre groupe, réinitialise : sinon l'application continue d'écarter des
              questions que personne autour de la table n'a entendues.
            </p>
            <Bouton
              variante="secondaire"
              className={styles.action}
              onClick={() => setConfirmationOuverte(true)}
            >
              Réinitialiser l'historique
            </Bouton>
          </section>
        </div>
      </Feuille>

      {/*
       * LA CONFIRMATION EST VOISINE DU MENU, PAS SON ENFANT. Les deux se
       * portent par un portail en fin de `<body>` : la Confirmation ouverte
       * arrive donc APRES le menu dans le document, l'endort avec `inert`
       * comme le reste, peint au-dessus sans qu'aucun `z-index` n'existe, et
       * rend le focus a l'endroit du menu d'ou il etait parti, le bouton
       * ci-dessus. L'imbriquer dans la Feuille du menu ferait l'inverse :
       * `inert` est herite, et le menu endormi endormirait la demande qu'il
       * vient d'ouvrir.
       *
       * Le libelle d'action dit ce qui arrive et non a quoi l'on consent, ce
       * que le type de la Confirmation impose. Il dit "Effacer" la ou le
       * declencheur dit "Reinitialiser", et l'ecart est voulu : le declencheur
       * nomme l'intention du narrateur, la confirmation nomme l'effet.
       *
       * LES MOTS NE SONT PLUS ECRITS ICI. L'ecran d'epuisement pose desormais
       * la meme question, et deux redactions d'un meme effacement divergeraient
       * sans que rien ne le signale : elles vivent dans ./types.ts, qui porte
       * la raison.
       *
       * LE MENU RESTE OUVERT DERRIERE. Le refermer d'un meme geste
       * demonterait le bouton auquel la Confirmation rend le focus, et le
       * ferait retomber sur `<body>`. Le narrateur ferme lui-meme et retrouve
       * le compteur remis a plein, qui est le seul accuse de reception dont
       * l'action ait besoin.
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
