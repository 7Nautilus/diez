import { registerSW } from "virtual:pwa-register";
import { type ReactNode, useCallback, useEffect, useMemo, useReducer, useState } from "react";
import CORPUS from "../data/cartes.gen.json";
import type { Carte, PaquetId } from "../domain/types";
import { TOUR_PERIME_H } from "../domain/types";
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
  type RetourCopie,
} from "../screens/types";
import { ecrireHistorique, lireHistorique } from "../storage/historique";
import { ecrireMode, ecrirePaquetsActifs, lireMode, lirePaquetsActifs } from "../storage/reglages";
import { ecrireSignalements, lireSignalements } from "../storage/signalements";
import { ecrireTour, lireTour } from "../storage/tour";
import styles from "./App.module.css";
import { Epuisement } from "./Epuisement";
import { type InscrireLeServiceWorker, useEcranAllume, useMiseAJour } from "./execution";
import { useGesteDeRetour } from "./navigation";
import {
  avancer,
  type Commande,
  type EtatPartie,
  estSignalee,
  etatRepris,
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
 * presse-papier, l'attribut de mode sur la racine du document, l'historique du
 * navigateur, le verrou de veille et le service worker. Un ecran est une
 * fonction de ses proprietes ; ce qu'il lui faut descend d'ici
 * (architecture.md section 3).
 *
 * P3 SE LIT DANS LE RENDU CI-DESSOUS. Chaque ecran recoit exactement ce que sa
 * phase porte, parce qu'il ne recoit rien d'autre que des champs de `EtatTour`.
 * Aucun ecran ne voit le corpus, aucun ne voit l'historique, aucun ne recoit de
 * `Carte` entiere : le typage refuse les trois (domain/types.ts).
 *
 * P3 TIENT AUSSI DANS LE STOCKAGE DEPUIS LA PHASE 5, et c'est le point qu'il
 * fallait mesurer plutot que supposer. Ce qui est ecrit sous `diez:v1:tour` est
 * l'`EtatTour` lui-meme : en phase QUESTION il ne porte pas de reponse, donc la
 * clef n'en porte pas non plus. Une fuite la serait pire qu'une fuite en
 * memoire, puisqu'elle survivrait a la fermeture de l'application ; le banc de
 * recette affiche le contenu reel des quatre clefs pour que le controle se
 * fasse en le lisant, et non en relisant ce commentaire.
 */

/*
 * LE CORPUS EST UN PARAMETRE ET NON PLUS UN IMPORT FIGE, avec le corpus de
 * production pour defaut. C'est ce qui permet au banc de recette de monter la
 * meme application sur les deux cartes de fixture, que le compilateur ecarte de
 * la production par leur paquet (architecture.md section 8) : sans cela,
 * docs/recette.md section 1 exigeait un parcours niveau par niveau sur des
 * cartes qu'aucun chemin ne pouvait atteindre.
 *
 * Le defaut garde `<App />` ecrivable tel quel dans main.tsx, qui est le seul
 * point d'entree construit.
 */
export type ProprietesApp = {
  corpus?: readonly Carte[];
};

/**
 * Le pont vers le service worker, fabrique ICI et une seule fois.
 *
 * `registerSW` vient de `virtual:pwa-register`, un module qui n'existe que sous
 * Vite : execution.ts ne peut pas l'importer sans devenir illisible par Vitest,
 * d'ou l'injection (execution.ts, `InscrireLeServiceWorker`).
 *
 * `true` demande le RECHARGEMENT DE LA PAGE, ce qui est tout l'objet du geste :
 * une nouvelle version qui attend ne devient la version courante qu'apres. Le
 * moment reste decide ailleurs, et il n'y en a qu'un, la phase REPOS.
 *
 * Au niveau du module, parce que l'inscription doit etre idempotente d'un rendu
 * a l'autre : une identite qui change relancerait l'effet qui inscrit.
 */
const INSCRIRE: InscrireLeServiceWorker = (rappels) => {
  const appliquer = registerSW(rappels);
  return () => appliquer(true);
};

function estMode(valeur: string): valeur is ModeAffichage {
  return MODES_AFFICHAGE.some((connu) => connu === valeur);
}

/**
 * L'etat d'ouverture, relu du stockage et confronte au corpus.
 *
 * LES QUATRE CLEFS SONT LUES ICI ET NULLE PART AILLEURS, au moment ou le
 * reducteur recoit son etat initial. C'est le pendant exact des quatre effets
 * d'ecriture plus bas, et le couple lecture-ecriture n'est pas qu'une symetrie
 * de confort : c'est lui qui maintient l'accord entre les formes redeclarees
 * par `storage/` et les types du domaine. `storage/` n'important rien, les deux
 * declarations ne sont liees par rien d'autre que ce point de cablage, et une
 * clef qui ne serait plus que LUE laisserait la moitie du controle tomber sans
 * que rien ne le signale (storage/validation.ts, en-tete).
 *
 * `TOUR_PERIME_H` se passe EN HEURES : la conversion en millisecondes vit dans
 * `storage/`, et aucun nombre nu n'apparait ici (conventions-code.md section 6).
 */
function amorcer(corpus: readonly Carte[]): EtatPartie {
  const paquets = paquetsDuCorpus(corpus);
  /*
   * Le vocabulaire des paquets DESCEND vers `storage/`, il n'y est pas
   * redeclare : la liste se deduit du corpus, donc elle change avec lui, et
   * `storage/` n'a pas le droit de l'importer. Un identifiant inconnu est
   * ecarte plutot que de faire retomber la clef entiere (storage/reglages.ts).
   */
  const connu = (valeur: string): valeur is PaquetId =>
    paquets.some((identifiant) => identifiant === valeur);

  return etatRepris(corpus, {
    tour: lireTour(connu, Date.now(), TOUR_PERIME_H),
    historique: lireHistorique(),
    signalements: lireSignalements(),
    paquets: lirePaquetsActifs(connu, paquets),
  });
}

export function App({ corpus = CORPUS }: ProprietesApp) {
  /*
   * Le reducteur ne fait que fournir le corpus a `avancer`, qui porte toute la
   * logique et reste pur, donc rejouable en test sans React. Son identite ne
   * change que si le corpus change, ce qui n'arrive jamais au cours d'une
   * execution : les deux points d'entree le tiennent d'une constante de module.
   */
  const reduirePartie = useCallback(
    (etat: EtatPartie, commande: Commande) => avancer(corpus, etat, commande),
    [corpus],
  );
  const [partie, commander] = useReducer(reduirePartie, corpus, amorcer);
  const [mode, setMode] = useState<ModeAffichage>(() => lireMode(estMode, "auto"));

  /*
   * Le retour de copie ne vit pas dans `EtatPartie` : l'ecriture du
   * presse-papier est asynchrone et peut echouer, donc elle n'a pas sa place
   * dans un reducteur pur. Il est remis a "aucun" au premier geste suivant, ce
   * qui evite un `[ COPIE ]` qui survivrait a ce qu'il confirmait.
   */
  const [retourCopie, setRetourCopie] = useState<RetourCopie>("aucun");

  /*
   * LE SEUL POINT OU L'HORLOGE ET L'ALEATOIRE SONT LUS. Les deux sont lus au
   * moment du geste et transmis en valeur : le reducteur reste pur, donc
   * insensible au double appel que React lui inflige en developpement pour
   * debusquer justement ce genre de lecture.
   */
  const jouer = useCallback((geste: Geste) => {
    setRetourCopie("aucun");
    commander({ geste, maintenant: Date.now(), tirage: Math.random() });
  }, []);

  const tour = partie.tour;

  /*
   * LES QUATRE ECRITURES, UNE PAR CLEF, ET CHACUNE SUR SA SEULE DEPENDANCE.
   *
   * Ecrire depuis un effet plutot que depuis `jouer` n'est pas un detail de
   * style : `diez:v1:tour` doit etre ecrit A CHAQUE TRANSITION (architecture.md
   * section 7), et un appel pose dans le gestionnaire de geste serait a
   * maintenir a chaque nouveau chemin qui touche l'etat. Ici la seule facon de
   * ne pas persister une transition serait de ne pas la produire.
   *
   * `avancer` conserve l'identite des champs qu'il ne modifie pas, et rend
   * l'etat lui-meme quand le geste est rejete : signaler une question n'ecrit
   * donc pas le tour, et un tap absorbe par le verrou n'ecrit rien du tout.
   *
   * Ecrire le tour au REPOS EFFACE la clef, ce dont `storage/` se charge : la
   * clef porte un tour en cours, or REPOS n'en est pas un. C'est ce qui remplit
   * l'exigence "la clef est effacee sur terminer()" sans qu'aucun appelant
   * n'ait a s'en souvenir.
   */
  useEffect(() => {
    ecrireTour(tour, Date.now());
  }, [tour]);

  useEffect(() => {
    ecrireHistorique(partie.historique);
  }, [partie.historique]);

  useEffect(() => {
    ecrireSignalements(partie.signalements);
  }, [partie.signalements]);

  useEffect(() => {
    ecrirePaquetsActifs(partie.paquets);
  }, [partie.paquets]);

  /*
   * L'ECRAN RESTE ALLUME DANS TOUTE PHASE AUTRE QUE REPOS. Entre la lecture de
   * la question et le verdict du groupe il s'ecoule facilement une minute
   * pendant laquelle personne ne touche l'ecran, et c'est le telephone du
   * narrateur, donc celui dont depend toute la table (architecture.md section
   * 10). Sur l'accueil, l'application n'a aucune raison d'empecher un telephone
   * de s'eteindre.
   */
  useEcranAllume(tour.phase !== "REPOS");

  /*
   * LA MISE A JOUR N'EST PROPOSEE QU'EN PHASE REPOS. Appliquer une mise a jour
   * RECHARGE LA PAGE : en pleine question, la carte disparaitrait au milieu
   * d'une phrase. Une version qui arrive pendant la partie n'est pas perdue,
   * elle attend le retour au repos.
   *
   * Limite connue et assumee : l'ecran d'epuisement partage la phase REPOS et
   * ne rend pas la proposition. Elle apparait au retour sur l'accueil, ou la
   * reinitialisation mene toujours.
   */
  const miseAJour = useMiseAJour(tour.phase === "REPOS", INSCRIRE);

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
    setRetourCopie("aucun");
    /*
     * Le typage declare le presse-papier toujours present, le navigateur non :
     * hors contexte securise, `navigator.clipboard` est absent. Sans cette
     * garde, le geste leverait une TypeError au lieu de ne rien faire.
     *
     * L'ABSENCE EST UN ECHEC ANNONCE, plus un silence. C'est le trou que la
     * phase 4 laissait ouvert faute d'un troisieme etat dans le contrat : le
     * narrateur tapait, rien ne bougeait, et il retapait, ce qui est le geste
     * meme que le verrou d'entree existe pour empecher.
     */
    const pressePapier = navigator.clipboard;
    if (!pressePapier) {
      setRetourCopie("echouee");
      return;
    }
    pressePapier.writeText(signalementsEnJson(partie.signalements)).then(
      () => setRetourCopie("reussie"),
      () => setRetourCopie("echouee"),
    );
  }, [partie.signalements]);

  const paquets: readonly PaquetActif[] = useMemo(
    () =>
      paquetsDuCorpus(corpus).map((identifiant) => ({
        id: identifiant,
        libelle: LIBELLE_PAQUET[identifiant],
        actif: partie.paquets.includes(identifiant),
      })),
    [corpus, partie.paquets],
  );

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
            cartesRestantes={nombreDeCartesRestantes(corpus, partie)}
            paquets={paquets}
            signalements={partie.signalements.length}
            mode={mode}
            retourCopie={retourCopie}
            miseAJourPrete={miseAJour.attend}
            onMettreAJour={miseAJour.appliquer}
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
            rang={rangDansLeCorpus(corpus, tour.carte.id)}
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
