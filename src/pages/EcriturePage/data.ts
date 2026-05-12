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

// ─── Mock data ────────────────────────────────────────────────────────────────

export const OBJECTIF_MOTS = 6000

export const CURRENT: NouvelleActuelle = {
  n: 7,
  titre: 'Les yeux du monde',
  genre: 'Science-fiction',
  jours_restants: 3,
  synopsis:
    "Sur une planète où la lumière du jour se rationne, une astronome aveugle découvre qu'elle entend ce que les autres voient. Elle prend le train pour le capital et oublie pourquoi.",
  objectif: 6000,
  ecrits: 4200,
  sessions: [
    { date: '14 avr.', note: "Ouverture — la gare, l'odeur de cuivre.", mots: 1820, duree: '1h40' },
    { date: '12 avr.', note: 'Scène du wagon. Mira parle à travers une vitre.', mots: 1480, duree: '1h25' },
    { date: '10 avr.', note: 'Carnet de prép. Le narrateur trouve sa voix.', mots: 900, duree: '1h15' },
  ],
  fragments: {
    idees: [
      { titre: 'La clé en cuivre', corps: "Tout repose sur cet objet : passé hérité, futur impossible. À placer scène 3." },
      { titre: 'Le mot « cendres »', corps: 'Revient trois fois — début, milieu, fin. Discret. Pas insister.' },
      { titre: 'Fin alternative', corps: "Elle reste à la gare. Elle n'ouvre pas la lettre. Plus juste ?" },
    ],
    alternatives: [
      { titre: 'Couper le frère', corps: "Personnage trop épais. Le rendre invisible — il n'apparaît qu'en lettre." },
      { titre: 'Présent au lieu de passé', corps: "Tout réécrire au présent. Plus serré. Essai sur la scène 2 d'abord." },
    ],
  },
}

export const PAST: NouvellePassee[] = [
  { n: 6, titre: 'La maison de Jana',     genre: 'Réalisme magique', mots: 5840, etoiles: 4, statut: 'terminée'   },
  { n: 5, titre: "Souffleurs d'âmes",     genre: 'Science-fiction',  mots: 6120, etoiles: 3, statut: 'terminée'   },
  { n: 4, titre: "L'année du chien",      genre: 'Polar',            mots: 1240, etoiles: 0, statut: 'abandonnée' },
  { n: 3, titre: 'Le tramway 14',         genre: 'Contemporain',     mots: 5980, etoiles: 5, statut: 'terminée'   },
  { n: 2, titre: 'Sous la lampe',         genre: 'Huis clos',        mots: 6240, etoiles: 3, statut: 'terminée'   },
  { n: 1, titre: 'Petite leçon de fugue', genre: 'Autofiction',      mots: 5510, etoiles: 4, statut: 'terminée'   },
]

export const WEEKS: SemaineStats[] = [
  { n: 1, mots: 5510, etat: 'terminée'   },
  { n: 2, mots: 6240, etat: 'terminée'   },
  { n: 3, mots: 5980, etat: 'terminée'   },
  { n: 4, mots: 1240, etat: 'abandonnée' },
  { n: 5, mots: 6120, etat: 'terminée'   },
  { n: 6, mots: 5840, etat: 'terminée'   },
  { n: 7, mots: 4200, etat: 'en cours'   },
]

export const GENRES: GenreStats[] = [
  { nom: 'Science-fiction',  n: 2 },
  { nom: 'Réalisme magique', n: 1 },
  { nom: 'Polar',            n: 1 },
  { nom: 'Contemporain',     n: 1 },
  { nom: 'Huis clos',        n: 1 },
  { nom: 'Autofiction',      n: 1 },
]
