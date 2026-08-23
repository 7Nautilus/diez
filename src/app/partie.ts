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
 * Ce que le stockage rend au demarrage, avant toute confrontation au corpus.
 *
 * Les quatre champs arrivent de `storage/`, qui les a valides sur leur FORME et
 * ne peut rien dire de plus : il n'importe rien, donc il ne connait pas le
 * corpus (architecture.md section 3). C'est ici que la confrontation a lieu.
 *
 * `tour` a `null` couvre les trois causes que `lireTour` confond volontiers, et
 * a raison de confondre : clef absente, contenu corrompu, autre soiree. Trois
 * causes, une seule consequence, une partie neuve.
 */
export type EtatEnregistre = {
  tour: EtatTour | null;
  historique: Historique;
  signalements: readonly Signalement[];
  paquets: readonly PaquetId[];
};

/**
 * Le tour relu designe-t-il encore quelque chose de jouable ?
 *
 * CETTE FONCTION EST CE QUI FAIT TOMBER LES TROIS LEVEES D'UN COUP. Les trois
 * acces au corpus plus bas levent quand une carte est introuvable, et c'etait
 * juste tant qu'un tour ne pouvait venir que d'une pioche : le tour ne
 * referencait alors que des cartes tirees de ce meme corpus, donc l'absence
 * etait un defaut de cablage. Un tour RELU casse cette propriete. Un lot retire
 * du corpus entre deux soirees, une carte renommee, un `_fixtures` present dans
 * le banc et absent de la production : la carte disparait pour une raison
 * parfaitement normale, et le demarrage leverait.
 *
 * Le tri se fait donc ICI, une seule fois, au seul point ou un tour entre dans
 * l'application sans venir d'une pioche. Les levees restent en place et
 * redeviennent ce qu'elles pretendent etre, des gardes de cablage
 * inatteignables en jeu (conventions-code.md section 7). Les affaiblir en
 * repli silencieux aurait rendu muet le vrai defaut de programmation qu'elles
 * attrapent, pour couvrir un cas qui n'est pas le leur.
 *
 * LE NIVEAU EST CONTROLE EN PLUS DE LA CARTE, et seulement dans les deux phases
 * qui portent un enonce. C'est `reveler` qui va rechercher la question dans le
 * corpus a partir de `enonce.niveau` : une carte reecrite avec d'autres niveaux
 * garderait la carte et perdrait la question, donc la seule presence de la
 * carte ne suffit pas. En THEME et en NIVEAU il n'y a rien de tel a verifier,
 * le compilateur garantissant les dix niveaux de toute carte qu'il ecrit
 * (architecture.md section 8).
 */
export function tourJouable(corpus: readonly Carte[], tour: EtatTour): boolean {
  if (tour.phase === "REPOS") return true;
  const carte = corpus.find((connue) => connue.id === tour.carte.id);
  if (carte === undefined) return false;
  if (tour.phase !== "QUESTION" && tour.phase !== "REPONSE") return true;
  return carte.questions.some((question) => question.niveau === tour.enonce.niveau);
}

/**
 * L'etat d'ouverture quand une soiree precedente a laisse quelque chose.
 *
 * LA REPRISE EN PHASE QUESTION EST COHERENTE AVEC L'HISTORIQUE, et c'est le
 * raisonnement qui rend toute cette phase juste. Le niveau est consomme des
 * `choisir(n)`, a l'entree en QUESTION, jamais a la fin du tour (architecture.md
 * section 6, et l'invariant est rejoue par le test de ce fichier) : quand le
 * tour est ecrit en phase QUESTION, la question a DEJA ete retiree du stock.
 * Reprendre affiche donc une question que rien ne peut reproposer, ce qui est
 * exactement l'etat qu'on avait quitte.
 *
 * Deplacer la consommation a la fin du tour casserait la reprise en silence, et
 * quelqu'un voudra le faire un jour, parce que bruler une question que personne
 * n'a peut-etre lue a l'air d'un gaspillage. Ce serait alors le cas inverse qui
 * arriverait : l'application meurt entre `choisir` et `reveler`, le niveau n'est
 * pas consomme, la reprise reaffiche la question, et le meme niveau ressort plus
 * tard sur la meme carte. La table reentend une question deja posee, ce que le
 * projet tient pour cassant la partie. Le cout de l'arbitrage retenu est d'une
 * question sur dix dans le pire des cas, ce qui ne se voit pas.
 *
 * `epuise` N'EST PAS RELU et repart a faux, alors que les quatre autres champs
 * sont repris. Ce n'est pas un oubli : `epuise` retient qu'un TIRAGE a echoue,
 * pas que le vivier est vide (voir `EtatPartie`). Le relire ouvrirait
 * l'application sur l'ecran d'impasse sans qu'aucune pioche ait eu lieu, et il
 * se repose de lui-meme au premier `PIOCHER` si le vivier est effectivement
 * vide. Un narrateur qui rouvre son telephone doit voir l'accueil.
 */
