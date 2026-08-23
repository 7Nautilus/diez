/*
 * Diez : le geste de retour du telephone, branche sur la machine a etats.
 *
 * LE POINT QUI CASSE UNE SOIREE, ET IL N'EST PAS THEORIQUE. Le telephone reel
 * est un Android, ou le retour est le geste de navigation principal : un
 * balayage depuis le bord, fait sans y penser. En mode `standalone` il n'y a
 * pas de barre d'adresse, donc ce geste FERME L'APPLICATION, en pleine partie,
 * sur le telephone dont depend toute la table. Il faut le brancher sur la
 * machine a etats pour que "retour" signifie etape precedente et jamais
 * quitter (architecture.md section 5).
 *
 * LE PRINCIPE. Une entree d'historique de garde est posee des qu'il y a
 * quelque chose a proteger. Le geste de retour la consomme, le navigateur
 * previent par `popstate` au lieu de fermer, et la garde est reposee aussitot.
 * Ce qu'il faut en faire depend de la situation, et la table `effetDuRetour`
 * en decide seule.
 *
 * UNE SEULE GARDE, ET NON UNE PAR PHASE. Une entree posee a chaque phase
 * s'accumulerait pendant toute la soiree, une vingtaine de tours a quatre
 * phases, et il faudrait alors presser retour quatre-vingts fois pour sortir
 * d'un accueil ou plus rien ne se passe. Le narrateur conclurait que le geste
 * est casse, ce qui est le defaut qu'on repare ici.
 *
 * SUR L'ACCUEIL NU, LA GARDE EST RETIREE ET LE RETOUR SORT DE L'APPLICATION.
 * C'est volontaire : il n'y a pas de partie a proteger, et une application dont
 * on ne peut plus sortir par le geste du systeme est un piege pire que celui
 * qu'on evite. "Nu" est le mot qui manquait : voir `effetDuRetour`.
 *
 * TOUT CE QUI TOUCHE AU NAVIGATEUR EST INJECTE, et c'est la meme regle que
 * pour execution.ts, pour la meme raison mesuree. Ce module n'avait aucun test
 * et n'en etait pas testable : il lisait `history` et `window` directement.
 * Mutation qui passait, et que quelqu'un ecrira le jour ou il voudra "ne pas
 * faire grossir l'historique" : remplacer les deux `history.pushState` par
 * `history.replaceState` laissait `tsc`, Biome, le verificateur et les 286
 * tests VERTS, alors que le premier geste de retour sortait de l'application.
 */

import { useEffect, useRef } from "react";
import type { EtatTour } from "../domain/types";

/*
 * L'entree de garde se reconnait a sa charge. Rien n'en depend aujourd'hui,
 * l'application n'ayant qu'une seule URL, mais une entree d'historique anonyme
 * est indebogable le jour ou quelque chose d'autre en pose une.
 */
const GARDE = { diez: "garde" };

/* ------------------------------------------------------------------------ */
/* 1. CE QUE LE GESTE DOIT FAIRE                                             */
/* ------------------------------------------------------------------------ */

/**
 * Les quatre issues possibles d'un geste de retour.
 *
 * `absorber` n'est pas "ne rien faire" : le module a intercepte le geste, donc
 * l'application ne s'est pas fermee, ce qui est tout l'objet.
 */
export type EffetDuRetour = "fermerLePanneau" | "revenirAuTheme" | "absorber" | "quitter";

