import { useId, useState } from "react";
import { Bouton } from "../design/components/Bouton";
import { Etiquette } from "../design/components/Etiquette";
import { type FormeSelecteur, SelecteurNiveau } from "../design/components/SelecteurNiveau";
import { type Niveau as Cran, NIVEAUX, type ResumeCarte } from "../domain/types";
import styles from "./Niveau.module.css";

/*
 * Diez : l'ecran NIVEAU.
 *
 * L'ECRAN A VISEE PRECISE, ET LE SEUL SANS RETOUR une fois le niveau choisi :
 * la transition QUESTION vers NIVEAU n'existe pas dans le type, et le niveau
 * est consomme des l'entree en QUESTION (architecture.md sections 5 et 6).
 * Toute la mise en page en decoule, et la raison est ecrite dans le module
 * CSS, la ou quelqu'un aura envie de "centrer" la pile.
 *
 * P3 : l'ecran ne recoit que ce que la phase NIVEAU porte, un ResumeCarte et
 * les niveaux consommes. Ni enonce, ni reponse, ni carte entiere ; les champs
 * a `never` de ResumeCarte les refusent a la compilation (domain/types.ts).
 *
 * Il ne lit aucune horloge, ne tire aucun hasard, n'ecrit dans aucun
 * stockage, et n'appelle aucun reducteur : le verrou d'entree protege la
 * phase depuis app/, ou aboutissent `onChoisir` et `onRetour`
 * (architecture.md section 10). Un verrou pose ici en doublerait un autre,
 * et deux delais qui se recouvrent ne se debuguent plus.
 */

/*
 * Le type `Niveau` du domaine est renomme A L'IMPORT, ce que le depot evite
 * partout ailleurs. Le composant s'appelle `Niveau` parce que le fichier
 * s'appelle Niveau.tsx (conventions-code.md section 4), et les deux noms ne
 * peuvent pas coexister dans un module. `Cran` n'est pas un synonyme invente
 * pour l'occasion : c'est le mot que le systeme emploie deja pour un echelon
 * du selecteur (design-system.md section 4, La molette).
 */

export type ProprietesNiveau = {
  carte: ResumeCarte;
  consommes: readonly Cran[];
  onChoisir: (niveau: Cran) => void;
  onRetour: () => void;
  /**
   * La molette par defaut, la grille conservee et commutable
   * (design-system.md section 4, NIVEAU). Le choix se tranchera en soiree et
   * pas par argument, donc il doit rester commutable sans toucher au code.
   *
   * Il entre par une propriete plutot que par un etat local : un ecran est
   * une fonction de ses proprietes et ne lit aucun reglage lui-meme. La
   * valeur vient donc d'app/, seul a pouvoir la lire dans storage/.
   */
  forme?: FormeSelecteur;
};

/*
 * LE CRAN OU LA MOLETTE S'OUVRE : le premier de l'echelle, quel que soit son
 * etat.
 *
 * Ouvrir sur le premier cran LIBRE ferait gagner un geste, et c'est
 * exactement ce que la molette refuse ailleurs : pas de saut automatique, une
 * molette qui esquive des crans toute seule est incomprehensible
 * (design-system.md section 4, La molette). Un depart qui dependrait des
 * questions deja jouees placerait l'echelle ailleurs a chaque carte, sans
 * que rien ne l'explique. Elle s'ouvre donc toujours au meme endroit, et si
 * ce cran est brule l'ecran le DIT au lieu de l'esquiver.
 *
 * Lu dans NIVEAUX plutot qu'ecrit : l'echelle du jeu a une source unique
 * (domain/types.ts), et un 1 ecrit ici en serait une seconde.
 */
const PREMIER_CRAN = NIVEAUX[0];

/*
 * LA RAISON DU REFUS. C'est l'exigence que la phase 3 a explicitement laissee
 * a cet ecran.
 *
 * Le SelecteurNiveau refuse un cran consomme EN SILENCE : lui seul connait
 * `consommes`, mais il n'a aucun bouton a desactiver. L'ecran en a un, et un
 * bouton desactive sans explication est une impasse. C'est le correctif
 * d'audit deja applique a PIOCHER sur l'accueil (design-system.md section 4).
 *
 * La grille n'a rien a expliquer : elle engage au tap et ne designe rien,
 * donc il n'existe aucun cran a propos duquel se taire.
 */
function raisonDuRefus(
  designe: Cran,
  consommes: readonly Cran[],
  forme: FormeSelecteur,
): string | null {
  if (forme === "grille" || !consommes.includes(designe)) return null;
  return `Niveau ${designe} déjà joué`;
}

