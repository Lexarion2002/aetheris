import { createPersistedStore } from '../lib/persistenceManager'

// ─── Types ────────────────────────────────────────────────────────────────────
//
// Modèle juin 2026 — Hub par matière :
//   Matiere → Sujets (4 cases F/R/S/Q + confiance 🔴🟠🟢)
//   Matiere → Simulations (log d'oraux chronométrés)
//   Matiere → Flashcards (SM-2, rattachables à un sujet)
//   Dossier (rendus indépendants : DM, dossiers candidature, rapport alternance)
//
// Plus de Tache/SousTache : table rase comme convenu lors de la refonte.

export type ExamFormat = 'QCM' | 'Oral' | 'Écrit'
export type Confidence = 'red' | 'amber' | 'green'
export type DossierKind = 'DOSSIER' | 'RAPPORT' | 'DM' | 'ÉCRIT'
export type SimAppraisal = 'oui' | 'moyen' | 'non'

export interface SubjectChecks {
  fiche:     boolean
  revu:      boolean
  simule:    boolean
  questions: boolean
}

export interface Sujet {
  id:         string
  matiereId:  string
  title:      string
  confidence: Confidence
  checks:     SubjectChecks
  createdAt:  string
}

export interface PlanRow {
  day:   string   // "Mer 27/05"
  focus: string
}

export interface PriorityItem {
  id:     string
  text:   string   // gras serif italique
  detail: string   // sous-ligne sans-serif
}

export interface Matiere {
  id:         string
  title:      string
  subtitle?:  string          // ex. "RGO" pour Régime général des obligations
  format:     ExamFormat
  examDate:   string          // ISO "2026-06-02"
  examLabel?: string          // override d'affichage : "1—4 juin"
  plan:       PlanRow[]
  priorities: PriorityItem[]
  createdAt:  string
}

export interface Simulation {
  id:        string
  matiereId: string
  sujetId:   string | null    // null si sujet libre
  date:      string           // ISO "2026-05-26"
  sujetTire: string           // titre du sujet tiré (libre ou copié du sujet lié)
  planClair: SimAppraisal | null
  solidite:  SimAppraisal | null
  temps:     SimAppraisal | null
  point:     string           // point à corriger
  createdAt: string
}

export interface Dossier {
  id:        string
  kind:      DossierKind
  title:     string
  sub?:      string
  deadline:  string           // ISO "2026-06-01"
  createdAt: string
}

// ─── Spaced repetition (flashcards) ──────────────────────────────────────────

export type ReviewQuality = 'again' | 'hard' | 'good' | 'easy'

export interface Flashcard {
  id:           string
  matiereId:    string           // référence stable
  sujetId:      string | null    // rattachement optionnel à un sujet
  question:     string
  answer:       string
  easeFactor:   number   // démarre à 2.5
  interval:     number   // jours jusqu'à la prochaine révision
  repetitions:  number   // nb de succès consécutifs
  nextReview:   string   // YYYY-MM-DD
  lastReviewed: string | null
  createdAt:    string
}

// ─── Store interface ──────────────────────────────────────────────────────────

export interface DroitStore {
  // Données
  matieres:    Matiere[]
  sujets:      Sujet[]
  simulations: Simulation[]
  dossiers:    Dossier[]
  flashcards:  Flashcard[]

  // Matières
  addMatiere:    (input: Omit<Matiere, 'id' | 'createdAt'>) => string
  updateMatiere: (id: string, updates: Partial<Omit<Matiere, 'id' | 'createdAt'>>) => void
  deleteMatiere: (id: string) => void

  // Sujets
  addSujet:           (input: Omit<Sujet, 'id' | 'createdAt' | 'confidence' | 'checks'>) => string
  updateSujetTitle:   (id: string, title: string) => void
  cycleConfidence:    (id: string) => void
  toggleCheck:        (id: string, key: keyof SubjectChecks) => void
  deleteSujet:        (id: string) => void

  // Simulations
  addSimulation:    (input: Omit<Simulation, 'id' | 'createdAt'>) => void
  updateSimulation: (id: string, updates: Partial<Omit<Simulation, 'id' | 'createdAt'>>) => void
  deleteSimulation: (id: string) => void

  // Dossiers
  addDossier:    (input: Omit<Dossier, 'id' | 'createdAt'>) => void
  updateDossier: (id: string, updates: Partial<Omit<Dossier, 'id' | 'createdAt'>>) => void
  deleteDossier: (id: string) => void

