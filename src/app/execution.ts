/*
 * Diez : les comportements d'execution (architecture.md section 10).
 *
 * TROIS COMPORTEMENTS QUI NE SE VOIENT QUE QUAND ILS MANQUENT. L'ecran qui
 * s'eteint pendant qu'on debat, la mise a jour qui recharge au milieu d'une
 * phrase, le telephone qui bascule en paysage : aucun des trois n'apparait en
 * demonstration, les trois apparaissent en soiree. Le narrateur etant le point
 * de defaillance unique de la table (architecture.md section 7), un incident
 * sur son telephone est un incident pour tout le monde.
 *
 * CE FICHIER NE DECIDE JAMAIS DU MOMENT. Il expose des hooks qui rendent un
 * etat et des gestes ; c'est `App.tsx` qui sait dans quelle phase la soiree se
 * trouve, et lui seul. Aucun composant n'est monte ici, aucun texte n'est
 * ecrit, aucune interface n'est proposee.
 *
 * CHAQUE COMPORTEMENT EST EN DEUX MORCEAUX, et ce n'est pas une preference de
 * style : une fabrique PURE qui porte toute la logique, puis un hook de dix
 * lignes qui la branche sur le navigateur. La fabrique se rejoue sans DOM, avec
 * un faux navigateur, ce qui est la seule facon de prouver ce qui suit sans un
 * telephone sous la main. La regle est celle du domaine, pour la meme raison :
 * ce dont la logique a besoin lui est INJECTE (conventions-code.md section 3).
 */

import { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------------ */
/* 1. LE MAINTIEN DE L'ECRAN ALLUME                                          */
/* ------------------------------------------------------------------------ */

/*
 * Entre la lecture de la question et le verdict du groupe il s'ecoule
 * facilement une minute, pendant laquelle personne ne touche l'ecran. Le
 * telephone se met en veille, et c'est celui du narrateur.
 *
 * Le verrou est maintenu dans TOUTE PHASE AUTRE QUE REPOS et relache au retour
 * au repos : sur l'accueil, l'application n'a aucune raison d'empecher un
 * telephone de s'eteindre.
 */

/**
 * La part de `WakeLockSentinel` dont depend ce module, redeclaree.
 *
 * Elle l'est pour la meme raison que `storage/` redeclare la forme qu'il
 * valide : la fabrique ci-dessous doit pouvoir recevoir un faux, et un faux qui
 * doit satisfaire l'interface complete du navigateur n'est plus un faux qu'on
 * ecrit en trois lignes dans une sonde. `WakeLockSentinel` reste assignable a
 * cette forme, le typage structurel s'en charge.
 */
export type SentinelleDeMaintien = {
  /** Passe a vrai des que le navigateur reprend le verrou, seul ou sur demande. */
  readonly released: boolean;
  release(): Promise<void>;
};

/** Demander le verrou. Rend une promesse qui peut ETRE REFUSEE, voir plus bas. */
export type DemandeDeMaintien = () => Promise<SentinelleDeMaintien>;

/**
 * Le maintien, reconcilie a partir de deux faits et d'aucun autre : ce que la
 * phase demande, et si le document est visible.
 *
 * Les deux methodes rendent une promesse pour que les sondes puissent attendre
 * la fin du travail ; l'appelant reel les ignore, il n'a rien a en faire.
 */
export type Maintien = {
  /** L'ecran doit-il rester allume ? Faux relache le verrou. */
  viser(actif: boolean): Promise<void>;
  /** Le document vient de passer visible, ou de passer en arriere-plan. */
  signalerVisibilite(visible: boolean): Promise<void>;
  /** Le verrou est-il reellement tenu ? N'existe que pour les sondes. */
  tenu(): boolean;
};

/**
 * La demande du navigateur, ou `null` si l'API n'existe pas.
 *
 * Le typage declare `navigator.wakeLock` toujours present, le navigateur non :
 * hors contexte securise, ou sur un navigateur qui ne l'implemente pas, la
 * propriete est absente. C'est le meme ecart, et la meme garde, que pour le
 * presse-papier dans `App.tsx`.
 */
export function demandeDeMaintienDuNavigateur(): DemandeDeMaintien | null {
  if (!navigator.wakeLock) return null;
  const verrou = navigator.wakeLock;
  return () => verrou.request("screen");
}

/**
 * Fabrique le maintien de l'ecran allume.
 *
 * `demander` a `null` rend un maintien qui ne fait RIEN, sans rien signaler.
 * C'est le repli exige par architecture.md section 10 : le maintien est un
 * confort, jamais une dependance, donc son absence ne doit produire ni
 * exception, ni message, ni degradation visible.
 */
export function creerMaintien(demander: DemandeDeMaintien | null): Maintien {
  let cible = false;
  let visible = true;
  let sentinelle: SentinelleDeMaintien | null = null;

  const tenu = () => sentinelle !== null && !sentinelle.released;

  /*
   * UNE SEULE FONCTION DE RECONCILIATION, jamais un couple prendre et rendre.
   * Le meme motif que la garde d'historique de `navigation.ts`, pour une raison
   * voisine : les demandes arrivent d'endroits qui s'ignorent, un changement de
   * phase et un changement de visibilite, et chacune doit pouvoir se contenter
   * de dire ce qu'elle sait avant de laisser l'etat decider.
   *
   * ELLE NE REJETTE JAMAIS. C'est ce qui permet a la file ci-dessous d'etre une
   * simple chaine de promesses : un rejet non traite l'empoisonnerait pour le
   * reste de la soiree.
   */
  async function accorder(): Promise<void> {
    if (cible && visible) {
      if (demander === null || tenu()) return;
      try {
        sentinelle = await demander();
      } catch {
        /*
         * REPLI SILENCIEUX, deuxieme cas. Le navigateur refuse la demande quand
         * le document n'est pas visible, quand la batterie est au plus bas, ou
         * par politique. Rien a signaler au narrateur : il n'y peut rien, et le
         * jeu fonctionne sans.
         */
        sentinelle = null;
      }
      return;
    }

    const rendue = sentinelle;
    sentinelle = null;
    if (rendue === null) return;
    try {
      await rendue.release();
    } catch {
      /* Relacher deux fois est sans effet ; echouer a relacher n'a rien a dire. */
    }
  }

  /*
   * Les demandes sont mises en FILE et jamais menees en parallele. Sans elle,
   * deux changements rapproches, ce que produit exactement un enchainement de
   * phases, lanceraient deux `request` concurrentes : la seconde reviendrait
   * apres la premiere, ecraserait la reference, et le verrou de la premiere ne
   * serait plus relache par personne.
   */
  let file: Promise<void> = Promise.resolve();
  function enchainer(): Promise<void> {
    file = file.then(accorder);
    return file;
  }

  return {
    viser(actif) {
      cible = actif;
      return enchainer();
    },
    signalerVisibilite(estVisible) {
      /*
       * LE PIEGE DE CE COMPORTEMENT, ET IL EST SILENCIEUX. Un verrou de veille
       * est PERDU des que le document passe en arriere-plan, et le navigateur
       * ne le rend pas de lui-meme au retour. Sans cette reprise, le maintien
       * marche a la premiere question et plus jamais ensuite : il suffit que le
       * narrateur regarde une notification une fois dans la soiree.
       *
       * La reference est laissee tomber en meme temps, sinon `tenu()` croirait
       * detenir un verrou que le navigateur a repris et ne redemanderait rien.
       */
      visible = estVisible;
      return enchainer();
    },
    tenu,
  };
}

/**
 * Abonne `signaler` aux changements de visibilite, et rend de quoi se desabonner.
 *
 * EXTRAITE DU HOOK POUR ETRE TESTABLE, et pas par gout de l'abstraction : le
 * hook lit `document`, donc son cablage etait hors de portee d'un test sans DOM.
 * Mesure qui a motive l'extraction : remplacer l'inscription de l'ecouteur par
 * son retrait laissait les 241 tests verts, alors que le maintien de l'ecran
 * aurait cesse de se reprendre apres le premier passage en arriere-plan. Il
 * aurait donc marche a la premiere question et plus jamais ensuite, sur le
 * telephone dont depend toute la table.
 *
 * L'etat de depart est LU et non suppose : une application restauree depuis un
 * onglet d'arriere-plan se monte alors que le document est cache, et une demande
 * faite dans cet etat est refusee. Elle serait rattrapee par le premier
 * changement de visibilite, mais au prix d'un refus qu'on peut ne pas provoquer.
 */
export function abonnerALaVisibilite(
  cible: Pick<Document, "addEventListener" | "removeEventListener">,
  lireVisibilite: () => boolean,
  signaler: (visible: boolean) => void,
): () => void {
  const surVisibilite = () => signaler(lireVisibilite());
  surVisibilite();
  cible.addEventListener("visibilitychange", surVisibilite);
  return () => cible.removeEventListener("visibilitychange", surVisibilite);
}

/**
 * Maintient l'ecran allume tant que `actif` est vrai.
 *
 * Appel attendu : `useEcranAllume(tour.phase !== "REPOS")`.
 */
export function useEcranAllume(actif: boolean): void {
  const maintienCourant = useRef<Maintien | null>(null);

  useEffect(() => {
    const maintien = creerMaintien(demandeDeMaintienDuNavigateur());
    maintienCourant.current = maintien;

    const desabonner = abonnerALaVisibilite(
      document,
      () => document.visibilityState === "visible",
      (visible) => {
        void maintien.signalerVisibilite(visible);
      },
    );

    return () => {
      desabonner();
      maintienCourant.current = null;
      void maintien.viser(false);
    };
  }, []);

  /*
   * Le maintien est cree UNE FOIS et la phase le vise ensuite : le recreer a
   * chaque changement de phase relacherait puis redemanderait le verrou entre
   * THEME et NIVEAU, donc quatre fois par tour, alors que la specification
   * demande un verrou tenu d'un bout a l'autre du tour.
   */
  useEffect(() => {
    void maintienCourant.current?.viser(actif);
  }, [actif]);
}

/* ------------------------------------------------------------------------ */
/* 2. LA STRATEGIE DE MISE A JOUR                                            */
/* ------------------------------------------------------------------------ */

/*
 * La moitie deja posee est dans `vite.config.ts` : `registerType: "prompt"`,
 * jamais `autoUpdate`. Verifie dans le client livre par le plugin, et non
 * suppose : en mode `prompt`, rien ne recharge la page tant que personne
 * n'appelle la fonction de mise a jour. Le plugin se contente d'appeler
 * `onNeedRefresh` quand une nouvelle version attend.
 *
 * La moitie manquante est ici, et elle est visible : la proposition n'est
 * presentee QU'EN PHASE REPOS. Une application de soiree n'a aucune raison de
 * se mettre a jour pendant qu'on joue, et appliquer la mise a jour RECHARGE LA
 * PAGE, ce qui ferait disparaitre la carte au milieu d'une phrase.
 */

/** Ce que rend la fonction d'inscription : applique la mise a jour en attente. */
export type AppliquerLaMiseAJour = () => Promise<void>;

/**
 * La part de `registerSW` (`virtual:pwa-register`) dont depend ce module.
 *
 * Elle est INJECTEE et non importee, pour une raison mesurable : le module
 * `virtual:pwa-register` n'existe que sous Vite, donc l'importer ici rendrait
 * ce fichier illisible par Vitest et par tout ce qui n'est pas un build. Le
 * cablage tient en une ligne dans `App.tsx`, ou l'import est legitime.
 */
export type InscrireLeServiceWorker = (rappels: {
  onNeedRefresh: () => void;
}) => AppliquerLaMiseAJour;

/** Le relais entre le service worker et la phase courante. */
export type RelaisDeMiseAJour = {
  /** Inscrit le service worker. Idempotent : deux appels n'inscrivent qu'une fois. */
  demarrer(): void;
  /** Une nouvelle version attend-elle ? Independant de la phase. */
  prete(): boolean;
  /** Applique la proposition. SANS EFFET si aucune n'attend. */
  appliquer(): void;
};

/**
 * Ce qu'un ecran a besoin de savoir, et rien de plus.
 *
 * `attend` porte DEJA la regle de phase : il ne vaut vrai qu'au repos. Un
 * appelant qui affiche sa proposition quand `attend` est vrai est correct par
 * construction, sans avoir a connaitre la regle.
 */
export type PropositionDeMiseAJour = {
  readonly attend: boolean;
  readonly appliquer: () => void;
};

/**
 * Fabrique le relais.
 *
 * `inscrire` a `null` rend un relais qui ne propose jamais rien : c'est le cas
 * d'un contexte sans service worker, et il ne merite pas d'etre signale.
 * `prevenir` est le seul lien vers React, et il est appele une seule fois, au
 * moment ou une version se met a attendre.
 */
export function creerRelaisDeMiseAJour(
  inscrire: InscrireLeServiceWorker | null,
  prevenir: () => void,
): RelaisDeMiseAJour {
  let appliquerVraiment: AppliquerLaMiseAJour | null = null;
  let prete = false;
  let demarre = false;

  return {
    demarrer() {
      /*
       * L'idempotence n'est pas une precaution de style : React monte, demonte
       * puis remonte les effets en developpement pour debusquer les traitements
       * qui ne la respectent pas, et une seconde inscription poserait un second
       * jeu d'ecouteurs sur le meme service worker.
       */
      if (demarre || inscrire === null) return;
      demarre = true;
      appliquerVraiment = inscrire({
        onNeedRefresh: () => {
          prete = true;
          prevenir();
        },
      });
    },

    prete: () => prete,

    appliquer() {
      /*
       * Rien a appliquer tant que rien n'attend. Ce n'est pas une garde de
       * confort : appeler la fonction du plugin sans version en attente ne fait
       * rien de visible, mais l'appelant croirait avoir agi.
       */
      if (!prete || appliquerVraiment === null) return;
      void appliquerVraiment();
    },
  };
}

/**
 * LA REGLE DE PHASE, ISOLEE ICI POUR ETRE REJOUABLE SANS REACT.
 *
 * Elle tient en une ligne et c'est pourtant la moitie visible du comportement,
 * donc elle est ecrite une seule fois, a un seul endroit, et prouvee : une
 * version prete n'est proposee qu'au repos.
 *
 * `appliquer` repose la meme condition au lieu de faire confiance a l'appelant.
 * Ce n'est pas de la redondance : un bouton rendu au repos puis presse pendant
 * que la phase a change rechargerait la page en pleine question. La proposition
 * ne s'applique que tant qu'elle est PRESENTEE.
 */
export function proposer(
  prete: boolean,
  auRepos: boolean,
  appliquer: () => void,
): PropositionDeMiseAJour {
  const attend = prete && auRepos;
  return {
    attend,
    appliquer: () => {
      if (!attend) return;
      appliquer();
    },
  };
}

/**
 * Propose la mise a jour, mais seulement au repos.
 *
 * Appel attendu : `useMiseAJour(tour.phase === "REPOS", registerSW)`.
 *
 * LE MOMENT RESTE A L'APPELANT, ce hook ne fait qu'appliquer la seule regle
 * ecrite : une version qui arrive en pleine partie est RETENUE, et la
 * proposition apparait au retour au repos. Elle n'est pas perdue, elle attend.
 */
export function useMiseAJour(
  auRepos: boolean,
  inscrire: InscrireLeServiceWorker | null,
): PropositionDeMiseAJour {
  const [prete, setPrete] = useState(false);
  const relais = useRef<RelaisDeMiseAJour | null>(null);

  useEffect(() => {
    if (relais.current === null) {
      relais.current = creerRelaisDeMiseAJour(inscrire, () => setPrete(true));
    }
    relais.current.demarrer();
  }, [inscrire]);

  return proposer(prete, auRepos, () => relais.current?.appliquer());
}

/* ------------------------------------------------------------------------ */
/* 3. L'ORIENTATION                                                          */
/* ------------------------------------------------------------------------ */

/*
 * AUCUN CODE ICI, ET C'EST LE SUJET.
 *
 * `"orientation": "portrait"` est declare dans le manifest (`vite.config.ts`)
 * et c'est le seul dispositif que prevoit architecture.md section 10. Ce qu'il
 * couvre reellement, verifie plutot que suppose :
 *
 * - il ne vaut que pour une PWA INSTALLEE, lancee en `standalone` ou en plein
 *   ecran. C'est bien le cas vise, le narrateur installant l'application depuis
 *   Pages (roadmap.md, phase 1) ;
 * - dans un ONGLET de navigateur, il ne s'applique pas. La page tourne avec le
 *   telephone et le manifest n'y peut rien ;
 * - `screen.orientation.lock` n'est pas la parade : il exige le plein ecran la
 *   ou le manifest ne suffit pas, et il echoue donc exactement dans le cas
 *   qu'il pretendrait couvrir. Un verrou qui n'est tenu que la ou il est deja
 *   inutile vaut moins que rien, puisqu'il ferait croire le probleme regle.
 *
 * Consequence pour la recette (recette.md section 1, "Rotation en paysage :
 * impossible") : ce controle ne se passe QUE sur l'application installee. Sur
 * un onglet il ne peut pas passer, et ce n'est pas un defaut a corriger ici.
 */
