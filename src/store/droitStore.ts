import { createPersistedStore } from '../lib/persistenceManager'
import type { TypeEcheance, Echeance } from '../lib/droitEngine'

// ─── Types ────────────────────────────────────────────────────────────────────

export type { TypeEcheance, Echeance }

export interface Matiere {
  code: string
  nom: string
  court: string
  prof: string
  coef: number
  prep: number
}

export interface NotesDroit {
  matiere: string
  date: string
  titre: string
  extrait: string
  tags: string[]
}

export interface BiblioItem {
  type: string
  auteur: string
  titre: string
  meta: string
}

export interface BiblioDroit {
  matiere: string
  items: BiblioItem[]
}

export interface JalonCourant {
  label: string
  date: string // ISO YYYY-MM-DD
  prep: number
}

export interface Jalon {
  label: string
  date: string // formatted 'DD.MM'
  etat: 'fait' | 'en cours' | 'à faire'
}

export interface Memoire {
  titre: string
  directeur: string
  jalonCourant: JalonCourant
  pagesEcrites: number
  pagesTotal: number
  prochaineReunion: string
  jalonsTous: Jalon[]
}

export interface DroitStore {
  matieres: Matiere[]
  echeances: Echeance[]
  prep: Record<string, number>
  notes: NotesDroit[]
  biblio: BiblioDroit[]
  memoire: Memoire
  // actions
  setPrep: (id: string, value: number) => void
  updateEcheance: (id: string, data: Partial<Echeance>) => void
  addNote: (note: NotesDroit) => void
  updateMemoire: (data: Partial<Memoire>) => void
}

// ─── Données initiales ────────────────────────────────────────────────────────

const DEFAULT_MATIERES: Matiere[] = [
  { code: 'CTSP', nom: 'Droit des contrats spéciaux',        court: 'Contrats spéciaux', prof: 'Pr. Lévêque',      coef: 4, prep: 65 },
  { code: 'SURT', nom: 'Droit des sûretés',                  court: 'Sûretés',           prof: 'Pr. Vidal-Naquet', coef: 3, prep: 30 },
  { code: 'ARBI', nom: 'Arbitrage commercial international', court: 'Arbitrage',         prof: 'Me. Aubert',       coef: 3, prep: 80 },
  { code: 'EURO', nom: 'Droit européen des affaires',        court: 'Droit européen',    prof: 'Pr. Carrasco',     coef: 3, prep: 45 },
  { code: 'FISC', nom: 'Droit fiscal des entreprises',       court: 'Fiscal',            prof: 'Pr. Roussel',      coef: 4, prep: 25 },
  { code: 'CONC', nom: 'Droit de la concurrence',            court: 'Concurrence',       prof: 'Pr. Tchakhotine',  coef: 3, prep: 70 },
]

const DEFAULT_ECHEANCES: Echeance[] = [
  {
    id: 'arbi-expose', date: '2026-05-06', type: 'Exposé', matiereCode: 'ARBI',
    titre: 'Exposé · clause compromissoire dans les contrats internationaux',
    detail: '20 min · binôme Léa', poids: 'moyen',
  },
  {
    id: 'fisc-partiel', date: '2026-05-12', type: 'Partiel', matiereCode: 'FISC',
    titre: 'Partiel · Fiscalité des restructurations',
    detail: '3 h · cas pratique', poids: 'lourd',
  },
  {
    id: 'euro-note', date: '2026-05-18', type: 'Rendu', matiereCode: 'EURO',
    titre: "Note d'arrêt · CJUE Solvay c/ Commission",
    detail: '12 pages max.', poids: 'moyen',
  },
  {
    id: 'conc-partiel', date: '2026-05-22', type: 'Partiel', matiereCode: 'CONC',
    titre: 'Partiel · Pratiques anticoncurrentielles dans les marchés numériques',
    detail: '4 h · dissertation', poids: 'lourd',
  },
  {
    id: 'sur-comm', date: '2026-06-10', type: 'Rendu', matiereCode: 'SURT',
    titre: "Commentaire d'arrêt · Cass. com. 28 oct. 2025",
    detail: '8 pages', poids: 'moyen',
  },
]

const DEFAULT_PREP: Record<string, number> = {
  'arbi-expose': 70,
  'fisc-partiel': 25,
  'euro-note': 10,
  'conc-partiel': 60,
  'sur-comm': 0,
}