  // Flashcards
  addFlashcard:    (input: { matiereId: string; sujetId?: string | null; question: string; answer: string }) => void
  updateFlashcard: (id: string, updates: Partial<Pick<Flashcard, 'matiereId' | 'sujetId' | 'question' | 'answer'>>) => void
  deleteFlashcard: (id: string) => void
  reviewFlashcard: (id: string, quality: ReviewQuality) => void

  setHasHydrated: (v: boolean) => void
}

// ─── SM-2 helpers ────────────────────────────────────────────────────────────

const QUALITY_SCORE: Record<ReviewQuality, number> = {
  again: 0,
  hard:  3,
  good:  4,
  easy:  5,
}

const todayIsoDate = (): string => new Date().toISOString().split('T')[0]

const addDays = (iso: string, days: number): string => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function applySM2(card: Flashcard, quality: ReviewQuality): Flashcard {
  const q = QUALITY_SCORE[quality]
  let { easeFactor, interval, repetitions } = card

  if (q < 3) {
    repetitions = 0
    interval = 1
  } else {
    repetitions += 1
    if (repetitions === 1)      interval = 1
    else if (repetitions === 2) interval = 6
    else                        interval = Math.round(interval * easeFactor)
  }

  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))

  return {
    ...card,
    easeFactor,
    interval,
    repetitions,
    nextReview:   addDays(todayIsoDate(), interval),
    lastReviewed: todayIsoDate(),
  }
}

const CONFIDENCE_CYCLE: Confidence[] = ['red', 'amber', 'green']

// ─── Données initiales — Juin 2026 ────────────────────────────────────────────

const nowIso = () => new Date().toISOString()

// IDs stables pour les matières (référencés par sujets/simulations/flashcards/dossiers)
const M = {
  assurance:    'm-assurance',
  rgo:          'm-rgo',
  contrats:     'm-contrats',
  distribution: 'm-distribution',
  rse:          'm-rse',
} as const

const DEFAULT_MATIERES: Matiere[] = [
  {
    id:        M.assurance,
    title:     'Assurance',
    format:    'QCM',
    examDate:  '2026-06-02',
    examLabel: '2 juin 2026',
    plan: [
      { day: 'Lun 25/05', focus: 'Cartographie + mécanismes généraux' },
      { day: 'Mar 26/05', focus: 'Coassurance + réassurance + rétrocession' },
      { day: 'Mer 27/05', focus: "RC généralités + RC chef d'entreprise" },
      { day: 'Jeu 28/05', focus: 'RCP professionnelle + RCP avocats' },
      { day: 'Ven 29/05', focus: 'Exclusions (9) + déchéance + garantie NRF' },
      { day: 'Sam 30/05', focus: 'Base réclamation / fait générateur / reprise du passé + cas pratique' },
      { day: 'Dim 31/05', focus: 'Flashcards + cas pratique blanc' },
      { day: 'Lun 01/06', focus: 'Mémo final + révision ciblée QCM' },
    ],
    priorities: [
      { id: 'pa-1', text: 'Déchéance de garantie',          detail: "Conditions d'opposabilité, exigence du préjudice (art. L. 113-11)" },
      { id: 'pa-2', text: '9 exclusions de RC',             detail: 'Faute intentionnelle (art. L. 113-1), amendes' },
      { id: 'pa-3', text: 'Plafond RCP avocats',            detail: '4 M€, franchise 10 % plafonnée 3 000 €, inopposable aux tiers' },
      { id: 'pa-4', text: 'Garantie NRF',                   detail: '3 conditions cumulatives, 20 % préjudices complémentaires, subrogation (art. L. 121-12)' },
      { id: 'pa-5', text: 'Base réclamation vs fait générateur', detail: 'Délai subséquent minimal 5 ans (10 ans RCP pro, art. R. 124-2)' },
    ],
    createdAt: nowIso(),
  },
  {
    id:        M.rgo,
    title:     'Régime général des obligations',
    subtitle:  'RGO',
    format:    'Oral',
    examDate:  '2026-06-01',
    examLabel: '1—4 juin',
    plan:       [],
    priorities: [],
    createdAt:  nowIso(),
  },
  {
    id:        M.contrats,
    title:     'Droit des contrats',
    format:    'Oral',
    examDate:  '2026-06-01',
    examLabel: '1—4 juin',
    plan: [
      { day: 'Mer 27/05', focus: 'Avant-contrats · promesse de vente' },
      { day: 'Jeu 28/05', focus: 'Vices du consentement — dol, violence, erreur' },
      { day: 'Ven 29/05', focus: 'Éléments essentiels — prix, objet' },
      { day: 'Sam 30/05', focus: "Déséquilibre significatif · clause d'imprévision" },
      { day: 'Dim 31/05', focus: 'Loyauté · négociations · révision générale' },
    ],
    priorities: [
      { id: 'pc-1', text: 'Déséquilibre significatif',     detail: 'Art. 1171 — distinguer droit commun vs droit spécial (clauses abusives)' },
      { id: 'pc-2', text: "Clause d'imprévision",          detail: "Art. 1195 — conditions d'admission + comparaison droit commercial" },
      { id: 'pc-3', text: 'Vices du consentement',         detail: 'Articulation erreur / dol / violence — chevauchements jurisprudentiels' },
      { id: 'pc-4', text: 'Promesse unilatérale de vente', detail: 'Réforme 2016 — rétractation du promettant : inexécution vs caducité' },
      { id: 'pc-5', text: 'Négociations contractuelles',   detail: 'Rupture abusive — art. 1112 al. 2 — responsabilité délictuelle' },
    ],
    createdAt: nowIso(),
  },
  {
    id:        M.distribution,
    title:     'Distribution',
    format:    'Oral',
    examDate:  '2026-06-01',
    examLabel: '1—4 juin',
    plan:       [],
    priorities: [],
    createdAt:  nowIso(),
  },
  {
    id:        M.rse,
    title:     'RSE',
    format:    'Oral',
    examDate:  '2026-06-01',
    examLabel: '1—4 juin',
    plan:       [],
    priorities: [],
    createdAt:  nowIso(),
  },
]

