import { nanoid } from '../utils/nanoid'
import { createPersistedStore } from '../lib/persistenceManager'

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatusSemaine = 'mission_en_cours' | 'en_attente_retour' | 'semaine_academique'
export type MissionStade  = 'briefing' | 'recherches' | 'redaction' | 'relecture' | 'rendu'
export type CompetenceLevel = 'expose' | 'pratique' | 'a_laise'
export type QualiteRelation = 'ponctuel' | 'bonne_relation' | 'mentor'
export type OutilType       = 'database' | 'modele'
export type ModeleStatut    = 'brouillon' | 'valide' | 'a_ameliorer'

export interface CabinetInfo {
  nom:          string
  maitreStage:  string
  dateDebut:    string | null   // YYYY-MM-DD
  dateFin:      string | null   // YYYY-MM-DD
  prochainePrese: string | null // YYYY-MM-DD
}

export interface Mission {
  id:           string
  type:         string          // libre : Note, Consultation, Contrat, Recherche…
  sujet:        string
  commanditaire:string
  deadline:     string | null   // YYYY-MM-DD
  stade:        MissionStade
  angleRetenu:  string
  sources:      string
  createdAt:    string
}

export interface MissionArchive {
  id:                   string
  type:                 string
  sujet:                string
  commanditaire:        string
  themeJuridique:       string
  competenceDeveloppee: string
  reutil:               boolean
  archivedAt:           string
}

export interface OutilPraticien {
  id:       string
  type:     OutilType
  titre:    string
  lien?:    string
  contenu?: string
  domaine?: string
  statut?:  ModeleStatut
  createdAt:string
}

export interface Competence {
  id:    string
  nom:   string
  level: CompetenceLevel
}

export interface Contact {
  id:         string
  nom:        string
  specialite: string
  qualite:    QualiteRelation
  note:       string
  createdAt:  string
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_COMPETENCES: Competence[] = [
  { id: 'comp-1', nom: 'Recherche jurisprudentielle', level: 'expose' },
  { id: 'comp-2', nom: 'Rédaction contractuelle',     level: 'expose' },
  { id: 'comp-3', nom: 'Conseil client',               level: 'expose' },
  { id: 'comp-4', nom: 'Gestion de dossier',           level: 'expose' },
  { id: 'comp-5', nom: 'Négociation',                  level: 'expose' },
  { id: 'comp-6', nom: 'Veille juridique',             level: 'expose' },
]

const DEFAULT_OUTILS: OutilPraticien[] = [
  { id: 'db-doctrine',   type: 'database', titre: 'Doctrine',    lien: 'https://www.doctrine.fr',            createdAt: '' },
  { id: 'db-legifrance', type: 'database', titre: 'Légifrance',  lien: 'https://www.legifrance.gouv.fr',     createdAt: '' },
  { id: 'db-dalloz',     type: 'database', titre: 'Dalloz',      lien: 'https://www.dalloz.fr',              createdAt: '' },
]

// ─── State ────────────────────────────────────────────────────────────────────

export interface CareerState {
  cabinetInfo:     CabinetInfo
  statusSemaine:   StatusSemaine
  missions:        Mission[]
  missionsArchives: MissionArchive[]
  outils:          OutilPraticien[]
  competences:     Competence[]
  contacts:        Contact[]

  // Cabinet
  setCabinetInfo:   (info: Partial<CabinetInfo>) => void
  setStatusSemaine: (status: StatusSemaine) => void

  // Missions
  addMission:          (m: Omit<Mission, 'id' | 'createdAt'>) => void
  updateMission:       (id: string, updates: Partial<Omit<Mission, 'id' | 'createdAt'>>) => void
  deleteMission:       (id: string) => void
  updateMissionStade:  (id: string, stade: MissionStade) => void
  archiveMission:      (id: string, themeJuridique: string, competenceDeveloppee: string, reutil: boolean) => void

  // Archives
  deleteArchive:   (id: string) => void
  updateArchive:   (id: string, updates: Partial<Omit<MissionArchive, 'id' | 'archivedAt'>>) => void

  // Outils
  addOutil:    (o: Omit<OutilPraticien, 'id' | 'createdAt'>) => void
  updateOutil: (id: string, updates: Partial<Omit<OutilPraticien, 'id' | 'createdAt'>>) => void
  deleteOutil: (id: string) => void

