import type { Objective, Milestone } from '../types'

export const fmtLong = (iso: string | null | undefined): string => {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const daysUntil = (iso: string): number => {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const d = new Date(iso + 'T12:00:00')
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

export const relativeDate = (iso: string): string => {
  const days = daysUntil(iso)
  if (days < 0) return `${-days} j de retard`
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'demain'
  if (days < 7) return `dans ${days} jours`
  if (days < 14) return 'dans 1 semaine'
  if (days < 30) return `dans ${Math.round(days / 7)} semaines`
  if (days < 60) return 'dans 1 mois'
  if (days < 365) return `dans ${Math.round(days / 30)} mois`
  return `dans ${Math.round(days / 365)} an${days >= 730 ? 's' : ''}`
}

export type UrgencyBucket = 'overdue' | 'week' | 'month' | 'later' | 'undated'

export const urgencyBucket = (iso: string | null | undefined): UrgencyBucket => {
  if (!iso) return 'undated'
  const d = daysUntil(iso)
  if (d < 0) return 'overdue'
  if (d <= 7) return 'week'
  if (d <= 31) return 'month'
  return 'later'
}

export const URGENCY_ORDER: UrgencyBucket[] = ['overdue', 'week', 'month', 'later', 'undated']

export const URGENCY_LABEL: Record<UrgencyBucket, string> = {
  overdue: 'En retard',
  week:    'Cette semaine',
  month:   'Ce mois',
  later:   'Plus tard',
  undated: 'Sans date',
}

export const progressOf = (obj: Objective, milestones: Milestone[]): number => {
  if (milestones.length === 0) return obj.progress
  const done = milestones.filter(m => m.done).length
  return Math.round((done / milestones.length) * 100)
}