const emptyChecks = (): SubjectChecks => ({ fiche: false, revu: false, simule: false, questions: false })

// Fabrique un sujet par défaut (rouge, tout décoché)
const seedSujet = (id: string, matiereId: string, title: string): Sujet => ({
  id, matiereId, title,
  confidence: 'red',
  checks:     emptyChecks(),
  createdAt:  nowIso(),
})

const DEFAULT_SUJETS: Sujet[] = [
  // Assurance — thèmes à maîtriser pour le QCM (8)
  seedSujet('s-as-1', M.assurance, 'Cartographie + mécanismes généraux'),
  seedSujet('s-as-2', M.assurance, 'Coassurance, réassurance, rétrocession'),
  seedSujet('s-as-3', M.assurance, "RC chef d'entreprise"),
  seedSujet('s-as-4', M.assurance, 'RCP professionnelle (avocats)'),
  seedSujet('s-as-5', M.assurance, 'Les 9 exclusions de RC'),
  seedSujet('s-as-6', M.assurance, 'Déchéance de garantie'),
  seedSujet('s-as-7', M.assurance, 'Base réclamation / fait générateur / reprise du passé'),
  seedSujet('s-as-8', M.assurance, 'Garantie NRF'),

  // RGO — 5 sujets oral
  seedSujet('s-rgo-1', M.rgo, 'La responsabilité des contractants envers les tiers'),
  seedSujet('s-rgo-2', M.rgo, 'La renonciation à la condition suspensive'),
  seedSujet('s-rgo-3', M.rgo, "L'opposabilité des exceptions par le débiteur cédé"),
  seedSujet('s-rgo-4', M.rgo, 'La compensation des dettes connexes'),
  seedSujet('s-rgo-5', M.rgo, 'La nullité relative du contrat'),

  // Droit des contrats — 13 sujets oral
  seedSujet('s-co-1',  M.contrats, 'Les avant-contrats : lequel choisir ?'),
  seedSujet('s-co-2',  M.contrats, "L'obligation d'information"),
  seedSujet('s-co-3',  M.contrats, 'Le dol'),
  seedSujet('s-co-4',  M.contrats, 'La violence'),
  seedSujet('s-co-5',  M.contrats, "L'erreur sur la rentabilité"),
  seedSujet('s-co-6',  M.contrats, 'La promesse unilatérale de vente'),
  seedSujet('s-co-7',  M.contrats, 'Les clauses essentielles des contrats de vente'),
  seedSujet('s-co-8',  M.contrats, 'Le prix'),
  seedSujet('s-co-9',  M.contrats, "L'objet du contrat"),
  seedSujet('s-co-10', M.contrats, 'Le déséquilibre significatif (art. 1171)'),
  seedSujet('s-co-11', M.contrats, "La clause d'imprévision (art. 1195)"),
  seedSujet('s-co-12', M.contrats, 'La loyauté contractuelle'),
  seedSujet('s-co-13', M.contrats, 'Les négociations contractuelles'),

  // Distribution — 7 sujets oral
  seedSujet('s-di-1', M.distribution, 'La franchise : notion et qualification'),
  seedSujet('s-di-2', M.distribution, "L'obligation d'information précontractuelle (DIP — art. L.330-3)"),
  seedSujet('s-di-3', M.distribution, "L'erreur sur la rentabilité en franchise"),
  seedSujet('s-di-4', M.distribution, 'Le déséquilibre significatif en distribution (L.442-1, I, 2°)'),
  seedSujet('s-di-5', M.distribution, 'La rupture du contrat de franchise'),
  seedSujet('s-di-6', M.distribution, 'Les clauses de non-concurrence post-contractuelles'),
  seedSujet('s-di-7', M.distribution, "L'exclusivité territoriale et la distribution en ligne"),

  // RSE — 8 sujets oral
  seedSujet('s-rse-1', M.rse, 'Le devoir de vigilance (loi 27 mars 2017)'),
  seedSujet('s-rse-2', M.rse, 'La société à mission (art. L.210-10 à L.210-12)'),
  seedSujet('s-rse-3', M.rse, "La raison d'être (art. 1835)"),
  seedSujet('s-rse-4', M.rse, 'La contractualisation des engagements RSE'),
  seedSujet('s-rse-5', M.rse, 'La valeur juridique des codes de conduite et chartes éthiques'),
  seedSujet('s-rse-6', M.rse, 'Les clauses RSE et le déséquilibre significatif'),
  seedSujet('s-rse-7', M.rse, 'La responsabilité civile, instrument de la RSE'),
  seedSujet('s-rse-8', M.rse, 'RSE, ESG et compliance : distinctions'),
]

