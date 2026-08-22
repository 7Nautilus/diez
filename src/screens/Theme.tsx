import { Bouton } from "../design/components/Bouton";
import { Etiquette } from "../design/components/Etiquette";
import type { CarteId, ResumeCarte } from "../domain/types";
import styles from "./Theme.module.css";
import { LIBELLE_PAQUET } from "./types";

/*
 * Diez : la phase THEME.
 *
 * Trois couches et une seule rupture (design-system.md section 4, THEME) :
 * l'intitule seul en primaire, RIEN en secondaire, le paquet en haut et le
 * numero de carte en bas en tertiaire. La rupture est le VIDE, et c'est la
 * seule chose de cet ecran qu'il ne faut pas combler : le narrateur lit a
 * voix haute en relevant la tete vers la table, et perd sa ligne a chaque
 * regard. Une typographie large isolee dans le vide se retrouve
 * instantanement, c'est la logique du prompteur.
 *
 * L'ecran est une fonction de ses proprietes : aucune horloge, aucun hasard,
 * aucun stockage, et AUCUN garde anti-double-tap. Le verrou d'entree vit dans
 * le reducteur, ou il couvre d'un seul geste toutes les actions de toutes les
 * phases (architecture.md section 10). Un second garde pose ici serait une
 * deuxieme source de verite pour VERROU_MS, donc une divergence en attente.
 *
 * AUCUN `aria-live` ici non plus. L'annonce de changement de phase est portee
 * une fois pour toutes par la zone de phase, dans app/ (design-system.md
 * section 9) : une region live imbriquee dans une autre fait annoncer son
 * contenu deux fois, ce que le Statut documente deja de son cote.
 */

/*
 * Paliers de taille de l'intitule, design-system.md section 4, THEME. Ce ne
 * sont pas des preferences de mise en page : au-dela de ces longueurs, la
 * taille display deborde ou consomme le vide, qui est precisement la rupture
 * de cet ecran. Le troisieme palier est un AVERTISSEMENT et non une cible,
 * un intitule qui y tombe doit etre raccourci plutot que la page pliee ; le
 * lot pilote plafonne a 26 caracteres, donc le cas reste rare.
 */
const PALIER_LARGE_MAX = 20;
const PALIER_MOYEN_MAX = 32;

type PalierIntitule = "large" | "moyen" | "reduit";

function palierDeLIntitule(intitule: string): PalierIntitule {
  if (intitule.length <= PALIER_LARGE_MAX) return "large";
  if (intitule.length <= PALIER_MOYEN_MAX) return "moyen";
  return "reduit";
}

/*
 * La table des libelles de paquet etait ecrite ici. Elle est passee dans
 * ./types.ts a la composition : l'accueil affiche les memes mots sur ses
 * pilules, et deux tables pour un seul jeu de paquets divergent sans que rien
 * ne le signale.
 */

/*
 * Le numero affiche se DERIVE de l'identifiant, il ne se compte pas. Un
 * compteur d'affichage serait une seconde numerotation, et deux numerotations
 * divergent des qu'une carte entre ou sort du corpus, alors que l'identifiant
 * est stable et jamais recycle (architecture.md section 4).
 *
 * LIMITE CONNUE, signalee au rapport plutot que contournee ici. Les
 * identifiants du corpus sont des slugs suffixes d'un rang PAR SUJET
 * (`capitales-monde-001`) et non d'un rang global : les dix cartes pilotes se
 * terminent toutes par 001, donc cette metadonnee affiche aujourd'hui le meme
 * numero sur toutes. La derivation est juste, c'est la source qui ne porte
 * aucun numero de carte. Trancher demande soit un rang global emis par
 * tools/compiler.ts, soit le retrait de cette ligne : ni l'un ni l'autre
 * n'appartient a cet ecran.
 *
 * Le schema du corpus n'impose aucun suffixe chiffre (`^_?[a-z0-9]+(-[a-z0-9]+)*$`),
 * donc l'absence est un cas normal : la metadonnee disparait, elle n'affiche
 * pas un numero invente.
 */
const CHIFFRES_FINAUX = /\d+$/;

/** Trois chiffres, la forme `CARTE 042` de design-system.md section 4. */
const LARGEUR_NUMERO = 3;

function numeroDeCarte(id: CarteId): string | null {
  const trouve = CHIFFRES_FINAUX.exec(id);
  if (trouve === null) return null;
  return trouve[0].padStart(LARGEUR_NUMERO, "0");
}

export type ProprietesTheme = {
  carte: ResumeCarte;
  onAnnoncer: () => void;
};

export function Theme({ carte, onAnnoncer }: ProprietesTheme) {
  const numero = numeroDeCarte(carte.id);

  return (
    <section className={styles.ecran}>
      <Etiquette fonction="metadonnee">Paquet {LIBELLE_PAQUET[carte.paquet]}</Etiquette>

      {/* Le `h1` porte le contenu primaire de la phase, ici l'intitule
          (design-system.md section 9, Structure semantique). */}
      <h1 className={styles.intitule} data-palier={palierDeLIntitule(carte.theme)}>
        {carte.theme}
      </h1>

      <div className={styles.pileBasse}>
        {numero === null ? null : <Etiquette fonction="metadonnee">Carte {numero}</Etiquette>}

        {/*
         * Le libelle porte le geste du modele, ou TOUT LE MONDE annonce son
         * chiffre : `ANNONCER` seul ne disait ni quoi ni qui (design-system.md
         * section 4, correctif d'audit). Les capitales viennent du Bouton.
         */}
        <Bouton className={styles.action} variante="primaire" onClick={onAnnoncer}>
          Annoncer les chiffres
        </Bouton>
      </div>
    </section>
  );
}
