import { type ReactNode, useCallback, useEffect, useMemo, useReducer, useState } from "react";
import CORPUS from "../data/cartes.gen.json";
import { Accueil } from "../screens/Accueil";
import { Niveau } from "../screens/Niveau";
import { Question } from "../screens/Question";
import { Reponse } from "../screens/Reponse";
import { Theme } from "../screens/Theme";
import {
  LIBELLE_PAQUET,
  MODES_AFFICHAGE,
  type ModeAffichage,
  type PaquetActif,
} from "../screens/types";
import { ecrireMode, lireMode } from "../storage/reglages";
import styles from "./App.module.css";
import { Epuisement } from "./Epuisement";
import { useGesteDeRetour } from "./navigation";
import {
  avancer,
  type Commande,
  type EtatPartie,
  estSignalee,
  etatInitial,
  type Geste,
  nombreDeCartesRestantes,
  paquetsDuCorpus,
  rangDansLeCorpus,
  signalementsEnJson,
} from "./partie";

/*
 * Diez : la composition, seule couche sans restriction d'import.
 *
 * TOUT CE QU'UN ECRAN N'A PAS LE DROIT DE FAIRE VIT ICI, et c'est la raison
 * d'etre de ce fichier : le corpus, l'horloge, l'aleatoire, le stockage, le
 * presse-papier, l'attribut de mode sur la racine du document et l'historique
 * du navigateur. Un ecran est une fonction de ses proprietes ; ce qu'il lui
 * faut descend d'ici (architecture.md section 3).
 *
 * P3 SE LIT DANS LE RENDU CI-DESSOUS. Chaque ecran recoit exactement ce que sa
 * phase porte, parce qu'il ne recoit rien d'autre que des champs de `EtatTour`.
 * Aucun ecran ne voit le corpus, aucun ne voit l'historique, aucun ne recoit de
 * `Carte` entiere : le typage refuse les trois (domain/types.ts).
 *
 * CE QUI N'EST PAS ENCORE LA, ET QUI EST DE LA PHASE 5. L'historique, les
 * signalements et le tour en cours vivent EN MEMOIRE : un rechargement de page
 * perd l'anti-repetition, donc des questions deja posees peuvent revenir, et un
 * tour en cours est perdu. Le maintien de l'ecran allume, le verrouillage en
 * portrait, la proposition de mise a jour du service worker et la reprise apres
 * interruption ne sont pas cables non plus (architecture.md sections 7 et 10).
 * Seul le mode d'affichage est persiste, parce qu'un selecteur de preference
 * qui ne survit pas au rechargement n'est pas une preference.
 */

/*
 * Le corpus et la liste des paquets sont fixes pour toute la duree de
 * l'execution : les calculer au niveau du module plutot que dans le composant
 * evite de refaire a chaque rendu un travail dont le resultat ne peut pas
 * changer.
 */
const PAQUETS_DU_CORPUS = paquetsDuCorpus(CORPUS);

/*
 * Le reducteur est declare ICI, au niveau du module, et non en fonction
 * flechee au point d'appel : `useReducer` doit recevoir la meme fonction d'un
 * rendu a l'autre. Il ne fait que fournir le corpus a `avancer`, qui porte
 * toute la logique et reste pur, donc rejouable en test sans React.
 */
function reduirePartie(etat: EtatPartie, commande: Commande): EtatPartie {
  return avancer(CORPUS, etat, commande);
}

function estMode(valeur: string): valeur is ModeAffichage {
  return MODES_AFFICHAGE.some((connu) => connu === valeur);
}

