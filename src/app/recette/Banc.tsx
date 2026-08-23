import { useCallback, useMemo, useState } from "react";
import JEU_HISTORIQUE from "../../../content/_dev/historique-partiel.json";
import { Bouton } from "../../design/components/Bouton";
import { Etiquette } from "../../design/components/Etiquette";
import { Feuille } from "../../design/components/Feuille";
import { type OptionSegment, Segment } from "../../design/components/Segment";
import { Statut } from "../../design/components/Statut";
import { NIVEAUX } from "../../domain/types";
import { cleDe, SUFFIXES } from "../../storage/cles";
import { ecrireHistorique, lireHistorique, validerHistorique } from "../../storage/historique";
import { ecrirePaquetsActifs } from "../../storage/reglages";
import { ecrireSignalements, lireSignalements } from "../../storage/signalements";
import { effacer, lireBrut } from "../../storage/stockage";
import { effacerTour } from "../../storage/tour";
import { App } from "../App";
import { paquetsDuCorpus } from "../partie";
import styles from "./Banc.module.css";
import {
  CHOIX_CORPUS,
  type ChoixCorpus,
  choixCourant,
  corpusDuChoix,
  DESCRIPTION_CORPUS,
  LIBELLE_CORPUS,
  urlDuChoix,
} from "./corpus";

/*
 * Diez : le banc de recette.
 *
 * IL EXISTE PARCE QUE LA MOITIE DE docs/recette.md SECTION 1 ETAIT
 * INATTEIGNABLE, et une liste de controles qu'on ne peut pas executer ne
 * prononce aucun critere de sortie. Trois choses manquaient, et aucune ne
 * relevait d'un oubli de l'application :
 *
 * - les deux cartes de fixture sont ecartees de la production par leur paquet,
 *   ce qui est juste, et n'etaient donc atteignables par aucun chemin ;
 * - rien ne permettait de charger `content/_dev/historique-partiel.json`, donc
 *   le selecteur de niveau n'avait jamais ete vu avec neuf niveaux consommes ;
 * - le chemin EPUISEMENT vers ACCUEIL n'avait jamais ete joue en vrai, faute de
 *   pouvoir vider le vivier depuis le retrait du selecteur de paquets.
 *
 * IL NE PART JAMAIS EN PRODUCTION, ET LE DISPOSITIF EST STRUCTUREL PLUTOT QUE
 * CONDITIONNEL, comme celui de la planche de controle (design/review/planche.tsx
 * porte le raisonnement complet). Ce module n'est atteignable que depuis
 * `recette.html`, a la racine du depot : le serveur de developpement sert
 * n'importe quel fichier HTML de la racine, le build ne connait qu'`index.html`
 * et n'ira jamais chercher celle-ci. Ce qui n'est pas une entree n'est pas
 * construit, donc il n'y a pas de branche a eliminer ni de drapeau a evaluer.
 * `entree.tsx` pose en plus le garde `import.meta.env.DEV`, qui est une
 * ceinture par-dessus des bretelles et non l'inverse.
 *
 * IL MONTE L'APPLICATION REELLE, sans la modifier. `<App corpus={...} />` est
 * exactement ce que monte `main.tsx`, aux cartes pres : le cablage de la phase
 * 5, les cinq ecrans, le stockage, le verrou d'entree et le geste de retour sont
 * ceux qui seront publies. Un banc qui reimplementerait quoi que ce soit
 * eprouverait le banc.
 *
 * TOUT GESTE ECRIT PUIS RECHARGE. L'etat de la soiree est amorce au DEMARRAGE et
 * relu nulle part ailleurs, ce qui est le comportement voulu : une clef ecrite
 * sous les pieds de l'application n'aurait aucun effet visible, et le banc
 * mentirait. Le rechargement fait de surcroit passer chaque geste par le chemin
 * de reprise, qui est ce que cette phase existe pour eprouver.
 */