/**
 * LA TABLE, ecrite une seule fois et rejouee par les sondes.
 *
 * LE PANNEAU PASSE AVANT TOUT LE RESTE, et c'est le defaut que cette table
 * repare. Le menu et la demande de reinitialisation ne vivent QU'AU REPOS
 * (screens/Accueil.tsx), or la garde n'etait armee que hors du repos : menu
 * ouvert, un balayage depuis le bord sortait de l'application, et en PWA
 * installee il n'y a pas d'entree precedente, donc il la FERMAIT. Le menu est
 * pourtant le seul endroit ou vivent les regles du jeu, le mode d'affichage et
 * la reinitialisation. Mesure faite au navigateur, menu ouvert sur l'accueil :
 * `history.state` valait `null`, donc aucune garde posee, et `history.back()`
 * faisait passer l'URL de `/diez/` a la page precedente.
 *
 * Panneau ouvert, le geste FERME LE PANNEAU et rien d'autre. C'est ce qu'il
 * fait partout ailleurs, et cela rend le balayage utile au lieu de destructeur.
 * Deux panneaux ouverts, c'est celui du DESSUS qui se ferme, ce dont la pile se
 * charge (design/panneaux.ts) : la Confirmation d'abord, le menu ensuite.
 *
 * Sans panneau, la table des transitions decide, et elle n'en offre qu'UNE
 * SEULE qui recule (architecture.md section 5).
 *
 * NIVEAU : retour au theme, la vraie.
 * QUESTION : absorbe SANS EFFET et EN SILENCE, c'est la specification.
 * THEME et REPONSE : absorbes aussi, faute de transition vers l'arriere. Un
 * retour depuis THEME ne peut mener nulle part, et un retour depuis REPONSE ne
 * peut pas "de-reveler" la reponse.
 * REPOS : c'est le seul cas ou l'on quitte, et seulement l'accueil NU.
 */
export function effetDuRetour(phase: EtatTour["phase"], panneauOuvert: boolean): EffetDuRetour {
  if (panneauOuvert) return "fermerLePanneau";
  if (phase === "NIVEAU") return "revenirAuTheme";
  if (phase === "REPOS") return "quitter";
  return "absorber";
}

/**
 * La garde est armee pour tout ce qui n'est pas "quitter".
 *
 * Ecrit ainsi plutot qu'en repetant la condition de phase : les deux ne peuvent
 * pas diverger, alors que deux conditions posees cote a cote le peuvent, et
 * c'est exactement par la que le defaut est entre.
 */
export function gardeArmee(effet: EffetDuRetour): boolean {
  return effet !== "quitter";
}

/* ------------------------------------------------------------------------ */
/* 2. LE NAVIGATEUR, REDUIT A CE DONT CE MODULE DEPEND                       */
/* ------------------------------------------------------------------------ */

/** Poser une entree de garde, et en consommer une. */
export type HistoriqueDuNavigateur = {
  poser(): void;
  revenir(): void;
};

/**
 * Le pont vers l'historique du navigateur.
 *
 * `pushState` ET NON `replaceState`, et c'est le seul endroit du projet ou le
 * choix s'ecrit. `replaceState` ne cree aucune entree : il n'y a alors rien a
 * consommer, le geste de retour passe au travers, et l'application se ferme.
 * C'est la mutation qui passait tout avant que ce module ne soit teste, elle
 * est desormais refusee par son nom (`__tests__/navigation.test.ts`).
 *
 * L'objet arrive EN PARAMETRE : c'est la seule facon de montrer laquelle des
 * deux methodes est appelee sans navigateur sous la main. `replaceState` figure
 * dans le type recu pour que la mutation COMPILE et tombe sur la sonde ; l'en
 * retirer la ferait echouer a la compilation, ce qui protege moins bien, une
 * erreur de type se contournant plus vite qu'un controle qui nomme la regle.
 */
export function historiqueDuNavigateur(
  historique: Pick<History, "pushState" | "replaceState" | "back">,
): HistoriqueDuNavigateur {
  return {
    poser: () => historique.pushState(GARDE, ""),
    revenir: () => historique.back(),
  };
}

/**
 * Abonne `signaler` au geste de retour, et rend de quoi se desabonner.
 *
 * EXTRAITE POUR ETRE TESTABLE, comme `abonnerALaVisibilite` (execution.ts) et
 * pour la meme raison mesuree : le cablage etait hors de portee d'un test sans
 * DOM, donc remplacer l'inscription de l'ecouteur par son retrait laissait les
 * 286 tests verts alors que plus aucun geste de retour n'etait intercepte.
 */
export function abonnerAuPopstate(
  cible: Pick<Window, "addEventListener" | "removeEventListener">,
  signaler: () => void,
): () => void {
  const surPopstate = () => signaler();
  cible.addEventListener("popstate", surPopstate);
  return () => cible.removeEventListener("popstate", surPopstate);
}

/* ------------------------------------------------------------------------ */
/* 3. LA GARDE ELLE-MEME                                                     */
/* ------------------------------------------------------------------------ */