const DEFAULT_NOTES: NotesDroit[] = [
  {
    matiere: 'CTSP', date: '29.04',
    titre: 'Vente — délivrance et garantie',
    extrait: "La délivrance suppose la conformité de l'objet livré. Glissement art. 1604 → 1641 à travailler.",
    tags: ['Important'],
  },
  {
    matiere: 'SURT', date: '28.04',
    titre: 'Cautionnement disproportionné — arrêt 28 oct. 2025',
    extrait: "La disproportion s'apprécie au jour de la souscription. Renversement de charge à retenir.",
    tags: ['À réviser', 'Jurisprudence'],
  },
  {
    matiere: 'EURO', date: '24.04',
    titre: 'Abus de position dominante — marchés numériques',
    extrait: 'Doctrine Akman : self-preferencing comme catégorie autonome ?',
    tags: ['Doctrine'],
  },
  {
    matiere: 'ARBI', date: '22.04',
    titre: "Convention d'arbitrage — autonomie matérielle",
    extrait: "Art. 1447 CPC : la nullité du contrat n'emporte pas celle de la clause.",
    tags: ['Important'],
  },
  {
    matiere: 'FISC', date: '21.04',
    titre: 'Régime mère-fille — conditions',
    extrait: 'Détention min. 5 %, durée 2 ans, art. 145 CGI.',
    tags: ['À réviser'],
  },
  {
    matiere: 'CONC', date: '17.04',
    titre: 'Ententes verticales — exemption',
    extrait: 'Règlement 2022/720 : seuils 30 %, traitement plateformes.',
    tags: ['Doctrine'],
  },
]

const DEFAULT_BIBLIO: BiblioDroit[] = [
  {
    matiere: 'CTSP', items: [
      { type: 'Manuel',  auteur: 'Malaurie, Aynès, Gautier', titre: 'Les contrats spéciaux',            meta: '13ᵉ éd., LGDJ, 2024' },
      { type: 'Arrêt',   auteur: 'Cass. ch. mixte',          titre: '17 mai 2024 — délivrance conforme', meta: 'n° 22-17.892' },
    ],
  },
  {
    matiere: 'SURT', items: [
      { type: 'Code',   auteur: 'Code civil',   titre: 'Art. 2287 à 2502',                              meta: 'Dalloz 2026' },
      { type: 'Manuel', auteur: 'Pierre Crocq', titre: 'Droit des sûretés',                              meta: '12ᵉ éd., LGDJ, 2025' },
      { type: 'Arrêt',  auteur: 'Cass. com.',   titre: '28 oct. 2025 — cautionnement disproportionné',  meta: 'n° 24-11.402' },
    ],
  },
  {
    matiere: 'ARBI', items: [
      { type: 'Manuel',  auteur: 'Fouchard, Gaillard, Goldman', titre: "Traité de l'arbitrage commercial international", meta: '4ᵉ éd., LexisNexis, 2024' },
      { type: 'Article', auteur: 'E. Gaillard',                 titre: "L'autonomie matérielle de la convention d'arbitrage", meta: 'Rev. arb. 2025-2' },
    ],
  },
  {
    matiere: 'EURO', items: [
      { type: 'Arrêt',   auteur: 'CJUE',      titre: 'Solvay c/ Commission',                   meta: 'C-374/24' },
      { type: 'Article', auteur: 'P. Akman',  titre: 'Self-preferencing as Abuse of Dominance', meta: 'CMLR, 2024' },
    ],
  },
  {
    matiere: 'FISC', items: [
      { type: 'Code',   auteur: 'CGI',              titre: 'Art. 145, 209, 219, 223 A',              meta: 'LF 2026' },
      { type: 'Manuel', auteur: 'Cozian, Deboissy',  titre: 'Précis de fiscalité des entreprises',   meta: '49ᵉ éd., 2025' },
    ],
  },
  {
    matiere: 'CONC', items: [
      { type: 'Article', auteur: 'A. Lamadon', titre: 'Règlement 2022/720 et plateformes', meta: 'RTD eur. 2025-3' },
    ],
  },
]

const DEFAULT_MEMOIRE: Memoire = {
  titre: "L'autonomie de la clause compromissoire face aux nullités du contrat-cadre",
  directeur: 'Pr. Lévêque',
  jalonCourant: { label: 'Plan détaillé + biblio', date: '2026-06-03', prep: 40 },
  pagesEcrites: 24,
  pagesTotal: 80,
  prochaineReunion: 'jeu. 14 mai · 11h00',
  jalonsTous: [
    { label: 'Sujet validé',  date: '18.02', etat: 'fait' },
    { label: 'Plan + biblio', date: '03.06', etat: 'en cours' },
    { label: 'V1 rédigée',    date: '20.06', etat: 'à faire' },
    { label: 'Rendu final',   date: '24.06', etat: 'à faire' },
    { label: 'Soutenance',    date: '08.07', etat: 'à faire' },
  ],
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDroitStore = createPersistedStore<DroitStore>(
  'aetheris-droit-v1',
  (set) => ({
    matieres:  DEFAULT_MATIERES,
    echeances: DEFAULT_ECHEANCES,
    prep:      DEFAULT_PREP,
    notes:     DEFAULT_NOTES,
    biblio:    DEFAULT_BIBLIO,
    memoire:   DEFAULT_MEMOIRE,

    setPrep: (id, value) =>
      set((s) => ({ prep: { ...s.prep, [id]: value } })),

    updateEcheance: (id, data) =>
      set((s) => ({
        echeances: s.echeances.map((e) => (e.id === id ? { ...e, ...data } : e)),
      })),

    addNote: (note) =>
      set((s) => ({ notes: [note, ...s.notes] })),

    updateMemoire: (data) =>
      set((s) => ({ memoire: { ...s.memoire, ...data } })),
  }),
)
