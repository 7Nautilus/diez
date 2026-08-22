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
 * LE PRINCIPE. Une entree d'historique de garde est posee des que la soiree
 * quitte le repos. Le geste de retour la consomme, le navigateur previent par
 * `popstate` au lieu de fermer, et la garde est reposee aussitot. Ce qu'il faut
 * en faire depend de la phase et n'appartient pas a ce fichier : l'appelant le
 * decide, ce module ne fait que garantir qu'on est prevenu.
 *
 * UNE SEULE GARDE, ET NON UNE PAR PHASE. Une entree posee a chaque phase
 * s'accumulerait pendant toute la soiree, une vingtaine de tours a quatre
 * phases, et il faudrait alors presser retour quatre-vingts fois pour sortir
 * d'un accueil ou plus rien ne se passe. Le narrateur conclurait que le geste
 * est casse, ce qui est le defaut qu'on repare ici.
 *
 * AU REPOS, LA GARDE EST RETIREE ET LE RETOUR SORT DE L'APPLICATION. C'est
 * volontaire : il n'y a pas de partie a proteger sur l'accueil, et une
 * application dont on ne peut plus sortir par le geste du systeme est un piege
 * pire que celui qu'on evite.
 */

import { useEffect, useRef } from "react";

/*
 * L'entree de garde se reconnait a sa charge. Rien n'en depend aujourd'hui,
 * l'application n'ayant qu'une seule URL, mais une entree d'historique anonyme
 * est indebogable le jour ou quelque chose d'autre en pose une.
 */
const GARDE = { diez: "garde" };

/**
 * Previent a chaque geste de retour tant que `enTour` est vrai, et empeche le
 * geste de fermer l'application.
 *
 * `surRetour` est appele APRES que l'entree de garde a ete consommee, et la
 * garde est reposee dans la foulee : le geste suivant sera donc intercepte lui
 * aussi. L'appelant est libre de ne rien faire, ce qui est le cas de la phase
 * QUESTION, ou le geste doit etre absorbe sans effet et en silence.
 */
export function useGesteDeRetour(enTour: boolean, surRetour: () => void): void {
  /*
   * Trois references et aucun etat : ce module ne rend rien, et un `useState`
   * y provoquerait un rendu a chaque geste absorbe, donc a chaque geste dont
   * la qualite est justement de ne rien produire.
   */
  const rappel = useRef(surRetour);
  const enTourRef = useRef(enTour);
  const gardePosee = useRef(false);
  const retourIgnore = useRef(false);

  // La derniere version du rappel, sans reinscrire l'ecouteur : un ecouteur
  // reinscrit a chaque rendu manquerait le geste qui arrive entre les deux.
  useEffect(() => {
    rappel.current = surRetour;
  });

  useEffect(() => {
    const surPopstate = () => {
      /*
       * Le retour que NOUS avons declenche en retirant la garde. Sans ce
       * drapeau, la fin de tour se lirait comme un geste du narrateur et
       * l'appelant serait prevenu d'un retour qui n'a pas eu lieu.
       */
      if (retourIgnore.current) {
        retourIgnore.current = false;
        return;
      }

      gardePosee.current = false;
      rappel.current();

      /*
       * Repose immediatement, sur la foi de l'etat AVANT le rappel : aucune
       * transition atteignable par retour ne ramene au repos (la table des
       * transitions n'en offre pas depuis THEME, et QUESTION absorbe), donc
       * une soiree en cours le reste. Si cela changeait, l'effet ci-dessous
       * retirerait la garde en trop au rendu suivant.
       */
      if (!enTourRef.current) return;
      history.pushState(GARDE, "");
      gardePosee.current = true;
    };

    window.addEventListener("popstate", surPopstate);
    return () => window.removeEventListener("popstate", surPopstate);
  }, []);

  useEffect(() => {
    enTourRef.current = enTour;

    /*
     * Reconciliation plutot que pose et depose dans le nettoyage de l'effet :
     * React monte, demonte puis remonte les effets en developpement pour
     * debusquer les traitements non idempotents, et une garde posee par le
     * montage puis retiree par le demontage ferait un aller-retour reel dans
     * l'historique du navigateur a chaque demarrage. Les deux branches ci-
     * dessous ne font rien quand il n'y a rien a faire.
     */
    if (enTour && !gardePosee.current) {
      history.pushState(GARDE, "");
      gardePosee.current = true;
      return;
    }

    if (!enTour && gardePosee.current) {
      gardePosee.current = false;
      // Le `popstate` qui suivra est le notre, pas un geste du narrateur.
      retourIgnore.current = true;
      history.back();
    }
  }, [enTour]);
}
