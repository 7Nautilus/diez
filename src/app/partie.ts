/*
 * Diez : l'etat de la soiree, et la seule couche qui a le droit de tout voir.
 *
 * `reduire` (domain/tour.ts) fait avancer LE TOUR et rien d'autre : il ne
 * recoit ni ne rend d'Historique, il ne connait pas le corpus, il ne sait rien
 * des paquets ni des signalements. Ce fichier tient le reste, et surtout le
 * joint entre les deux.
 *
 * IL EST PUR, VOLONTAIREMENT. Aucune horloge, aucun hasard, aucun stockage,
 * aucun acces au document : `maintenant` et `tirage` arrivent dans la commande,
 * le corpus arrive en parametre. Trois raisons, dans l'ordre d'importance.
 * D'abord l'invariant ci-dessous se prouve alors en rejouant une sequence
 * complete, ce que le domaine ne peut pas faire depuis sa place. Ensuite React
 * exige un reducteur pur et l'invoque deux fois en developpement pour le
 * verifier : un `Math.random()` appele ici tirerait deux cartes par pioche.
 * Enfin c'est la meme discipline que le domaine, pour la meme raison.
 *
 * P3 TIENT PAR LE TYPAGE ET NON PAR LA VIGILANCE. C'est ici qu'on va chercher
 * l'enonce et la reponse dans le corpus, et c'est le seul endroit du projet qui
 * en a le droit ; les deux ne voyagent que dans l'action qui entre dans la
 * phase autorisee a les montrer. Une `Carte` entiere ne peut pas atteindre le
 * reducteur : `ResumeCarte` et `EnonceQuestion` la refusent a la compilation
 * (domain/types.ts).
 */

import { cartesRestantes, consommer, niveauxConsommes, piocher, resumer } from "../domain/paquet";
import { initial, reduire, verrouille } from "../domain/tour";
import type {
  Carte,
  CarteId,
  EnonceQuestion,
  EtatTour,
  Historique,
  Niveau,
  PaquetId,
  Question,
  Reponse,
} from "../domain/types";

/**
 * Une question jugee douteuse par le narrateur.
 *
 * `carte` et `niveau` suffiraient a la retrouver dans le depot, `theme` et `q`
 * sont la pour que la liste collee dans une conversation se lise sans avoir le
 * corpus sous les yeux (architecture.md section 7). La reponse n'y figure pas :
 * elle n'ajoute rien a qui va rouvrir le fichier, et cette liste part dans un
 * presse-papier.
 */
export type Signalement = {
  carte: CarteId;
  niveau: Niveau;
  theme: string;
  q: string;
};

/**
 * L'etat complet de la soiree.
 *
 * `epuise` n'est pas deductible du reste au moment ou il compte : le vivier
 * peut etre vide alors que la phase est REPOS, ce qui est l'etat d'ouverture
 * normal, et c'est la PIOCHE A VIDE qui fait la difference. Le champ retient
 * donc qu'un tirage a echoue, seule facon d'atteindre l'ecran d'epuisement
 * plutot que de rester sur un accueil ou plus rien ne repond (architecture.md
 * section 6, etape 5 : jamais de plantage silencieux).
 */
export type EtatPartie = {
  tour: EtatTour;
  historique: Historique;
  paquets: readonly PaquetId[];
  signalements: readonly Signalement[];
  epuise: boolean;
};

/**
 * Ce qu'un narrateur peut faire, et rien de plus.
 *
 * La liste est plus longue que celle des `Action` du domaine, et c'est le
 * sujet de ce fichier : `signaler` n'est pas une transition, `basculerPaquet`
 * et `reinitialiser` ne touchent pas au tour. Les gestes ne portent AUCUNE
 * donnee de contenu : c'est `avancer` qui va la chercher.
 */
