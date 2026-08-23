/*
 * Sonde de la phase 5 : les comportements d'execution, rejoues sans DOM.
 *
 * Le fichier vit dans le bac a sable tant que le perimetre de l'agent tient a
 * un seul fichier. Il est ecrit pour etre depose tel quel en
 * `src/app/__tests__/execution.test.ts` : `vitest.config.ts` inclut deja
 * `src/app/**\/*.test.ts`, et rien ici ne monte de composant.
 */

import {
  abonnerALaVisibilite,
  creerMaintien,
  creerRelaisDeMiseAJour,
  type DemandeDeMaintien,
  type InscrireLeServiceWorker,
  proposer,
} from "../execution";

/* --- Le faux navigateur ------------------------------------------------- */

type FausseSentinelle = { released: boolean; release: () => Promise<void> };

function fauxNavigateur(options: { refuse?: boolean } = {}) {
  let demandes = 0;
  let relachements = 0;
  let derniere: FausseSentinelle | null = null;

  const demander: DemandeDeMaintien = async () => {
    demandes += 1;
    if (options.refuse) throw new Error("NotAllowedError");
    const sentinelle: FausseSentinelle = {
      released: false,
      release: async () => {
        if (sentinelle.released) return;
        sentinelle.released = true;
        relachements += 1;
      },
    };
    derniere = sentinelle;
    return sentinelle;
  };

  return {
    demander,
    demandes: () => demandes,
    relachements: () => relachements,
    /*
     * Ce que le navigateur fait de lui-meme quand l'onglet passe en
     * arriere-plan : il reprend le verrou. Il ne compte donc pas comme un
     * relachement de notre fait.
     */
    reprendreLeVerrou: () => {
      if (derniere !== null) derniere.released = true;
    },
  };
}

/* --- 1. Le maintien de l'ecran allume ----------------------------------- */

describe("le maintien de l'ecran allume", () => {
  it("tient le verrou hors du repos et le rend au repos", async () => {
    const faux = fauxNavigateur();
    const maintien = creerMaintien(faux.demander);

    await maintien.viser(true);
    expect(maintien.tenu()).toBe(true);
    expect(faux.demandes()).toBe(1);

    await maintien.viser(false);
    expect(maintien.tenu()).toBe(false);
    expect(faux.relachements()).toBe(1);
  });

  it("ne leve rien et ne tient rien quand l'API est absente", async () => {
    const maintien = creerMaintien(null);
    await maintien.viser(true);
    expect(maintien.tenu()).toBe(false);
    await maintien.signalerVisibilite(false);
    await maintien.signalerVisibilite(true);
    await maintien.viser(false);
    expect(maintien.tenu()).toBe(false);
  });

  it("ne leve rien quand le navigateur refuse la demande", async () => {
    const faux = fauxNavigateur({ refuse: true });
    const maintien = creerMaintien(faux.demander);
    await maintien.viser(true);
    expect(faux.demandes()).toBe(1);
    expect(maintien.tenu()).toBe(false);
  });

  it("reprend le verrou perdu par un passage en arriere-plan", async () => {
    const faux = fauxNavigateur();
    const maintien = creerMaintien(faux.demander);

    await maintien.viser(true);
    expect(faux.demandes()).toBe(1);

    // Le navigateur reprend le verrou, puis previent.
    faux.reprendreLeVerrou();
    await maintien.signalerVisibilite(false);
    expect(maintien.tenu()).toBe(false);

    await maintien.signalerVisibilite(true);
    expect(faux.demandes()).toBe(2);
    expect(maintien.tenu()).toBe(true);
  });

  it("ne redemande rien au retour au premier plan si la phase est REPOS", async () => {
    const faux = fauxNavigateur();
    const maintien = creerMaintien(faux.demander);

    await maintien.signalerVisibilite(false);
    await maintien.signalerVisibilite(true);
    expect(faux.demandes()).toBe(0);
  });

  it("ne demande jamais deux verrous a la fois", async () => {
    const faux = fauxNavigateur();
    const maintien = creerMaintien(faux.demander);

    await Promise.all([maintien.viser(true), maintien.viser(true)]);
    expect(faux.demandes()).toBe(1);
  });

  it("ne prend aucun verrou quand la phase est repartie avant la reponse", async () => {
    const faux = fauxNavigateur();
    const maintien = creerMaintien(faux.demander);

    const enCours = maintien.viser(true);
    const annule = maintien.viser(false);
    await Promise.all([enCours, annule]);

    expect(faux.demandes()).toBe(0);
    expect(maintien.tenu()).toBe(false);
  });
});

/* --- 2. La mise a jour --------------------------------------------------- */

function fauxPlugin() {
  let inscriptions = 0;
  let appliques = 0;
  let annoncer: (() => void) | null = null;

  const inscrire: InscrireLeServiceWorker = (rappels) => {
    inscriptions += 1;
    annoncer = rappels.onNeedRefresh;
    return async () => {
      appliques += 1;
    };
  };

  return {
    inscrire,
    inscriptions: () => inscriptions,
    appliques: () => appliques,
    /** Ce que le plugin appelle quand une nouvelle version attend. */
    versionEnAttente: () => {
      if (annoncer !== null) annoncer();
    },
  };
}

