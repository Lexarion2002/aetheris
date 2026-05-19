// src/utils/weekUtils.ts — Helpers pour la vue Semaine

export type Day = {
  i: number     // 0=Lun … 6=Dim
  short: string // 'Lun', 'Mar', …
  long: string  // 'lundi', 'mardi', …
  date: number  // jour du mois
  iso: string   // 'YYYY-MM-DD'
  mono: string  // 'DD.MM'
}

const SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const LONG  = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
export const NBSP = ' '

export function getWeekStart(offset: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const daysSinceMonday = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - daysSinceMonday + offset * 7)
  return d
}

export function getWeekDays(offset: number): Day[] {
  const monday = getWeekStart(offset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const day   = d.getDate()
    const month = d.getMonth() + 1
    return {
      i,
      short: SHORT[i],
      long:  LONG[i],
      date:  day,
      iso:   d.toISOString().split('T')[0],
      mono:  `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}`,
    }
  })
}

export function getWeekBounds(offset: number): { start: string; end: string } {
  const days = getWeekDays(offset)
  return { start: days[0].iso, end: days[6].iso }
}

export function isCurrentWeek(offset: number): boolean {
  return offset === 0
}

export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function minutesToHours(m: number): string {
  if (!m) return `0${NBSP}min`
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r}${NBSP}min`
  if (r === 0) return `${h}${NBSP}h`
  return `${h}${NBSP}h${NBSP}${String(r).padStart(2, '0')}`
}

export function minutesToShort(m: number): string {
  if (!m) return '—'
  if (m < 60) return `${m}${NBSP}min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r === 0 ? `${h}${NBSP}h` : `${h}${NBSP}h${NBSP}${String(r).padStart(2, '0')}`
}

// Hex tones par DomainColor — utilisées pour la barre de focus et les badges domaine
export const DOMAIN_COLOR_TONES: Record<string, { color: string; soft: string; deep: string }> = {
  red:    { color: '#C53030', soft: '#FEF2F2', deep: '#9B1C1C' },
  orange: { color: '#B5532A', soft: '#EAD1BE', deep: '#8E3D1C' },
  yellow: { color: '#C29A6A', soft: '#EFE1CB', deep: '#7A5430' },
  green:  { color: '#5C7859', soft: '#D5DFD0', deep: '#3F5A3C' },
  teal:   { color: '#7E9A7A', soft: '#D5DFD0', deep: '#5C7859' },
  blue:   { color: '#4A7B9D', soft: '#D6E8F5', deep: '#2C5C7A' },
  indigo: { color: '#5C6BC0', soft: '#E8EAF6', deep: '#3949AB' },
  purple: { color: '#7B68B0', soft: '#EDE7F6', deep: '#4527A0' },
  pink:   { color: '#C2185B', soft: '#FCE4EC', deep: '#880E4F' },
  gray:   { color: '#A08B72', soft: '#E2D7C2', deep: '#54422E' },
}