export function Niveau({
  carte,
  consommes,
  onChoisir,
  onRetour,
  forme = "molette",
}: ProprietesNiveau) {
  /*
   * La designation est un etat d'ECRAN et non un etat de jeu, et c'est ce qui
   * autorise un `useState` sur un ecran par ailleurs pur : faire tourner la
   * molette n'engage rien, seul `onChoisir` sort d'ici. Le niveau designe n'a
   * donc rien a faire dans EtatTour, ou il serait un second endroit ou le
   * niveau pourrait exister.
   *
   * Il vit le temps d'un montage, ce qui suffit : on n'entre en NIVEAU que
   * depuis THEME, donc l'ecran est remonte a chaque tour et la molette rouvre
   * au premier cran sans qu'aucun effet n'ait a la reinitialiser.
   */
  const [designe, setDesigne] = useState<Cran>(PREMIER_CRAN);
  const idRaison = useId();
  const raison = raisonDuRefus(designe, consommes, forme);

  return (
    /*
     * Un `main` : c'est le contenu principal de la page, et un seul ecran est
     * monte a la fois. Le conteneur de phase d'app/, celui qui portera
     * l'annonce de changement d'ecran, doit donc rester un `div` : deux
     * `main` imbriques ne sont pas du HTML valide.
     */
    <main className={styles.ecran}>
      {/*
       * Le rappel du theme est en tertiaire, en metadonnee, en haut
       * (design-system.md section 4, NIVEAU) : il situe la carte sans
       * concurrencer l'echelle.
       *
       * Il porte pourtant le `h1`, contre l'habitude qui le donne au contenu
       * primaire (section 9). Le primaire de cet ecran est une echelle de
       * chiffres, qui n'est le titre de rien, et sans ce h1 l'ecran n'en
       * aurait aucun : une navigation par titres perdrait une etape sur cinq
       * du parcours. Le h1 n'apporte que la structure, l'Etiquette porte le
       * traitement.
       */}
      <h1 className={styles.rappel}>
        <Etiquette fonction="metadonnee">{carte.theme}</Etiquette>
      </h1>

      <div className={styles.pile}>
        <SelecteurNiveau
          niveaux={NIVEAUX}
          consommes={consommes}
          forme={forme}
          designe={designe}
          onDesigner={setDesigne}
          onValider={onChoisir}
        />

        <div className={styles.actions}>
          {/*
           * LA GRILLE N'A PAS DE BOUTON D'AVANCEMENT, et ce n'est pas un
           * oubli : elle engage au tap, donc un bouton ferait une seconde
           * maniere de faire la meme chose, et il n'aurait de toute facon
           * aucun cran a valider puisqu'elle ne designe rien. VOIR LA
           * QUESTION appartient a la molette, qui separe la designation de
           * l'engagement (design-system.md section 4, La molette).
           */}
          {forme === "grille" ? null : (
            <div className={styles.rang}>
              {/*
               * `output` plutot qu'un `div` porteur de `role="status"` :
               * l'element natif porte le role et sa region live polie, donc
               * aucun attribut ARIA n'a a etre pose.
               *
               * IL EST TOUJOURS RENDU, MEME VIDE, pour deux raisons qui
               * pointent dans le meme sens. Une region live inseree en meme
               * temps que son texte n'est pas annoncee de facon fiable, le
               * lecteur d'ecran devant l'observer avant qu'elle change : la
               * region posee sans comportement rendu est precisement ce
               * qu'un audit a deja releve sur ce projet. Et une rangee qui
               * apparaitrait deplacerait les deux boutons sous le pouce a
               * l'instant meme ou la molette passe sur un cran brule, sur le
               * seul ecran ou un tap ne se rattrape pas.
               */}
              <output className={styles.raison} id={idRaison}>
                {raison === null ? null : <Etiquette fonction="instruction">{raison}</Etiquette>}
              </output>
              <Bouton
                variante="primaire"
                disabled={raison !== null}
                /* La raison est adjacente a l'oeil ; `aria-describedby` est ce
                   qui la rattache au bouton pour qui ne voit pas la
                   disposition. */
                aria-describedby={raison === null ? undefined : idRaison}
                onClick={() => onChoisir(designe)}
              >
                Voir la question
              </Bouton>
            </div>
          )}

          {/*
           * DERNIER RANG, et c'est la regle des deux emplacements : ANNONCER
           * LES CHIFFRES occupait ce rang sur l'ecran precedent, a 0 px
           * (design-system.md, La regle des deux emplacements). Un second tap
           * parti d'un narrateur qui regardait la table tombe donc ici, et la
           * boucle revient a THEME sans rien perdre. C'est la seule
           * superposition acceptee de tout le parcours, et elle est acceptee
           * parce qu'elle ne detruit aucune information.
           *
           * `ghost` et non `secondaire` : l'ecran ne porte qu'une action
           * primaire, et un second bouton borde juste en dessous se lirait
           * comme un deuxieme appel a agir. C'est le traitement de SIGNALER
           * sur l'ecran REPONSE, qui occupe le meme rang pour la meme raison.
           */}
          <Bouton variante="ghost" onClick={onRetour}>
            Retour au thème
          </Bouton>
        </div>
      </div>
    </main>
  );
}