export type Geste =
  | { type: "piocher" }
  | { type: "annoncer" }
  | { type: "retour" }
  | { type: "choisir"; niveau: Niveau }
  | { type: "reveler" }
  | { type: "suivante" }
  | { type: "terminer" }
  | { type: "signaler" }
  | { type: "basculerPaquet"; paquet: PaquetId }
  | { type: "reinitialiser" };

/**
 * Un geste, plus les deux valeurs que le reducteur n'a pas le droit de lire
 * lui-meme.
 *
 * `tirage` accompagne TOUS les gestes et pas seulement ceux qui piochent :
 * une commande de forme unique reste triviale a fabriquer au point d'appel, ou
 * le seul geste juste est de lire l'horloge et de tirer un nombre. Il doit
 * appartenir a [0, 1), comme `Math.random` : `piocher` leve si l'index sort du
 * palier (domain/paquet.ts).
 */
export type Commande = {
  geste: Geste;
  maintenant: number;
  tirage: number;
};

export function etatInitial(paquets: readonly PaquetId[]): EtatPartie {
  return {
    tour: initial(),
    historique: {},
    paquets,
    signalements: [],
    epuise: false,
  };
}

/**
 * Les paquets presents dans le corpus, dans son ordre, sans doublon.
 *
 * Deduits et jamais ecrits : proposer un paquet vide donnerait une pilule qui
 * ne change rien au compteur, et une pilule qui ne fait rien est pire qu'une
 * pilule absente. Le compilateur de contenu ayant deja ecarte les fixtures
 * (architecture.md section 8), ce que le corpus contient est exactement ce qui
 * est jouable.
 */
export function paquetsDuCorpus(corpus: readonly Carte[]): readonly PaquetId[] {
  const vus: PaquetId[] = [];
  for (const carte of corpus) {
    if (!vus.includes(carte.paquet)) vus.push(carte.paquet);
  }
  return vus;
}

/**
 * Le compteur de l'accueil : les cartes ENCORE JOUABLES, jamais le total du
 * corpus (architecture.md section 6).
 */
export function nombreDeCartesRestantes(corpus: readonly Carte[], etat: EtatPartie): number {
  return cartesRestantes(corpus, etat.historique, etat.paquets).length;
}

/** Cette question a-t-elle deja ete signalee ? L'ecran REPONSE l'affiche. */
export function estSignalee(
  signalements: readonly Signalement[],
  carte: CarteId,
  niveau: Niveau,
): boolean {
  return signalements.some((signale) => signale.carte === carte && signale.niveau === niveau);
}

/** Ce qui part dans le presse-papier : du JSON, relisible tel quel. */
export function signalementsEnJson(signalements: readonly Signalement[]): string {
  return JSON.stringify(signalements, null, 2);
}

/*
 * Les deux acces au corpus, isoles ici parce qu'ils LEVENT.
 *
 * Une carte ou un niveau introuvable est un defaut de cablage et non un etat
 * de jeu : le tour ne reference que des cartes que `piocher` a tirees de ce
 * meme corpus, et le compilateur de contenu garantit les dix niveaux de 1 a 10
 * (architecture.md section 8). Un defaut de cablage doit etre bruyant
 * (conventions-code.md section 7) ; le rendre silencieux donnerait un ecran ou
 * le bouton ne repond plus, sans que rien n'en dise la cause.
 *
 * A REVOIR EN PHASE 5, quand le tour sera relu depuis le stockage : une carte
 * retiree du corpus entre deux soirees deviendra alors un etat de jeu normal,
 * et cette levee devra redevenir une reprise au repos.
 */
function carteDuCorpus(corpus: readonly Carte[], id: CarteId): Carte {
  const trouvee = corpus.find((carte) => carte.id === id);
  if (trouvee === undefined) throw new Error(`Carte introuvable dans le corpus : ${id}`);
  return trouvee;
}