export function App() {
  const [partie, commander] = useReducer(reduirePartie, PAQUETS_DU_CORPUS, etatInitial);
  const [mode, setMode] = useState<ModeAffichage>(() => lireMode(estMode, "auto"));

  /*
   * Le retour de copie ne vit pas dans `EtatPartie` : l'ecriture du
   * presse-papier est asynchrone et peut echouer, donc elle n'a pas sa place
   * dans un reducteur pur. Il est remis a faux au premier geste suivant, ce
   * qui evite un `[ COPIE ]` qui survivrait a ce qu'il confirmait.
   */
  const [copie, setCopie] = useState(false);

  /*
   * LE SEUL POINT OU L'HORLOGE ET L'ALEATOIRE SONT LUS. Les deux sont lus au
   * moment du geste et transmis en valeur : le reducteur reste pur, donc
   * insensible au double appel que React lui inflige en developpement pour
   * debusquer justement ce genre de lecture.
   */
  const jouer = useCallback((geste: Geste) => {
    setCopie(false);
    commander({ geste, maintenant: Date.now(), tirage: Math.random() });
  }, []);

  /*
   * `auto` est l'ABSENCE d'attribut : la bascule manuelle gagne dans les deux
   * sens parce que `data-mode` force `color-scheme`, et le retirer rend la
   * main au systeme (tokens.css). L'attribut est pose ici et non sur l'accueil,
   * ou vit pourtant le selecteur : le mode vaut pour les cinq ecrans, alors que
   * l'accueil est demonte des la premiere pioche.
   */
  useEffect(() => {
    const racine = document.documentElement;
    if (mode === "auto") racine.removeAttribute("data-mode");
    else racine.setAttribute("data-mode", mode);
  }, [mode]);

  const choisirMode = useCallback((choisi: ModeAffichage) => {
    setMode(choisi);
    ecrireMode(choisi);
  }, []);

  const copierSignalements = useCallback(() => {
    /*
     * Le typage declare le presse-papier toujours present, le navigateur non :
     * hors contexte securise, `navigator.clipboard` est absent. Sans cette
     * garde, le geste leverait une TypeError au lieu de ne rien faire.
     */
    if (!navigator.clipboard) return;
    setCopie(false);
    navigator.clipboard.writeText(signalementsEnJson(partie.signalements)).then(
      () => setCopie(true),
      /*
       * L'echec est SILENCIEUX aujourd'hui, et c'est une dette assumee : le
       * retour n'a que deux etats, donc rien ne distingue "pas encore copie"
       * de "copie impossible". Le narrateur retape, ce qui ne casse rien.
       */
      () => setCopie(false),
    );
  }, [partie.signalements]);

  const paquets: readonly PaquetActif[] = useMemo(
    () =>
      PAQUETS_DU_CORPUS.map((identifiant) => ({
        id: identifiant,
        libelle: LIBELLE_PAQUET[identifiant],
        actif: partie.paquets.includes(identifiant),
      })),
    [partie.paquets],
  );

  const tour = partie.tour;

  /*
   * LE GESTE DE RETOUR DU TELEPHONE, phase par phase. La table des transitions
   * autorisees decide, et elle n'en offre qu'UNE SEULE qui recule
   * (architecture.md section 5).
   *
   * NIVEAU : retour au theme, la vraie.
   * QUESTION : absorbe SANS EFFET et EN SILENCE, c'est la specification.
   * THEME et REPONSE : absorbes aussi, faute de transition vers l'arriere. Un
   * retour depuis THEME ne peut mener nulle part, et un retour depuis REPONSE
   * ne peut pas "de-reveler" la reponse.
   *
   * Absorber n'est pas ne rien faire : le module de navigation a intercepte le
   * geste, donc l'application ne s'est pas fermee, ce qui est tout l'objet.
   */
  const surRetour = useCallback(() => {
    if (tour.phase === "NIVEAU") jouer({ type: "retour" });
  }, [tour.phase, jouer]);

  useGesteDeRetour(tour.phase !== "REPOS", surRetour);

  function ecranDeLaPhase(): ReactNode {
    switch (tour.phase) {
      case "REPOS":
        if (partie.epuise)
          return <Epuisement onReinitialiser={() => jouer({ type: "reinitialiser" })} />;
        return (
          <Accueil
            cartesRestantes={nombreDeCartesRestantes(CORPUS, partie)}
            paquets={paquets}
            signalements={partie.signalements.length}
            mode={mode}
            copie={copie}
            onChoisirMode={choisirMode}
            onPiocher={() => jouer({ type: "piocher" })}
            onBasculerPaquet={(identifiant) =>
              jouer({ type: "basculerPaquet", paquet: identifiant })
            }
            onReinitialiser={() => jouer({ type: "reinitialiser" })}
            onCopierSignalements={copierSignalements}
          />
        );

      case "THEME":
        return (
          /*
           * Le rang est calcule ICI et descend en propriete, comme tout ce
           * qu'un ecran ne peut pas etablir lui-meme. `Theme` ne recoit qu'un
           * `ResumeCarte`, or ce numero n'existe qu'au niveau du corpus entier
           * (partie.ts, qui porte la raison et la condition de stabilite).
           */
          <Theme
            carte={tour.carte}
            rang={rangDansLeCorpus(CORPUS, tour.carte.id)}
            onAnnoncer={() => jouer({ type: "annoncer" })}
          />
        );

      case "NIVEAU":
        return (
          <Niveau
            carte={tour.carte}
            consommes={tour.consommes}
            onChoisir={(niveau) => jouer({ type: "choisir", niveau })}
            onRetour={() => jouer({ type: "retour" })}
          />
        );

      case "QUESTION":
        return (
          <Question
            carte={tour.carte}
            enonce={tour.enonce}
            onReveler={() => jouer({ type: "reveler" })}
          />
        );

      case "REPONSE":
        return (
          <Reponse
            carte={tour.carte}
            enonce={tour.enonce}
            reponse={tour.reponse}
            signalee={estSignalee(partie.signalements, tour.carte.id, tour.enonce.niveau)}
            onSuivante={() => jouer({ type: "suivante" })}
            onTerminer={() => jouer({ type: "terminer" })}
            onSignaler={() => jouer({ type: "signaler" })}
          />
        );
    }
  }

  /*
   * L'epuisement est un ecran a part entiere alors qu'il partage la phase
   * REPOS : sans cette distinction, la cle ne changerait pas en y entrant et le
   * fondu n'aurait pas lieu.
   */
  const nomEcran = partie.epuise && tour.phase === "REPOS" ? "EPUISEMENT" : tour.phase;

  return (
    /*
     * LA ZONE DE PHASE, ET SA REGION LIVE. Le parcours change d'ecran sans
     * rechargement, donc rien ne le signale a un lecteur d'ecran : un
     * conteneur en `aria-live="polite"` autour de la zone suffit
     * (design-system.md section 9).
     *
     * Elle est POSEE ICI ET NULLE PART AILLEURS, pour la raison que les cinq
     * ecrans ont chacun ecrite de leur cote : une region live montee en meme
     * temps que son contenu n'est pas annoncee de facon fiable, il faut donc
     * qu'elle survive au changement d'ecran. C'est aussi pourquoi le `div` qui
     * la porte n'est PAS celui que la cle remonte.
     *
     * Un `div` et non un `main` : les ecrans portent deja leur propre landmark,
     * et deux `main` imbriques ne sont pas du HTML valide.
     */
    <div className={styles.phase} aria-live="polite">
      {/*
       * La cle REMONTE l'ecran a chaque changement de phase, ce qui relance le
       * fondu et remet a zero l'etat local des ecrans, la designation de la
       * molette au premier chef.
       */}
      <div key={nomEcran} className={styles.transition}>
        {ecranDeLaPhase()}
      </div>
    </div>
  );
}
