import { useEffect, useState, useSyncExternalStore } from "react";
import { Etiquette } from "../components/Etiquette";
import { Segment } from "../components/Segment";
import { Inventaire } from "./Inventaire";
import styles from "./PlancheDeControle.module.css";

/*
 * Diez : la planche de controle des deux modes.
 *
 * C'est le critere de sortie de la phase 3 (docs/roadmap.md) : l'inventaire
 * complet des primitives rendu dans les deux modes, et la bascule manuelle qui
 * gagne dans les deux sens. La raison d'etre est ecrite en toutes lettres dans
 * design-system.md section 2 : sans cette planche, "les deux modes a egalite"
 * redevient "un mode soigne et un mode approximatif" en trois semaines.
 *
 * ELLE NE PART JAMAIS EN PRODUCTION. Le montage est dans src/App.tsx, sous
 * `import.meta.env.DEV`, et il est temporaire : voir le commentaire qui l'y
 * accompagne.
 *
 * LES DEUX MODES COTE A COTE, SANS DUPLIQUER UNE SEULE VALEUR. Chaque panneau
 * force son propre `color-scheme` dans le module CSS. `light-dark()` se resout
 * d'apres le `color-scheme` calcule de l'element qui CONSOMME la variable, pas
 * de celui ou elle est definie : les tokens de :root traversent donc les deux
 * panneaux et rendent deux resultats differents. Aucun bloc conditionnel,
 * aucune palette recopiee, ce qui est exactement la promesse de tokens.css.
 */

const MODES = [
  { valeur: "auto", libelle: "Auto" },
  { valeur: "sombre", libelle: "Sombre" },
  { valeur: "clair", libelle: "Clair" },
] as const;

type Mode = (typeof MODES)[number]["valeur"];

const REQUETE_SOMBRE = "(prefers-color-scheme: dark)";

function souscrireAuSysteme(rappel: () => void): () => void {
  const requete = window.matchMedia(REQUETE_SOMBRE);
  requete.addEventListener("change", rappel);
  return () => {
    requete.removeEventListener("change", rappel);
  };
}

function lireLeSysteme(): "sombre" | "clair" {
  return window.matchMedia(REQUETE_SOMBRE).matches ? "sombre" : "clair";
}

export function PlancheDeControle() {
  const [mode, setMode] = useState<Mode>("auto");

  /*
   * `useSyncExternalStore` plutot qu'un `useEffect` avec un etat parallele :
   * le reglage du systeme est une source exterieure, et c'est precisement en
   * le changeant PENDANT que la planche est ouverte qu'on verifie que la
   * bascule manuelle gagne. Le rendu doit donc suivre, sans etape
   * intermediaire ou les deux pourraient diverger.
   */
  const systeme = useSyncExternalStore(souscrireAuSysteme, lireLeSysteme);

  /*
   * L'attribut est pose sur la racine du document et nulle part ailleurs :
   * c'est la seule surface sur laquelle tokens.css declare ses trois regles.
   * Le retrait est ce qui rend l'etat AUTO, aucun troisieme selecteur n'ayant
   * a exister pour lui.
   *
   * `design/` ne remonte jamais vers `storage/` : le choix n'est donc PAS
   * persiste ici, alors que design-system.md section 2 le prevoit persiste
   * dans le jeu. Ce cablage appartient a l'ecran d'accueil, en phase 4.
   */
  useEffect(() => {
    const racine = document.documentElement;
    if (mode === "auto") racine.removeAttribute("data-mode");
    else racine.setAttribute("data-mode", mode);
    return () => {
      racine.removeAttribute("data-mode");
    };
  }, [mode]);

  return (
    <div className={styles.planche}>
      <header className={styles.entete}>
        <h1 className={styles.titre}>Planche de contrôle</h1>

        <Segment etiquette="Mode d'affichage" options={MODES} valeur={mode} onChoisir={setMode} />

        <dl className={styles.temoin}>
          <div className={styles.mesure}>
            <dt>
              <Etiquette fonction="metadonnee">Système</Etiquette>
            </dt>
            <dd>
              <Etiquette fonction="etat">{systeme}</Etiquette>
            </dd>
          </div>
          <div className={styles.mesure}>
            <dt>
              <Etiquette fonction="metadonnee">Choix</Etiquette>
            </dt>
            <dd>
              <Etiquette fonction="etat">{mode}</Etiquette>
            </dd>
          </div>
          <div className={styles.mesure}>
            <dt>
              <Etiquette fonction="metadonnee">Rendu</Etiquette>
            </dt>
            <dd>
              {/*
               * Les deux mots sont empiles et l'un des deux est transparent :
               * c'est le mecanisme des tokens qui choisit lequel s'affiche.
               * SYSTEME et CHOIX sont des declarations, RENDU est une mesure.
               * Les deux `span` sont retires de l'arbre d'accessibilite parce
               * qu'ils sont deux moities d'un seul mot, et que les deux lignes
               * precedentes disent deja en texte ce qui a ete demande.
               */}
              <Etiquette fonction="etat" className={styles.rendu}>
                <span aria-hidden="true" className={styles.renduClair}>
                  Clair
                </span>
                <span aria-hidden="true" className={styles.renduSombre}>
                  Sombre
                </span>
              </Etiquette>
            </dd>
          </div>
        </dl>

        <p className={styles.consigne}>
          <Etiquette fonction="instruction">
            La bascule doit gagner dans les deux sens. Forcez CLAIR pendant que le système est en
            sombre, puis SOMBRE pendant qu'il est en clair : RENDU suit le choix, jamais le système.
            En AUTO, il suit le système.
          </Etiquette>
        </p>
      </header>

      <div className={styles.panneaux}>
        <Panneau schema="clair" />
        <Panneau schema="sombre" />
      </div>
    </div>
  );
}

type ProprietesPanneau = {
  schema: "clair" | "sombre";
};

const ENSEIGNES: Record<ProprietesPanneau["schema"], string> = {
  clair: "Mode clair",
  sombre: "Mode sombre",
};

function Panneau({ schema }: ProprietesPanneau) {
  return (
    <section className={styles.panneau} data-schema={schema}>
      <h2 className={styles.enseigne}>
        <Etiquette fonction="metadonnee">{ENSEIGNES[schema]}</Etiquette>
      </h2>
      <Inventaire />
    </section>
  );
}