export function etatRepris(corpus: readonly Carte[], enregistre: EtatEnregistre): EtatPartie {
  const { tour, historique, signalements, paquets } = enregistre;
  return {
    tour: tour !== null && tourJouable(corpus, tour) ? tour : initial(),
    historique,
    paquets,
    signalements,
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

/**
 * Le rang d'une carte dans le corpus, entier a partir de 1. C'est le nombre
 * que la phase THEME affiche en `CARTE 042`.
 *
 * IL SE CALCULE ICI ET NULLE PART AILLEURS, parce qu'il n'existe qu'au niveau
 * du corpus ENTIER. Un ecran ne recoit qu'un `ResumeCarte` et ne peut donc pas
 * l'etablir ; le domaine n'en a aucun usage, aucune regle du jeu ne depend du
 * rang d'une carte. C'est une metadonnee de presentation, produite par la
 * seule couche qui possede le corpus (architecture.md section 4).
 *
 * IL EST STABLE PARCE QUE L'ORDRE DU CORPUS L'EST, ET SEULEMENT POUR CELA.
 * `lireLots` trie les fichiers de contenu par chemin et `compilerCorpus`
 * conserve l'ordre des cartes dans chaque lot (tools/compiler.ts) : deux
 * compilations du meme contenu, sur deux machines, rendent le meme ordre, donc
 * la meme carte porte le meme numero d'une soiree a l'autre. La contrepartie
 * est ecrite pour qui touchera au contenu : une carte INSEREE au milieu d'un
 * lot decale toutes les suivantes, et renumerote donc des cartes que des
 * joueurs ont deja vues. Une carte s'ajoute a la fin d'un lot.
 *
 * Un compteur remis a zero a chaque partie serait la reponse facile et la
 * mauvaise : il numeroterait le tour et non la carte.
 *
 * LEVE si la carte est inconnue du corpus, comme `carteDuCorpus` plus bas et
 * pour la meme raison : le tour ne reference que des cartes que `piocher` a
 * tirees de ce meme corpus, donc l'absence est un defaut de cablage et non un
 * etat de jeu (conventions-code.md section 7). Un rang de repli afficherait un
 * numero qui designe une autre carte, ce que la phase THEME refuse deja pour
 * la troncature.
 *
 * LA LEVEE TIENT TOUJOURS APRES LA PHASE 5, et c'est `tourJouable` qui la rend
 * a nouveau vraie : un tour relu du stockage passe par ce filtre avant
 * d'atteindre l'etat, donc la seule facon d'arriver ici avec une carte inconnue
 * reste un defaut de programmation.
 */
export function rangDansLeCorpus(corpus: readonly Carte[], id: CarteId): number {
  const index = corpus.findIndex((carte) => carte.id === id);
  if (index < 0) throw new Error(`Carte introuvable dans le corpus : ${id}`);
  // Le rang se lit a voix haute et se compare a une carte posee sur la table :
  // il commence a 1, la position dans un tableau ne se montre pas.
  return index + 1;
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
 * LA RESERVE DE PHASE 5 EST LEVEE, ET SANS TOUCHER A CES DEUX FONCTIONS. Le
 * tour relu du stockage est le seul tour qui n'ait pas ete produit par une
 * pioche, et `tourJouable` l'ecarte au demarrage quand il designe une carte
 * disparue : la reprise redevient alors une ouverture au repos, ce qui est
 * l'etat de jeu attendu, pendant que ces levees gardent le defaut de cablage.
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

/* ------------------------------------------------------------------------ */
/* LE VOISINAGE : DEUX DOCUMENTS DE LA MEME ORIGINE                          */
/* ------------------------------------------------------------------------ */

/*
 * LE DEFAUT, MESURE AU NAVIGATEUR SUR DEUX ONGLETS. Chaque document lisait les
 * quatre clefs une fois a l'amorcage et les reecrivait ensuite depuis sa
 * memoire, sans jamais ecouter ce que l'autre ecrivait. Sequence rejouee :
 *
 *   A joue la carte 009 niveau 1  base historique {"seconde-guerre-mondiale-001":[1]}
 *   B tire la meme carte          ses dix crans affiches "libre"
 *   B choisit le niveau 1         B pose LA MEME QUESTION MOT POUR MOT
 *   B revele                      le tour de A est remplace en base
 *   B signale                     le signalement de A a disparu de la base
 *
 * Le narrateur n'a qu'un telephone, mais un onglet survit a une fermeture, une
 * PWA et un navigateur coexistent, et un lien rouvre l'application. Ce n'est
 * pas un cas de laboratoire, et il COMPOSE avec le geste de retour : on sortait
 * de l'application par un balayage, on la rouvrait, et le second document
 * naissait la (app/navigation.ts).
 *
 * LA REGLE RETENUE, CLEF PAR CLEF, ET SA RAISON.
 *
 * `historique` : UNION. Perdre une question est moins grave que la reposer, et
 * une question reentendue est ce que le projet tient pour cassant la partie
 * (architecture.md section 6). L'union ne retire jamais rien, donc au pire elle
 * brule une question que personne n'a lue, ce qui coute une question sur dix
 * dans le pire des cas : exactement l'arbitrage deja fait pour la consommation
 * sur `choisir`.
 *
 * `signalements` : UNION, dedoublonnee sur le couple carte et niveau. Perdre un
 * signalement est pire que d'en garder un en double : il parle du contenu, sa
 * destination est le depot, et personne ne le reposera.
 *
 * `tour` : JAMAIS ADOPTE. C'est le seul de la liste qu'un narrateur est en
 * train de LIRE A VOIX HAUTE. Un ecran qui change sous ses yeux au milieu d'une
 * phrase serait pire que la perte qu'on evite, et cette perte est justement
 * celle que le projet classe comme la moins grave : le niveau ayant deja ete
 * consomme a l'entree en QUESTION, un tour perdu ne fait jamais revenir une
 * question, il fait piocher.
 *
 * `reglages` : PAS RECONCILIE non plus, et pour une raison differente. Ce n'est
 * pas ce qui casse une soiree, et son seul ecrivain d'aujourd'hui est l'echo de
 * ce qui vient d'etre lu, le selecteur de paquets etant en sommeil
 * (screens/Accueil.tsx). Adopter la liste d'un document reste en arriere
 * laisserait au contraire un `PIOCHER` desactive au milieu de la partie, ce qui
 * est un cout reel pour un gain nul.
 */

/** Ce qu'un autre document de la meme origine a dans son etat. */
export type NouvellesDuVoisin = {
  historique: Historique;
  signalements: readonly Signalement[];
};

/**
 * L'union des deux historiques.
 *
 * UN HISTORIQUE ENTRANT VIDE EST UNE REINITIALISATION, ET IL EST ADOPTE. C'est
 * la seule exception a l'union, et elle tient a un fait verifiable : un
 * document qui s'ouvre RELIT la clef avant de la reecrire, donc il ne peut
 * ecrire un historique vide que si la clef l'etait deja, ou si le narrateur
 * vient de demander l'effacement. Sans cette exception, une reinitialisation
 * faite dans un document serait defaite par l'autre, et le narrateur qui joue
 * avec un nouveau groupe verrait l'application continuer d'ecarter des
 * questions que personne autour de la table n'a entendues.
 *
 * Rend l'objet LOCAL inchange quand le voisin n'apporte rien. Ce n'est pas une
 * optimisation : l'ecriture de la clef est un effet qui suit l'identite de ce
 * champ, donc une identite neuve a chaque evenement ferait rebondir les deux
 * documents l'un sur l'autre sans fin.
 */
export function fusionnerHistorique(local: Historique, voisin: Historique): Historique {
  const cartesDuVoisin = Object.keys(voisin);
  if (cartesDuVoisin.length === 0) {
    return Object.keys(local).length === 0 ? local : {};
  }

  const fusionne: Record<CarteId, readonly Niveau[]> = { ...local };
  let change = false;
  for (const carte of cartesDuVoisin) {
    const deja = local[carte] ?? [];
    const arrivants = voisin[carte] ?? [];
    const inedits = arrivants.filter((niveau) => !deja.includes(niveau));
    if (inedits.length === 0) continue;
    fusionne[carte] = [...deja, ...inedits];
    change = true;
  }
  return change ? fusionne : local;
}

/**
 * L'union des deux listes de signalements, dedoublonnee sur ce qui designe une
 * question, et JAMAIS amputee.
 *
 * Les notres passent en tete : c'est ce qui garde stable l'ordre de la liste
 * qui part dans le presse-papier, et ce qui fait converger deux documents en un
 * echange au lieu de les faire rebondir.
 */
export function fusionnerSignalements(
  local: readonly Signalement[],
  voisin: readonly Signalement[],
): readonly Signalement[] {
  const inedits = voisin.filter((signale) => !estSignalee(local, signale.carte, signale.niveau));
  return inedits.length === 0 ? local : [...local, ...inedits];
}

/**
 * Le tour, mis a jour de ce que l'historique fusionne vient d'apprendre.
 *
 * CECI N'EST PAS UN CHANGEMENT D'ECRAN, C'EST LE CORRECTIF LUI-MEME. La phase
 * NIVEAU porte un INSTANTANE des niveaux consommes, pris a l'entree dans la
 * phase (domain/types.ts) : sans cette mise a jour, un document reste sur son
 * selecteur pendant que l'autre brule un niveau, et il l'offre encore. C'est
 * exactement la sequence mesuree, ou les dix crans s'affichaient "libre" sur
 * une carte dont un niveau venait d'etre joue ailleurs.
 *
 * Elle ne peut QU'AJOUTER des crans consommes, jamais en rendre un. La phase ne
 * change pas, la carte ne change pas, l'enonce n'existe pas encore : rien de ce
 * que le narrateur lit ne bouge, seul un cran qu'il ne doit plus choisir cesse
 * d'etre offert.
 */
export function tourAJour(tour: EtatTour, historique: Historique): EtatTour {
  if (tour.phase !== "NIVEAU") return tour;
  const connus = historique[tour.carte.id] ?? [];
  const manquants = connus.filter((niveau) => !tour.consommes.includes(niveau));
  if (manquants.length === 0) return tour;
  return { ...tour, consommes: [...tour.consommes, ...manquants] };
}

/**
 * Prend acte de ce qu'un autre document vient d'ecrire.
 *
 * Rend l'etat LUI-MEME quand il n'y a rien a prendre, ce qui est le cas
 * courant : les quatre effets d'ecriture suivent l'identite de leur champ, donc
 * un etat reconstruit pour rien reecrirait les clefs, et cette ecriture
 * reveillerait le voisin, qui reecrirait a son tour.
 */
export function reconcilier(etat: EtatPartie, voisin: NouvellesDuVoisin): EtatPartie {
  const historique = fusionnerHistorique(etat.historique, voisin.historique);
  const signalements = fusionnerSignalements(etat.signalements, voisin.signalements);
  const tour = tourAJour(etat.tour, historique);
  if (historique === etat.historique && signalements === etat.signalements && tour === etat.tour) {
    return etat;
  }
  return { ...etat, historique, signalements, tour };
}

/**
 * Ce que le reducteur recoit : un geste du narrateur, ou des nouvelles d'un
 * autre document.
 *
 * Les deux passent par le MEME reducteur et non par deux chemins : l'etat de la
 * soiree n'a qu'un seul point de mise a jour, et une reconciliation posee a
 * cote arriverait sur un etat qu'un geste vient peut-etre de remplacer.
 */
export type Mouvement =
  | { origine: "narrateur"; commande: Commande }
  | { origine: "voisin"; nouvelles: NouvellesDuVoisin };

export function appliquer(
  corpus: readonly Carte[],
  etat: EtatPartie,
  mouvement: Mouvement,
): EtatPartie {
  return mouvement.origine === "narrateur"
    ? avancer(corpus, etat, mouvement.commande)
    : reconcilier(etat, mouvement.nouvelles);
}
