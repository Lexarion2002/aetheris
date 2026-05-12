// ─── Types ────────────────────────────────────────────────────────────────────

export type Etape = 'idee' | 'plan' | 'draft' | 'revision' | 'final'
export type Genre = 'noire' | 'fantastique' | 'realiste'

export const ETAPE_ORDER: readonly Etape[] = ['idee', 'plan', 'draft', 'revision', 'final']

// ─── Helpers temporels ────────────────────────────────────────────────────────

// Semaine ISO depuis une date
export const getSemaineISO = (d: Date): number => {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayOfWeek = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayOfWeek)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

// Jours depuis une date "DD.MM" (année courante ou précédente si futur)
export const joursDepuisDate = (dateStr: string, today: Date): number => {
  const [dd, mm] = dateStr.split('.').map(Number)
  let year = today.getFullYear()
  const candidate = new Date(year, mm - 1, dd)
  candidate.setHours(0, 0, 0, 0)
  const t = new Date(today)
  t.setHours(0, 0, 0, 0)
  if (candidate > t) {
    year -= 1
  }
  const ref = new Date(year, mm - 1, dd)
  ref.setHours(0, 0, 0, 0)
  return Math.round((t.getTime() - ref.getTime()) / 86400000)
}

// ─── Calcul heures restantes ──────────────────────────────────────────────────

// draft: (objectifMots - motsCouches) / 500 + 0.5, min 0.5
// autres : table fixe
export const heuresRestantes = (
  etape: Etape,
  motsCouches: number,
  objectifMots: number,
): number => {
  if (etape === 'draft') {
    const reste = Math.max(objectifMots - motsCouches, 0)
    return Math.max(reste / 500 + 0.5, 0.5)
  }
  const table: Record<Etape, number> = {
    idee: 0.5,
    plan: 1.0,
    draft: 2.0,
    revision: 1.5,
    final: 1.0,
  }
  return table[etape]
}

// Format "X H YY" (ex: 1.67 → "1 H 40")
export const formatHeures = (h: number): string => {
  const heures = Math.floor(h)
  const minutes = Math.round((h - heures) * 60)
  return `${heures} H ${String(minutes).padStart(2, '0')}`
}

// ─── Créneaux soir ────────────────────────────────────────────────────────────

export interface CreneauSoir {
  label: string
  date: string
  tache: string
  duree: string
  intent: string
}

type SlotDef = [string, string, string] // [tache, duree, intent]

const TACHES_PAR_ETAPE: Record<Etape, [SlotDef, SlotDef, SlotDef]> = {
  draft: [
    ['Finir le draft', '2 h 00', 'couché'],
    ['Première révision', '1 h 30', 'forme & rythme'],
    ['Passe finale + envoi', '1 h 00', 'closure'],
  ],
  revision: [
    ['Relecture 1', '1 h 30', 'forme'],
    ['Corrections + relecture 2', '1 h 00', 'fond'],
    ['Envoi final', '0 h 30', 'closure'],
  ],
  plan: [
    ['Plan détaillé', '1 h 00', 'structure'],
    ['Pitch + genre', '0 h 45', 'cadrage'],
    ['Ouverture', '1 h 00', 'écriture'],
  ],
  idee: [
    ['Incubation', '0 h 30', 'laisser mûrir'],
    ['Notes libres', '0 h 45', 'exploration'],
    ['Plan brut', '1 h 00', 'structure'],
  ],
  final: [
    ['Relecture finale', '1 h 00', 'finalisation'],
    ['Corrections mineures', '0 h 30', 'peaufinage'],
    ['Archivage', '0 h 15', 'clôture'],
  ],
}

// Trouver le prochain mar., jeu., week-end à partir de today
const getProchainsSoirs = (today: Date): Array<{ label: string; date: string }> => {
  const JOURS_FR = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
  const MOIS_FR = [
    'jan.', 'fév.', 'mar.', 'avr.', 'mai', 'juin',
    'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.',
  ]
  const cibles = [2, 4, 0] // mar=2, jeu=4, dim=0 (représente week-end)
  const labels = ['mar.', 'jeu.', 'week-end']
  const result: Array<{ label: string; date: string }> = []

  for (let i = 0; i < 3; i++) {
    const cible = cibles[i]
    let offset = 1
    while (true) {
      const d = new Date(today)
      d.setDate(today.getDate() + offset)
      const dow = d.getDay()
      // week-end = sam ou dim
      if (i === 2 && (dow === 6 || dow === 0)) break
      if (i < 2 && dow === cible) break
      offset++
      if (offset > 14) break
    }
    const d = new Date(today)
    d.setDate(today.getDate() + offset)
    const jourLabel = i === 2 ? 'week-end' : JOURS_FR[d.getDay()]
    const dateLabel = `${d.getDate()} ${MOIS_FR[d.getMonth()]}`
    result.push({ label: labels[i], date: `${jourLabel} ${dateLabel}` })
  }

  return result
}

// 3 créneaux mar./jeu./week-end avec tâches selon l'étape
export const repartitionSoir = (etape: Etape, today: Date): CreneauSoir[] => {
  const soirs = getProchainsSoirs(today)
  const taches = TACHES_PAR_ETAPE[etape]

  return soirs.map((soir, i) => ({
    label: soir.label,
    date: soir.date,
    tache: taches[i][0],
    duree: taches[i][1],
    intent: taches[i][2],
  }))
}

// ─── Logique de priorité ──────────────────────────────────────────────────────

// Nouvelle prioritaire : active flag d'abord, sinon par ordre final→revision→draft→plan→idee
export const getNouvelleActive = <T extends { stage: Etape; active: boolean }>(
  nouvelles: T[],
): T | null => {
  const flagged = nouvelles.find((n) => n.active)
  if (flagged) return flagged

  const order: Etape[] = ['final', 'revision', 'draft', 'plan', 'idee']
  for (const etape of order) {
    const found = nouvelles.find((n) => n.stage === etape)
    if (found) return found
  }
  return null
}

export const isChaud = (daysInStage: number): boolean => daysInStage > 2