const CORPUS_OPTIONS: readonly OptionSegment<ChoixCorpus>[] = CHOIX_CORPUS.map((choix) => ({
  valeur: choix,
  libelle: LIBELLE_CORPUS[choix],
}));

/** Ce que le diagnostic affiche pour une clef absente. */
const ABSENTE = "(clef absente ou illisible)";

/**
 * Le contenu des quatre clefs, dans l'ordre d'architecture.md section 7.
 *
 * La liste est PARCOURUE depuis `SUFFIXES` et non recopiee ici : une cinquieme
 * clef ecrite un jour apparaitrait dans le diagnostic sans que personne ait a y
 * penser. Une clef qu'on ecrit sans pouvoir la relire est une clef que personne
 * ne verifiera jamais.
 */
function contenuDesClefs(): string {
  return SUFFIXES.map((suffixe) => {
    const brut = lireBrut(suffixe);
    const rendu = brut === undefined ? ABSENTE : JSON.stringify(brut, null, 2);
    return `${cleDe(suffixe)}\n${rendu}`;
  }).join("\n\n");
}

export function Banc() {
  /*
   * Le choix est lu UNE FOIS et ne bouge plus : en changer passe par un
   * changement d'URL, donc par un chargement complet. Le garder en etat
   * remonterait l'application sur un autre corpus sans repasser par l'amorcage,
   * c'est-a-dire dans un etat qu'aucun demarrage reel ne produit.
   */
  const [choix] = useState<ChoixCorpus>(() => choixCourant(window.location.search));
  const corpus = useMemo(() => corpusDuChoix(choix), [choix]);

  const [ouvert, setOuvert] = useState(false);
  /*
   * Le declencheur se masque jusqu'au rechargement, et ce n'est pas un confort.
   * Il flotte au-dessus de l'application, donc il fausse les controles de mise
   * en page que la recette demande justement de faire sur les fixtures : le vide
   * de 96 px avant REVELER, le zoom a 200 %, la grande taille de texte systeme.
   * Le masquer rend l'ecran a l'application ; l'URL portant le choix de corpus,
   * un rechargement le ramene sans rien reconfigurer.
   */
  const [masque, setMasque] = useState(false);
  const [diagnostic, setDiagnostic] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const relire = useCallback(() => setDiagnostic(contenuDesClefs()), []);

  const ouvrir = useCallback(() => {
    relire();
    setMessage(null);
    setOuvert(true);
  }, [relire]);

  const ecrirePuisRecharger = useCallback((ecriture: () => void) => {
    ecriture();
    window.location.reload();
  }, []);

  /*
   * LE JEU DE DEVELOPPEMENT EST VALIDE AVANT D'ETRE CHARGE, par le validateur de
   * `storage/` et non par un controle ecrit ici. Deux choses sont verifiees, et
   * la premiere est celle qu'on oublie : que le fichier designe bien la clef
   * qu'on s'apprete a ecrire. Un jeu de developpement qui viserait une autre
   * clef ecrirait silencieusement au mauvais endroit, et le controle de recette
   * echouerait sans qu'on sache pourquoi.
   */
  const chargerHistoriquePartiel = useCallback(() => {
    if (JEU_HISTORIQUE.cle !== cleDe("historique")) {
      setMessage(`Le jeu vise ${JEU_HISTORIQUE.cle}, la clef courante est ${cleDe("historique")}.`);
      return;
    }
    const valide = validerHistorique(JEU_HISTORIQUE.valeur);
    if (valide === null) {
      setMessage("Le jeu de developpement n'a pas la forme d'un historique. Rien n'est ecrit.");
      return;
    }
    ecrirePuisRecharger(() => ecrireHistorique(valide));
  }, [ecrirePuisRecharger]);

  /*
   * Vider le vivier consomme les dix niveaux de CHAQUE carte du corpus monte.
   * C'est le seul chemin vers l'ecran d'epuisement qui ne demande pas de jouer
   * la soiree entiere, et il reste fidele : l'ecran n'apparait pas parce qu'on
   * l'a demande, mais parce que la pioche suivante ne rendra rien.
   *
   * L'historique existant est CONSERVE : une carte absente du corpus monte a pu
   * etre consommee ailleurs, et l'ecraser reglerait un probleme que personne n'a.
   */
  const viderLeVivier = useCallback(() => {
    const consomme = Object.fromEntries(corpus.map((carte) => [carte.id, NIVEAUX]));
    ecrirePuisRecharger(() => ecrireHistorique({ ...lireHistorique(), ...consomme }));
  }, [corpus, ecrirePuisRecharger]);

  /*
   * Aucun paquet coche est un etat que l'accueil sait afficher, PIOCHER
   * desactive et raison donnee, et qu'aucun geste ne peut plus produire depuis
   * le retrait du selecteur de paquets. Le correctif d'audit etait donc devenu
   * invisible ; il redevient controlable ici.
   */
  const decocherLesPaquets = useCallback(() => {
    ecrirePuisRecharger(() => ecrirePaquetsActifs([]));
  }, [ecrirePuisRecharger]);

  /*
   * Un signalement pose sans jouer : l'action COPIER LES SIGNALEMENTS n'est
   * visible que s'il en existe, et la faire apparaitre demandait autrement de
   * traverser un tour complet.
   */
  const poserUnSignalement = useCallback(() => {
    const premiere = corpus[0];
    if (premiere === undefined) {
      setMessage("Le corpus monte est vide, il n'y a rien a signaler.");
      return;
    }
    const question = premiere.questions[0];
    if (question === undefined) {
      setMessage("La premiere carte du corpus ne porte aucune question.");
      return;
    }
    ecrirePuisRecharger(() =>
      ecrireSignalements([
        ...lireSignalements(),
        {
          carte: premiere.id,
          niveau: question.niveau,
          theme: premiere.theme,
          q: question.q,
        },
      ]),
    );
  }, [corpus, ecrirePuisRecharger]);

  const effacerLeTour = useCallback(() => {
    ecrirePuisRecharger(effacerTour);
  }, [ecrirePuisRecharger]);

  /*
   * CHANGER DE CORPUS RECOCHE LES PAQUETS DU CORPUS VISE, et ce n'est pas une
   * commodite : c'est la reparation d'un artefact du banc lui-meme.
   *
   * `lirePaquetsActifs` ECARTE un identifiant que l'appelant ne reconnait pas,
   * ce qui est le bon comportement (storage/reglages.ts). Or le banc fait
   * quelque chose que l'application ne fait jamais : il monte DEUX VOCABULAIRES
   * DE PAQUETS DIFFERENTS sur la meme origine. Passer de `limites` a `pilote`
   * laisse donc un `_fixtures` que le corpus de production ne connait pas, il
   * est ecarte, la liste devient vide, et le banc s'ouvre sur un PIOCHER
   * desactive apres un simple changement de corpus.
   *
   * Ecrire les paquets du corpus vise ne masque rien : l'etat "aucun paquet
   * coche" reste atteignable par son propre geste, juste au-dessus, qui est le
   * seul chemin que la recette demande.
   */
  const changerDeCorpus = useCallback((vise: ChoixCorpus) => {
    ecrirePaquetsActifs(paquetsDuCorpus(corpusDuChoix(vise)));
    window.location.assign(urlDuChoix(vise));
  }, []);

  const toutEffacer = useCallback(() => {
    ecrirePuisRecharger(() => {
      for (const suffixe of SUFFIXES) effacer(suffixe);
    });
  }, [ecrirePuisRecharger]);

  return (
    <>
      <App corpus={corpus} />

      {!masque && (
        <div className={styles.declencheur}>
          <Bouton variante="secondaire" onClick={ouvrir}>
            Banc
          </Bouton>
        </div>
      )}

      <Feuille titre="Banc de recette" ouverte={ouvert} surFermeture={() => setOuvert(false)}>
        <div className={styles.panneau}>
          <section className={styles.rubrique}>
            <h3 className={styles.titre}>
              <Etiquette fonction="metadonnee">Le corpus monté</Etiquette>
            </h3>
            <p className={styles.phrase}>{DESCRIPTION_CORPUS[choix]}</p>
            <p className={styles.phrase}>
              {corpus.length} carte(s). Changer de corpus recharge la page : le choix vit dans
              l'URL, pas dans le stockage.
            </p>
            <Segment
              etiquette="Corpus monté"
              options={CORPUS_OPTIONS}
              valeur={choix}
              onChoisir={changerDeCorpus}
              className={styles.segment}
            />
          </section>

          <section className={styles.rubrique}>
            <h3 className={styles.titre}>
              <Etiquette fonction="metadonnee">Le stockage</Etiquette>
            </h3>
            <p className={styles.phrase}>
              Chaque geste écrit puis recharge, parce que l'état de la soirée est amorcé au
              démarrage et relu nulle part ailleurs.
            </p>
            {message !== null && (
              <p className={styles.phrase}>
                <Statut ton="signal">Refusé</Statut> {message}
              </p>
            )}
            <div className={styles.actions}>
              <Bouton variante="secondaire" onClick={chargerHistoriquePartiel}>
                Charger l'historique partiel
              </Bouton>
              <Bouton variante="secondaire" onClick={viderLeVivier}>
                Vider le vivier
              </Bouton>
              <Bouton variante="secondaire" onClick={decocherLesPaquets}>
                Décocher tous les paquets
              </Bouton>
              <Bouton variante="secondaire" onClick={poserUnSignalement}>
                Poser un signalement
              </Bouton>
              <Bouton variante="secondaire" onClick={effacerLeTour}>
                Effacer le tour en cours
              </Bouton>
              <Bouton variante="secondaire" onClick={toutEffacer}>
                Tout effacer
              </Bouton>
            </div>
          </section>

          <section className={styles.rubrique}>
            <h3 className={styles.titre}>
              <Etiquette fonction="metadonnee">Ce que portent les quatre clefs</Etiquette>
            </h3>
            {/*
             * LE CONTROLE DE P3 SE FAIT ICI, EN LISANT. La phase QUESTION ne
             * doit porter aucune reponse, dans l'etat en memoire comme dans la
             * clef : une fuite dans le stockage survivrait a la fermeture de
             * l'application, ce qui est pire. Ouvrir le banc en phase QUESTION
             * et chercher un champ "r" sous `diez:v1:tour` repond a la question
             * sans qu'on ait a croire un commentaire.
             *
             * La valeur affichee est celle que `storage/` a relue, reserialisee.
             * Ce n'est pas la chaine brute du navigateur, et c'est sans
             * consequence pour ce controle : un champ present dans la clef est
             * present ici, un champ absent y est absent.
             */}
            <p className={styles.phrase}>
              Relu par <code>storage/</code>, puis réécrit en JSON. Un champ présent dans la clef
              est présent ici.
            </p>
            <pre className={styles.diagnostic}>{diagnostic}</pre>
            <div className={styles.actions}>
              <Bouton variante="ghost" onClick={relire}>
                Relire
              </Bouton>
            </div>
          </section>

          <section className={styles.rubrique}>
            <h3 className={styles.titre}>
              <Etiquette fonction="metadonnee">Le banc lui-même</Etiquette>
            </h3>
            <p className={styles.phrase}>
              Le déclencheur flotte au-dessus de l'application et fausse donc les contrôles de mise
              en page. Le masquer rend l'écran à l'application ; un rechargement le ramène.
            </p>
            <div className={styles.actions}>
              <Bouton
                variante="secondaire"
                onClick={() => {
                  setMasque(true);
                  setOuvert(false);
                }}
              >
                Masquer le banc
              </Bouton>
            </div>
          </section>
        </div>
      </Feuille>
    </>
  );
}
