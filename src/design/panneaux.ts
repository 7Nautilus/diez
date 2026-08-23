/*
 * Diez : la pile des panneaux ouverts.
 *
 * POURQUOI UNE PILE, ET POURQUOI ELLE VIT ICI. Deux Feuilles peuvent etre
 * ouvertes en meme temps, la Confirmation par-dessus le menu qu'elle endort
 * (screens/Accueil.tsx). Chacune inscrit son propre ecouteur d'Echap sur
 * `window`, donc une seule touche les fermait toutes les deux : Echap dans la
 * demande de reinitialisation emportait le menu qui l'avait ouverte, et rendait
 * le focus a un bouton que ce meme geste venait de demonter, donc a `<body>`.
 * Mesure faite, menu et Confirmation ouverts, un seul Echap :
 *
 *   AVANT   panneaux ["Menu", "Reinitialiser l'historique"]
 *   APRES   panneaux []                    focus BODY
 *
 * Le meme defaut a une seconde entree, et c'est elle qui casse une soiree : le
 * geste de retour du telephone. La garde d'historique n'etait armee que hors
 * du repos (app/navigation.ts), or les deux panneaux ne vivent QU'AU repos ;
 * un balayage depuis le bord, menu ouvert, sortait donc de l'application, et en
 * PWA installee il n'y a pas d'entree precedente, donc il la FERMAIT. Mesure
 * faite, menu ouvert sur l'accueil :
 *
 *   history.state   null      (aucune garde posee)
 *   history.back()  l'URL passe de /diez/ a la page precedente
 *
 * Les deux entrees demandent la meme chose : SEUL LE PANNEAU DU DESSUS REPOND,
 * et il se ferme sans rien emporter d'autre. Une pile est la seule facon de le
 * dire une fois pour les deux, et de le dire a `app/`, qui tient le geste de
 * retour mais ne sait rien des panneaux.
 *
 * ELLE EST DANS `design/` PARCE QUE C'EST LE SEUL ENDROIT QUE LES DEUX
 * ATTEIGNENT. `design/` est le bas de la chaine de dependance : il ne remonte
 * vers rien, donc il ne peut pas aller chercher une pile posee dans `app/`,
 * alors qu'`app/` descend librement vers lui (architecture.md section 3). Le
 * module n'importe rien, pas meme React, et ne touche pas au document : c'est
 * de la logique pure, et elle est rejouee sans DOM.
 */

/** Ce qu'un panneau donne a la pile : de quoi le refermer, et rien d'autre. */
export type FermetureDePanneau = () => void;

/** Ce que la pile rend au panneau qui s'inscrit. */
export type InscriptionDePanneau = {
  /**
   * Ce panneau est-il le dernier ouvert ?
   *
   * C'est le filtre d'Echap : deux panneaux ouverts ont chacun leur ecouteur
   * sur `window`, et les deux sont prevenus de la meme touche.
   */
  estAuDessus(): boolean;
  /** Le retire de la pile. Appele au demontage, jamais a la fermeture. */
  retirer(): void;
};

export type PileDePanneaux = {
  inscrire(fermer: FermetureDePanneau): InscriptionDePanneau;
  /** Combien de panneaux sont ouverts. Zero veut dire "rien par-dessus l'application". */
  hauteur(): number;
  /**
   * Ferme le dernier panneau ouvert, et lui seul. Rend faux si la pile est
   * vide, ce qui est la seule facon pour l'appelant de savoir que le geste
   * n'a rien trouve a fermer et qu'il doit en faire autre chose.
   */
  fermerLeDessus(): boolean;
  /** Previent a chaque changement de hauteur. Rend de quoi se desabonner. */
  abonner(prevenir: () => void): () => void;
};

type Panneau = { fermer: FermetureDePanneau };

/**
 * Fabrique une pile.
 *
 * EXPORTEE ALORS QUE L'APPLICATION N'EN MONTE QU'UNE, pour la raison qui vaut
 * partout ailleurs dans ce depot : une pile de module est un etat global, et un
 * etat global ne se rejoue pas d'une sonde a l'autre sans se souvenir de
 * l'effacer. La fabrique donne une pile neuve a chaque controle.
 */
export function creerPileDePanneaux(): PileDePanneaux {
  const ouverts: Panneau[] = [];
  const abonnes = new Set<() => void>();

  const prevenirTous = () => {
    for (const prevenir of abonnes) prevenir();
  };

  return {
    inscrire(fermer) {
      const panneau: Panneau = { fermer };
      ouverts.push(panneau);
      prevenirTous();

      return {
        estAuDessus: () => ouverts.at(-1) === panneau,
        retirer() {
          const rang = ouverts.indexOf(panneau);
          /*
           * Un panneau deja retire ne l'est pas deux fois : React monte,
           * demonte puis remonte les effets en developpement, et un retrait
           * aveugle enleverait alors le panneau du voisin.
           */
          if (rang < 0) return;
          ouverts.splice(rang, 1);
          prevenirTous();
        },
      };
    },

    hauteur: () => ouverts.length,

    fermerLeDessus() {
      const dessus = ouverts.at(-1);
      if (dessus === undefined) return false;
      /*
       * La pile n'est PAS depilee ici. Fermer un panneau est une demande
       * adressee a React, qui demontera le composant ; c'est ce demontage qui
       * appelle `retirer`. Depiler tout de suite laisserait la pile en avance
       * d'un cran sur le document, et le geste suivant fermerait un panneau
       * qui n'est pas celui qu'on voit.
       */
      dessus.fermer();
      return true;
    },

    abonner(prevenir) {
      abonnes.add(prevenir);
      return () => {
        abonnes.delete(prevenir);
      };
    },
  };
}

/**
 * L'unique pile de l'application.
 *
 * Un seul document, un seul arbre React, donc une seule pile : la Feuille s'y
 * inscrit sans que personne ait a la lui passer, et `app/` la lit pour savoir
 * s'il y a quelque chose a fermer avant de reculer dans la partie.
 */
export const PANNEAUX = creerPileDePanneaux();