describe("la mise a jour", () => {
  it("n'inscrit le service worker qu'une fois, meme demarre deux fois", () => {
    const plugin = fauxPlugin();
    const relais = creerRelaisDeMiseAJour(plugin.inscrire, () => {});
    relais.demarrer();
    relais.demarrer();
    expect(plugin.inscriptions()).toBe(1);
  });

  it("ne propose rien et ne leve rien sans service worker", () => {
    let prevenus = 0;
    const relais = creerRelaisDeMiseAJour(null, () => {
      prevenus += 1;
    });
    relais.demarrer();
    relais.appliquer();
    expect(relais.prete()).toBe(false);
    expect(prevenus).toBe(0);
  });

  it("previent une fois quand une version attend", () => {
    const plugin = fauxPlugin();
    let prevenus = 0;
    const relais = creerRelaisDeMiseAJour(plugin.inscrire, () => {
      prevenus += 1;
    });
    relais.demarrer();
    expect(relais.prete()).toBe(false);

    plugin.versionEnAttente();
    expect(relais.prete()).toBe(true);
    expect(prevenus).toBe(1);
  });

  it("ne recharge rien tant qu'aucune version n'attend", () => {
    const plugin = fauxPlugin();
    const relais = creerRelaisDeMiseAJour(plugin.inscrire, () => {});
    relais.demarrer();
    relais.appliquer();
    expect(plugin.appliques()).toBe(0);

    plugin.versionEnAttente();
    relais.appliquer();
    expect(plugin.appliques()).toBe(1);
  });
});

describe("la regle de phase de la mise a jour", () => {
  it("ne propose pas une version prete hors du repos", () => {
    let appliques = 0;
    const proposition = proposer(true, false, () => {
      appliques += 1;
    });
    expect(proposition.attend).toBe(false);
    proposition.appliquer();
    expect(appliques).toBe(0);
  });

  it("propose la version prete au repos, et l'applique", () => {
    let appliques = 0;
    const proposition = proposer(true, true, () => {
      appliques += 1;
    });
    expect(proposition.attend).toBe(true);
    proposition.appliquer();
    expect(appliques).toBe(1);
  });

  it("ne propose rien au repos tant qu'aucune version n'attend", () => {
    let appliques = 0;
    const proposition = proposer(false, true, () => {
      appliques += 1;
    });
    expect(proposition.attend).toBe(false);
    proposition.appliquer();
    expect(appliques).toBe(0);
  });
});

/*
 * LE CABLAGE, ET NON PLUS SEULEMENT LA MACHINE. Les tests ci-dessus pilotent
 * `signalerVisibilite` a la main : ils prouvent que le maintien REAGIT bien a un
 * changement de visibilite, jamais qu'il en est PREVENU. Mutation qui a revele
 * le trou : remplacer l'inscription de l'ecouteur par son retrait laissait les
 * 241 tests verts. Le verrou aurait tenu la premiere question, puis plus jamais.
 */
describe("l'abonnement a la visibilite", () => {
  const fausseCible = () => {
    const ecouteurs = new Map<string, EventListener>();
    return {
      cible: {
        addEventListener: (t: string, f: EventListener) => ecouteurs.set(t, f),
        removeEventListener: (t: string, f: EventListener) => {
          if (ecouteurs.get(t) === f) ecouteurs.delete(t);
        },
      } as Pick<Document, "addEventListener" | "removeEventListener">,
      inscrits: () => [...ecouteurs.keys()],
      declencher: (t: string) => ecouteurs.get(t)?.(new Event(t)),
    };
  };

  it("inscrit un ecouteur de visibilite", () => {
    const f = fausseCible();
    abonnerALaVisibilite(
      f.cible,
      () => true,
      () => {},
    );
    expect(f.inscrits()).toEqual(["visibilitychange"]);
  });

  it("lit l'etat de depart au lieu de le supposer", () => {
    const f = fausseCible();
    const vus: boolean[] = [];
    abonnerALaVisibilite(
      f.cible,
      () => false,
      (v) => vus.push(v),
    );
    expect(vus).toEqual([false]);
  });

  it("previent a chaque changement, et rend la valeur relue", () => {
    const f = fausseCible();
    let visible = true;
    const vus: boolean[] = [];
    abonnerALaVisibilite(
      f.cible,
      () => visible,
      (v) => vus.push(v),
    );
    visible = false;
    f.declencher("visibilitychange");
    visible = true;
    f.declencher("visibilitychange");
    expect(vus).toEqual([true, false, true]);
  });

  it("se desabonne vraiment, et ne previent plus ensuite", () => {
    const f = fausseCible();
    const vus: boolean[] = [];
    const desabonner = abonnerALaVisibilite(
      f.cible,
      () => true,
      (v) => vus.push(v),
    );
    desabonner();
    expect(f.inscrits()).toEqual([]);
    f.declencher("visibilitychange");
    expect(vus).toHaveLength(1);
  });
});