export type GardeDeRetour = {
  /** Reconcilie : pose la garde si elle manque, la retire si elle est en trop. */
  viser(armee: boolean): void;
  /** Le navigateur previent qu'un retour a eu lieu. */
  surPopstate(): void;
  /** La garde est-elle posee ? N'existe que pour les sondes. */
  posee(): boolean;
};

/**
 * Fabrique la garde.
 *
 * UNE SEULE FONCTION DE RECONCILIATION, jamais un couple poser et retirer.
 * React monte, demonte puis remonte les effets en developpement pour debusquer
 * les traitements non idempotents, et une garde posee au montage puis retiree
 * au demontage ferait un aller-retour reel dans l'historique du navigateur a
 * chaque demarrage. Les deux branches de `viser` ne font rien quand il n'y a
 * rien a faire.
 *
 * `surRetour` est appele APRES que l'entree de garde a ete consommee, et la
 * garde est reposee dans la foulee : le geste suivant sera donc intercepte lui
 * aussi. L'appelant est libre de ne rien faire, ce qui est le cas de la phase
 * QUESTION, ou le geste doit etre absorbe sans effet et en silence.
 */
export function creerGardeDeRetour(
  historique: HistoriqueDuNavigateur,
  surRetour: () => void,
): GardeDeRetour {
  let posee = false;
  let armee = false;
  let retourIgnore = false;

  return {
    viser(veut) {
      armee = veut;

      if (veut && !posee) {
        historique.poser();
        posee = true;
        return;
      }

      if (!veut && posee) {
        posee = false;
        // Le `popstate` qui suivra est le notre, pas un geste du narrateur.
        retourIgnore = true;
        historique.revenir();
      }
    },

    surPopstate() {
      /*
       * Le retour que NOUS avons declenche en retirant la garde. Sans ce
       * drapeau, la fin de tour se lirait comme un geste du narrateur et
       * l'appelant serait prevenu d'un retour qui n'a pas eu lieu.
       */
      if (retourIgnore) {
        retourIgnore = false;
        return;
      }

      posee = false;
      surRetour();

      /*
       * Repose immediatement, sur la foi de l'etat AVANT le rappel :
       * `surRetour` demande une transition a React, qui ne la rendra qu'au
       * rendu suivant, donc `armee` decrit encore la situation que le geste
       * vient de quitter. Si ce qu'il declenche desarme la garde, l'effet
       * d'`useGesteDeRetour` la retirera au rendu suivant, et c'est le seul
       * ordre tenable.
       */
      if (!armee) return;
      historique.poser();
      posee = true;
    },

    posee: () => posee,
  };
}

/**
 * Previent a chaque geste de retour tant que `armee` est vrai, et empeche le
 * geste de fermer l'application.
 *
 * Appel attendu : `useGesteDeRetour(gardeArmee(effet), surRetour)`.
 */
export function useGesteDeRetour(armee: boolean, surRetour: () => void): void {
  // La derniere version du rappel, sans reinscrire l'ecouteur : un ecouteur
  // reinscrit a chaque rendu manquerait le geste qui arrive entre les deux.
  const rappel = useRef(surRetour);
  useEffect(() => {
    rappel.current = surRetour;
  });

  /*
   * La garde est fabriquee au premier rendu et n'est JAMAIS refaite, pas meme
   * au demontage simule que React inflige en developpement. Une garde refaite
   * repartirait avec `posee` a faux et poserait une seconde entree, et surtout
   * elle perdrait le drapeau du retour qu'elle vient elle-meme de declencher :
   * le `popstate` de ce retour serait alors lu comme un geste du narrateur.
   *
   * La construction ne touche a rien : ni `creerGardeDeRetour` ni
   * `historiqueDuNavigateur` n'appellent le navigateur, ils ne font que retenir
   * de quoi l'appeler.
   */
  const gardeCourante = useRef<GardeDeRetour | null>(null);
  if (gardeCourante.current === null) {
    gardeCourante.current = creerGardeDeRetour(historiqueDuNavigateur(history), () =>
      rappel.current(),
    );
  }
  const garde = gardeCourante.current;

  useEffect(() => abonnerAuPopstate(window, () => garde.surPopstate()), [garde]);

  useEffect(() => {
    garde.viser(armee);
  }, [armee, garde]);
}
