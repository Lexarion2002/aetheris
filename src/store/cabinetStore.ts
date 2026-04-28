import { createPersistedStore } from '../lib/persistenceManager'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DossierType   = 'contentieux' | 'rédaction' | 'conseil'
export type DossierStatut = 'en cours' | 'en attente' | 'clôturé'
export type TachePriorite = 'urgent' | 'normal' | 'quand possible'
export type TacheStatut   = 'à faire' | 'en cours' | 'rendu'
export type NoteType      = 'Réunion' | 'Audience' | 'Séance de travail' | 'Point hebdo'
export type ContactRole   = 'Associé' | 'Of counsel' | 'Collaborateur' | 'Stagiaire'

export interface CabinetDossier {
  id:        string
  ref:       string
  nom:       string
  avocat:    string
  type:      DossierType
  statut:    DossierStatut
  deadline:  string   // YYYY-MM-DD
  urgent:    boolean
  domaine:   string
  createdAt: string
}

export interface CabinetTache {
  id:        string
  titre:     string
  avocat:    string
  priorite:  TachePriorite
  statut:    TacheStatut
  rendu:     string   // YYYY-MM-DD
  createdAt: string
}

export interface CabinetNote {
  id:           string
  date:         string   // YYYY-MM-DD
  heure:        string   // HH:MM
  type:         NoteType
  titre:        string
  participants: string[]
  extrait:      string
  createdAt:    string
}

export interface CabinetContact {
  id:         string
  initials:   string
  nom:        string
  role:       ContactRole
  specialite: string
  email:      string
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface CabinetState {
  dossiers: CabinetDossier[]
  taches:   CabinetTache[]
  notes:    CabinetNote[]
  contacts: CabinetContact[]

  addDossier:    (d: Omit<CabinetDossier, 'id' | 'createdAt'>) => void
  updateDossier: (id: string, updates: Partial<Omit<CabinetDossier, 'id' | 'createdAt'>>) => void
  removeDossier: (id: string) => void

  addTache:    (t: Omit<CabinetTache, 'id' | 'createdAt'>) => void
  updateTache: (id: string, updates: Partial<Omit<CabinetTache, 'id' | 'createdAt'>>) => void
  removeTache: (id: string) => void

  addNote:    (n: Omit<CabinetNote, 'id' | 'createdAt'>) => void
  updateNote: (id: string, updates: Partial<Omit<CabinetNote, 'id' | 'createdAt'>>) => void
  removeNote: (id: string) => void

  addContact:    (c: Omit<CabinetContact, 'id'>) => void
  updateContact: (id: string, updates: Partial<Omit<CabinetContact, 'id'>>) => void
  removeContact: (id: string) => void
}

export const useCabinetStore = createPersistedStore<CabinetState>(
  'aetheris-cabinet-v1',
  (set) => ({
    dossiers: [],
    taches:   [],
    notes:    [],
    contacts: [],

    addDossier: (d) =>
      set((s) => ({
        dossiers: [{ ...d, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...s.dossiers],
      })),
    updateDossier: (id, updates) =>
      set((s) => ({ dossiers: s.dossiers.map((d) => d.id === id ? { ...d, ...updates } : d) })),
    removeDossier: (id) =>
      set((s) => ({ dossiers: s.dossiers.filter((d) => d.id !== id) })),

    addTache: (t) =>
      set((s) => ({
        taches: [{ ...t, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...s.taches],
      })),
    updateTache: (id, updates) =>
      set((s) => ({ taches: s.taches.map((t) => t.id === id ? { ...t, ...updates } : t) })),
    removeTache: (id) =>
      set((s) => ({ taches: s.taches.filter((t) => t.id !== id) })),

    addNote: (n) =>
      set((s) => ({
        notes: [{ ...n, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...s.notes],
      })),
    updateNote: (id, updates) =>
      set((s) => ({ notes: s.notes.map((n) => n.id === id ? { ...n, ...updates } : n) })),
    removeNote: (id) =>
      set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

    addContact: (c) =>
      set((s) => ({ contacts: [...s.contacts, { ...c, id: crypto.randomUUID() }] })),
    updateContact: (id, updates) =>
      set((s) => ({ contacts: s.contacts.map((c) => c.id === id ? { ...c, ...updates } : c) })),
    removeContact: (id) =>
      set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) })),
  }),
)