function questionDuCorpus(corpus: readonly Carte[], id: CarteId, niveau: Niveau): Question {
  const carte = carteDuCorpus(corpus, id);
  const trouvee = carte.questions.find((question) => question.niveau === niveau);
  if (trouvee === undefined) throw new Error(`Niveau ${niveau} absent de la carte ${id}`);
  return trouvee;
}

/**
 * Fait avancer la soiree d'un geste.
 *
 * LE VERROU EST APPLIQUE ICI, EN TETE, ET IL PROTEGE LA PHASE ENTIERE. Le
 * reducteur le repose de son cote pour les transitions, ce qui est sans effet
 * puisque la regle a une seule ecriture (`verrouille`, domain/tour.ts). Le
 * garder ici est ce qui couvre les gestes qui n'atteignent jamais le
 * reducteur, `signaler` au premier chef : il occupe le dernier rang de l'ecran
 * REPONSE, donc la position ou tombait REVELER, et un tap reste sur place
 * signalait la question par accident (design-system.md, Le controle se fait
 * sur la chaine). C'est aussi ce qui protege les deux operations que le
 * reducteur ne peut pas defaire, le tirage d'une carte et la consommation d'un
 * niveau.
 */
export function avancer(
  corpus: readonly Carte[],
  etat: EtatPartie,
  commande: Commande,
): EtatPartie {
  const { geste, maintenant, tirage } = commande;
  if (verrouille(etat.tour, maintenant)) return etat;

  switch (geste.type) {
    case "piocher": {
      /*
       * La garde de phase double celle du reducteur, et seulement la ou ce
       * fichier agit HORS de lui : ici un tirage, plus bas une consommation ou
       * un signalement. `reduire` ignorerait bien le geste, mais la carte
       * serait deja tiree et `epuise` deja pose.
       */
      if (etat.tour.phase !== "REPOS") return etat;
      const carte = piocher(corpus, etat.historique, etat.paquets, () => tirage);
      if (carte === null) return { ...etat, epuise: true };
      return {
        ...etat,
        tour: reduire(etat.tour, { type: "piocher", carte: resumer(carte) }, maintenant),
      };
    }

    case "annoncer": {
      if (etat.tour.phase !== "THEME") return etat;
      /*
       * Les niveaux deja brules voyagent avec l'action qui entre en NIVEAU :
       * la phase THEME ne les porte pas, donc le reducteur n'a nulle part ou
       * les ranger avant (domain/types.ts, l'ecart assume).
       */
      const consommes = niveauxConsommes(etat.historique, etat.tour.carte.id);
      return { ...etat, tour: reduire(etat.tour, { type: "annoncer", consommes }, maintenant) };
    }

    case "retour":
      return { ...etat, tour: reduire(etat.tour, { type: "retour" }, maintenant) };

    case "choisir": {
      if (etat.tour.phase !== "NIVEAU") return etat;
      const identifiant = etat.tour.carte.id;
      const question = questionDuCorpus(corpus, identifiant, geste.niveau);
      /*
       * L'enonce est RECONSTRUIT champ par champ, jamais la question passee
       * telle quelle : c'est le geste qui laisse la reponse dans le corpus.
       * Le typage le rend obligatoire, `EnonceQuestion` declarant `r` et
       * `note` a `never` ; la construction explicite dit pourquoi.
       */
      const enonce: EnonceQuestion = { niveau: question.niveau, q: question.q };
      const tour = reduire(
        etat.tour,
        { type: "choisir", niveau: geste.niveau, enonce },
        maintenant,
      );
      /*
       * L'INVARIANT LE PLUS DELICAT DE LA COMPOSITION : le niveau se consomme
       * SUR CHOISIR, a l'entree en QUESTION, jamais a la fin du tour
       * (architecture.md section 6). Personne d'autre ne peut le tenir :
       * `reduire` ne recoit ni ne rend d'Historique, et sa signature lui
       * interdit deja de consommer quoi que ce soit, ce qui n'en prouve que la
       * moitie. L'autre moitie est ici, et elle est rejouee par le test.
       *
       * Consommer a la fin du tour laisserait la question rejouable si
       * l'application meurt entre-temps, donc quelqu'un pourrait reentendre une
       * question que la table a deja entendue, ce qui casse la partie. Bruler
       * une question qui ne sera peut-etre jamais lue coute une question sur
       * dix, ce qui est invisible.
       *
       * La consommation est conditionnee a la transition REELLE, et c'est le
       * point ou l'ordre compte : un rejet rend l'etat inchange, donc encore en
       * phase NIVEAU. Consommer sans ce controle brulerait un niveau que
       * personne n'a vu, a chaque tremblement de pouce.
       */
      if (tour.phase !== "QUESTION") return etat;
      return { ...etat, tour, historique: consommer(etat.historique, identifiant, geste.niveau) };
    }

    case "reveler": {
      if (etat.tour.phase !== "QUESTION") return etat;
      const question = questionDuCorpus(corpus, etat.tour.carte.id, etat.tour.enonce.niveau);
      /*
       * La reponse n'entre dans l'etat qu'ICI, portee par l'action qui entre
       * en phase REPONSE. Jusqu'a cet appel elle n'existe que dans le corpus,
       * donc dans aucun noeud du document que le narrateur fixe en lisant a
       * voix haute (architecture.md section 5).
       */
      const reponse: Reponse = { r: question.r, note: question.note };
      return { ...etat, tour: reduire(etat.tour, { type: "reveler", reponse }, maintenant) };
    }

    case "suivante": {
      if (etat.tour.phase !== "REPONSE") return etat;
      const carte = piocher(corpus, etat.historique, etat.paquets, () => tirage);
      if (carte === null) {
        /*
         * Plus rien a tirer : le tour se ferme par la transition legale vers
         * REPOS, et l'ecran d'epuisement prend la main. Rester en REPONSE avec
         * un bouton qui ne repond plus serait exactement le plantage
         * silencieux qu'architecture.md section 6 interdit.
         */
        return {
          ...etat,
          tour: reduire(etat.tour, { type: "terminer" }, maintenant),
          epuise: true,
        };
      }
      return {
        ...etat,
        tour: reduire(etat.tour, { type: "suivante", carte: resumer(carte) }, maintenant),
      };
    }

    case "terminer":
      return { ...etat, tour: reduire(etat.tour, { type: "terminer" }, maintenant) };

    case "signaler": {
      if (etat.tour.phase !== "REPONSE") return etat;
      const { carte, enonce } = etat.tour;
      // Deux signalements de la meme question ne disent rien de plus, et la
      // liste part telle quelle dans le presse-papier.
      if (estSignalee(etat.signalements, carte.id, enonce.niveau)) return etat;
      const signalement: Signalement = {
        carte: carte.id,
        niveau: enonce.niveau,
        theme: carte.theme,
        q: enonce.q,
      };
      return { ...etat, signalements: [...etat.signalements, signalement] };
    }

    case "basculerPaquet": {
      const actifs = etat.paquets.includes(geste.paquet)
        ? etat.paquets.filter((paquet) => paquet !== geste.paquet)
        : [...etat.paquets, geste.paquet];
      // Le vivier change, donc le constat d'epuisement ne vaut plus : le
      // laisser pose retiendrait le narrateur sur l'ecran d'impasse alors
      // qu'il vient d'ouvrir un paquet plein.
      return { ...etat, paquets: actifs, epuise: false };
    }

    case "reinitialiser":
      /*
       * L'historique est lie au TELEPHONE et non au groupe : joue le mois
       * suivant avec d'autres gens, l'application continuerait d'ecarter des
       * cartes que personne autour de la table n'a vues (architecture.md
       * section 6). Les signalements survivent, ils parlent du contenu et pas
       * de la soiree.
       */
      return { ...etat, historique: {}, epuise: false };
  }
}