const DEFAULT_DOSSIERS: Dossier[] = [
  { id: 'd-1', kind: 'DOSSIER', title: 'Mémoire Dauphine',       sub: 'Droit des affaires',  deadline: '2026-06-01', createdAt: nowIso() },
  { id: 'd-2', kind: 'DM',      title: 'Transposition Contrats', sub: 'Directive UE',         deadline: '2026-06-12', createdAt: nowIso() },
  { id: 'd-3', kind: 'RAPPORT', title: 'UPEC',                   sub: 'Compte rendu stage',   deadline: '2026-06-12', createdAt: nowIso() },
  { id: 'd-4', kind: 'DOSSIER', title: 'Paris Cité',              sub: 'Juriste d\'affaires international', deadline: '2026-06-18', createdAt: nowIso() },
  { id: 'd-5', kind: 'DM',      title: 'DM Sociétés',             sub: 'Dissertation + cas pratique', deadline: '2026-06-30', createdAt: nowIso() },
  { id: 'd-6', kind: 'RAPPORT', title: 'Rapport alternance',      sub: 'Cabinet — plan + rédaction',  deadline: '2026-06-30', createdAt: nowIso() },
]

// ─── Store ────────────────────────────────────────────────────────────────────
//
// Clé `aetheris-droit-v3` : la v2 (Tache/SousTache + Flashcard avec matiere string)
// reste en localStorage mais n'est plus chargée. Reset complet, table rase comme
// décidé lors de la refonte juin 2026.

