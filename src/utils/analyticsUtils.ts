import type { DomainColor } from '../types'

// ─── Mapping couleurs domaine → palette analytics ────────────────────────────

/**
 * Palette warm spécifique aux Analytics — coordonnée avec le canvas papier.
 * Chaque DomainColor est mappée vers une teinte du système terra/sage/ink.
 */
export const DOMAIN_COLORS: Record<DomainColor, string> = {
  red:    'var(--terra)',
  orange: '#C06A2F',
  yellow: '#B89066',
  green:  'var(--sage)',
  teal:   '#6B8F89',
  blue:   '#5B7A8C',
  indigo: '#7A6B95',
  purple: '#9B6B4A',
  pink:   '#B58F9A',
  gray:   'var(--ink-2)',
}

export function getDomainColor(color: DomainColor | undefined): string {
  if (!color) return 'var(--ink-3)'
  return DOMAIN_COLORS[color] ?? 'var(--ink-3)'
}

// ─── Bornes de période ───────────────────────────────────────────────────────

/**
 * Renvoie le lundi 00h00 → dimanche 23h59 pour un offset (0 = semaine courante,
 * -1 = précédente, +1 = future).
 */
export function getWeekBounds(offset = 0): { start: Date; end: Date } {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const daysSinceMonday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - daysSinceMonday + offset * 7)

  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/**
 * Renvoie le 1er → dernier jour du mois pour un offset (0 = mois courant).
 */
export function getMonthBounds(offset = 0): { start: Date; end: Date } {
  const ref = new Date()
  const start = new Date(ref.getFullYear(), ref.getMonth() + offset, 1, 0, 0, 0, 0)
  const end = new Date(ref.getFullYear(), ref.getMonth() + offset + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

// ─── Numéro de semaine ISO ───────────────────────────────────────────────────

export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function isoWeekLabel(date: Date): string {
  return `S${getISOWeekNumber(date)}`
}

// ─── Variation en % ──────────────────────────────────────────────────────────

/**
 * Renvoie la variation en % entre deux valeurs. null si previous === 0 (pour
 * éviter d'afficher "+infini").
 */
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

// ─── Index jour (lundi = 0) ──────────────────────────────────────────────────

export function mondayBasedDayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

// ─── Helpers de date ─────────────────────────────────────────────────────────

export function isInRange(iso: string | null | undefined, bounds: { start: Date; end: Date }): boolean {
  if (!iso) return false
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  return d >= bounds.start && d <= bounds.end
}

/** Renvoie la date d'un timestamp ou d'une chaîne ISO. */
export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s.length === 10 ? s + 'T00:00:00' : s)
  return isNaN(d.getTime()) ? null : d
}

// ─── Labels jours ────────────────────────────────────────────────────────────

export const DAYS_SHORT_LOWER = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']

// ─── Formatters ──────────────────────────────────────────────────────────────

export const fmtEUR = (n: number): string =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

export const fmtH = (n: number): string =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' h'

// ─── Période → label éditorial ───────────────────────────────────────────────

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

export function formatWeekRangeLong(bounds: { start: Date; end: Date }): string {
  const s = bounds.start
  const e = bounds.end
  const sMonth = MONTHS_FR[s.getMonth()]
  const eMonth = MONTHS_FR[e.getMonth()]
  const sd = s.getDate()
  const ed = e.getDate()
  const year = e.getFullYear()
  if (sMonth === eMonth) return `du ${sd} au ${ed} ${sMonth} ${year}`
  return `du ${sd} ${sMonth} au ${ed} ${eMonth} ${year}`
}

export function formatWeekRangeShort(bounds: { start: Date; end: Date }): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const s = bounds.start
  const e = bounds.end
  return `${pad(s.getDate())}.${pad(s.getMonth() + 1)} → ${pad(e.getDate())}.${pad(e.getMonth() + 1)}`
}

export function formatMonthLong(bounds: { start: Date; end: Date }): string {
  return `${MONTHS_FR[bounds.start.getMonth()]} ${bounds.start.getFullYear()}`
}

export function formatMonthShort(bounds: { start: Date; end: Date }): string {
  const m = MONTHS_FR[bounds.start.getMonth()].slice(0, 3)
  return `${m}. ${bounds.start.getFullYear()}`
}
