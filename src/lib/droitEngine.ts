// ─── Types ────────────────────────────────────────────────────────────────────

export type Verdict = "à l'heure" | 'tendu' | 'en retard'
export type TypeEcheance = 'Partiel' | 'Exposé' | 'Rendu' | 'Mémoire'

export interface Echeance {
  id: string
  date: string // ISO YYYY-MM-DD
  type: TypeEcheance
  matiereCode: string
  titre: string
  detail: string
  poids: 'lourd' | 'moyen'
  progression?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const parseDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// ─── Engine functions ─────────────────────────────────────────────────────────

export const daysUntil = (d: Date): number => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export const urgencyScore = (e: Echeance, prep: Record<string, number>): number => {
  const days = Math.max(daysUntil(parseDate(e.date)), 1)
  const p = prep[e.id] ?? 0
  const poidsMul = e.poids === 'lourd' ? 1.6 : 1
  return ((100 - p) / days) * poidsMul
}

export const isOnFire = (e: Echeance, prep: Record<string, number>): boolean => {
  const days = daysUntil(parseDate(e.date))
  const p = prep[e.id] ?? 0
  if (days < 0) return false
  return urgencyScore(e, prep) > 4 || (days <= 7 && p < 80)
}

export const heuresRestantes = (e: Echeance, prep: Record<string, number>): number => {
  const restant = (100 - (prep[e.id] ?? 0)) / 100
  const charge = e.poids === 'lourd' ? 16 : 6
  return Math.round(restant * charge)
}