export const useDroitStore = createPersistedStore<DroitStore>(
  'aetheris-droit-v3',
  (set) => ({
    matieres:    DEFAULT_MATIERES,
    sujets:      DEFAULT_SUJETS,
    simulations: [],
    dossiers:    DEFAULT_DOSSIERS,
    flashcards:  [],

    // ── Matières ─────────────────────────────────────────────────────────────

    addMatiere: (input) => {
      const id = crypto.randomUUID()
      set((s) => ({
        matieres: [...s.matieres, { ...input, id, createdAt: nowIso() }],
      }))
      return id
    },

    updateMatiere: (id, updates) =>
      set((s) => ({
        matieres: s.matieres.map((m) => (m.id === id ? { ...m, ...updates } : m)),
      })),

    deleteMatiere: (id) =>
      set((s) => ({
        matieres:    s.matieres.filter((m) => m.id !== id),
        sujets:      s.sujets.filter((sj) => sj.matiereId !== id),
        simulations: s.simulations.filter((sim) => sim.matiereId !== id),
        flashcards:  s.flashcards.filter((c) => c.matiereId !== id),
      })),

    // ── Sujets ───────────────────────────────────────────────────────────────

    addSujet: (input) => {
      const id = crypto.randomUUID()
      set((s) => ({
        sujets: [
          ...s.sujets,
          { ...input, id, confidence: 'red', checks: emptyChecks(), createdAt: nowIso() },
        ],
      }))
      return id
    },

    updateSujetTitle: (id, title) =>
      set((s) => ({
        sujets: s.sujets.map((sj) => (sj.id === id ? { ...sj, title } : sj)),
      })),

    cycleConfidence: (id) =>
      set((s) => ({
        sujets: s.sujets.map((sj) => {
          if (sj.id !== id) return sj
          const next = CONFIDENCE_CYCLE[(CONFIDENCE_CYCLE.indexOf(sj.confidence) + 1) % 3]
          return { ...sj, confidence: next }
        }),
      })),

    toggleCheck: (id, key) =>
      set((s) => ({
        sujets: s.sujets.map((sj) =>
          sj.id === id ? { ...sj, checks: { ...sj.checks, [key]: !sj.checks[key] } } : sj,
        ),
      })),

    deleteSujet: (id) =>
      set((s) => ({
        sujets:     s.sujets.filter((sj) => sj.id !== id),
        flashcards: s.flashcards.map((c) => (c.sujetId === id ? { ...c, sujetId: null } : c)),
      })),

    // ── Simulations ──────────────────────────────────────────────────────────

    addSimulation: (input) =>
      set((s) => ({
        simulations: [
          ...s.simulations,
          { ...input, id: crypto.randomUUID(), createdAt: nowIso() },
        ],
      })),

    updateSimulation: (id, updates) =>
      set((s) => ({
        simulations: s.simulations.map((sim) => (sim.id === id ? { ...sim, ...updates } : sim)),
      })),

    deleteSimulation: (id) =>
      set((s) => ({ simulations: s.simulations.filter((sim) => sim.id !== id) })),

    // ── Dossiers ─────────────────────────────────────────────────────────────

    addDossier: (input) =>
      set((s) => ({
        dossiers: [...s.dossiers, { ...input, id: crypto.randomUUID(), createdAt: nowIso() }],
      })),

    updateDossier: (id, updates) =>
      set((s) => ({
        dossiers: s.dossiers.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      })),

    deleteDossier: (id) =>
      set((s) => ({ dossiers: s.dossiers.filter((d) => d.id !== id) })),

    // ── Flashcards ───────────────────────────────────────────────────────────

    addFlashcard: ({ matiereId, sujetId = null, question, answer }) =>
      set((s) => ({
        flashcards: [
          ...s.flashcards,
          {
            id:           crypto.randomUUID(),
            matiereId,
            sujetId,
            question,
            answer,
            easeFactor:   2.5,
            interval:     0,
            repetitions:  0,
            nextReview:   todayIsoDate(),   // due dès aujourd'hui
            lastReviewed: null,
            createdAt:    nowIso(),
          },
        ],
      })),

    updateFlashcard: (id, updates) =>
      set((s) => ({
        flashcards: s.flashcards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      })),

    deleteFlashcard: (id) =>
      set((s) => ({ flashcards: s.flashcards.filter((c) => c.id !== id) })),

    reviewFlashcard: (id, quality) =>
      set((s) => ({
        flashcards: s.flashcards.map((c) => (c.id === id ? applySM2(c, quality) : c)),
      })),

    // ── Hydratation ──────────────────────────────────────────────────────────

    // Appelé par persistenceManager après rehydratation.
    // Si Supabase/localStorage ne contient aucune donnée pour cette clé v3,
    // on amorce avec les defaults juin 2026.
    setHasHydrated: (v) =>
      set((s) => {
        if (!v) return {}
        const patch: Partial<DroitStore> = {}
        if (s.matieres.length === 0) patch.matieres = DEFAULT_MATIERES
        if (s.sujets.length   === 0) patch.sujets   = DEFAULT_SUJETS
        if (s.dossiers.length === 0) patch.dossiers = DEFAULT_DOSSIERS
        return patch
      }),
  }),
)
