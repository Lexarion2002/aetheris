// ─── Types locaux ─────────────────────────────────────────────────────────────

export type StatutNouvelle = 'terminée' | 'abandonnée' | 'en cours'

export interface EcritureSession {
  date: string
  note: string
  mots: number
  duree: string
}

export interface Fragment {
  titre: string
  corps: string
}

export interface NouvelleActuelle {
  n: number
  titre: string
  genre: string
  jours_restants: number
  synopsis: string
  objectif: number
  ecrits: number
  sessions: EcritureSession[]
  fragments: {
    idees: Fragment[]
    alternatives: Fragment[]
  }
}

export interface NouvellePassee {
  n: number
  titre: string
  genre: string
  mots: number
  etoiles: number
  statut: 'terminée' | 'abandonnée'
}

export interface SemaineStats {
  n: number
  mots: number
  etat: StatutNouvelle
}

export interface GenreStats {
  nom: string
  n: number
}

// ─── Données ──────────────────────────────────────────────────────────────────

export const OBJECTIF_MOTS = 6000

export const CURRENT: NouvelleActuelle | null = null

export const PAST: NouvellePassee[] = []

export const WEEKS: SemaineStats[] = []

export const GENRES: GenreStats[] = []
