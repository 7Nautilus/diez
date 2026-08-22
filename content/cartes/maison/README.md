# Paquet `maison`

Les cartes écrites à la main sur le groupe. Souvenirs, habitudes, blagues internes. C'est probablement le contenu que vos soirées préféreront.

## Ce dépôt est public

C'est la seule chose à retenir avant d'écrire ici. Le corpus est hébergé sur GitHub Pages, ce qui impose un dépôt public, donc **tout ce que vous écrivez dans ce dossier est lisible par n'importe qui et indexable par les moteurs de recherche.**

Trois règles, à respecter à l'écriture et à contrôler à la relecture.

**Prénoms uniquement.** Jamais de noms de famille.

**Aucune donnée personnelle.** Ni adresse, ni numéro, ni employeur, ni pseudo réutilisé ailleurs. Rien qui permette de relier un prénom à une personne réelle.

**Rien qui puisse blesser la personne si elle tombe dessus.** C'est la vraie règle. Un dépôt public est permanent et indexé : une vanne écrite un soir de 2026 reste lisible en 2031, par l'intéressé, ou par quelqu'un qui cherche son prénom.

Le critère d'écriture est donc **« est-ce que je lui montrerais ? »**, pas « est-ce que ça fait rire ce soir ? ».

## Ce que le validateur fait, et ne fait pas

`tools/valider.ts` relève chaque nom propre détecté dans ce dossier, c'est-à-dire chaque mot capitalisé hors début de phrase, et les liste en avertissement. **Il ne bloque pas et ne devine rien.** Distinguer un prénom d'un nom de famille par programme produirait surtout des faux positifs.

Son rôle est de forcer un regard humain sur la liste avant chaque publication. La règle éditoriale reste une décision d'écriture, jamais un test automatique.

## Format

Identique aux autres paquets, validé par `../../schema/lot.schema.json` :

```json
{
  "$schema": "../../schema/lot.schema.json",
  "lot": "maison-001",
  "cartes": [
    {
      "id": "maison-001",
      "theme": "Un thème de 40 caractères maximum",
      "paquet": "maison",
      "domaine": "insolite",
      "source": "manuel",
      "valide": false,
      "questions": [ "dix questions, niveaux 1 a 10, un seul de chaque" ]
    }
  ]
}
```

`valide` reste à `false` tant que la carte n'a pas été relue par quelqu'un d'autre que son auteur. Le compilateur exclut les cartes non validées, donc une carte écrite à une heure du matin ne peut pas atteindre la soirée suivante sans être passée sous un second regard.