  // Compétences
  addCompetence:           (nom: string) => void
  updateCompetenceLevel:   (id: string, level: CompetenceLevel) => void
  deleteCompetence:        (id: string) => void

  // Contacts
  addContact:    (c: Omit<Contact, 'id' | 'createdAt'>) => void
  updateContact: (id: string, updates: Partial<Omit<Contact, 'id' | 'createdAt'>>) => void
  deleteContact: (id: string) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString()

export const useCareerStore = createPersistedStore<CareerState>(
  'aetheris-career-v1',
  (set) => ({
      cabinetInfo: {
        nom: '', maitreStage: '', dateDebut: null, dateFin: null, prochainePrese: null,
      },
      statusSemaine:    'mission_en_cours',
      missions:         [],
      missionsArchives: [],
      outils:           DEFAULT_OUTILS,
      competences:      DEFAULT_COMPETENCES,
      contacts:         [],

      // ── Cabinet ────────────────────────────────────────────────────────────

      setCabinetInfo:   (info)   => set((s) => ({ cabinetInfo: { ...s.cabinetInfo, ...info } })),
      setStatusSemaine: (status) => set({ statusSemaine: status }),

      // ── Missions ───────────────────────────────────────────────────────────

      addMission: (m) =>
        set((s) => ({
          missions: [...s.missions, { id: nanoid(), createdAt: now(), ...m }],
        })),

      updateMission: (id, updates) =>
        set((s) => ({
          missions: s.missions.map((m) => m.id === id ? { ...m, ...updates } : m),
        })),

      deleteMission: (id) =>
        set((s) => ({ missions: s.missions.filter((m) => m.id !== id) })),

      updateMissionStade: (id, stade) =>
        set((s) => ({
          missions: s.missions.map((m) => m.id === id ? { ...m, stade } : m),
        })),

      archiveMission: (id, themeJuridique, competenceDeveloppee, reutil) =>
        set((s) => {
          const m = s.missions.find((m) => m.id === id)
          if (!m) return {}
          const archive: MissionArchive = {
            id: nanoid(),
            type: m.type,
            sujet: m.sujet,
            commanditaire: m.commanditaire,
            themeJuridique,
            competenceDeveloppee,
            reutil,
            archivedAt: now(),
          }
          return {
            missions: s.missions.filter((m) => m.id !== id),
            missionsArchives: [archive, ...s.missionsArchives],
          }
        }),

      // ── Archives ───────────────────────────────────────────────────────────

      deleteArchive: (id) =>
        set((s) => ({ missionsArchives: s.missionsArchives.filter((a) => a.id !== id) })),

      updateArchive: (id, updates) =>
        set((s) => ({
          missionsArchives: s.missionsArchives.map((a) => a.id === id ? { ...a, ...updates } : a),
        })),

      // ── Outils ─────────────────────────────────────────────────────────────

      addOutil: (o) =>
        set((s) => ({
          outils: [...s.outils, { id: nanoid(), createdAt: now(), ...o }],
        })),

      updateOutil: (id, updates) =>
        set((s) => ({
          outils: s.outils.map((o) => o.id === id ? { ...o, ...updates } : o),
        })),

      deleteOutil: (id) =>
        set((s) => ({ outils: s.outils.filter((o) => o.id !== id) })),

      // ── Compétences ────────────────────────────────────────────────────────

      addCompetence: (nom) =>
        set((s) => ({
          competences: [...s.competences, { id: nanoid(), nom, level: 'expose' }],
        })),

      updateCompetenceLevel: (id, level) =>
        set((s) => ({
          competences: s.competences.map((c) => c.id === id ? { ...c, level } : c),
        })),

      deleteCompetence: (id) =>
        set((s) => ({ competences: s.competences.filter((c) => c.id !== id) })),

      // ── Contacts ───────────────────────────────────────────────────────────

      addContact: (c) =>
        set((s) => ({
          contacts: [...s.contacts, { id: nanoid(), createdAt: now(), ...c }],
        })),

      updateContact: (id, updates) =>
        set((s) => ({
          contacts: s.contacts.map((c) => c.id === id ? { ...c, ...updates } : c),
        })),

      deleteContact: (id) =>
        set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) })),
  }),
)
