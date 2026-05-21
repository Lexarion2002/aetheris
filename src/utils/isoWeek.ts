// =============================================================================
// ISO 8601 week helpers (lundi = jour 1, semaine 1 = celle contenant le 4 janvier)
// =============================================================================

/** Numéro de semaine ISO (1-53) pour une date. */
export function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  // Jeudi de la semaine en cours détermine l'année ISO
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/** Année ISO (peut différer de date.getFullYear() en bordure de semaine). */
export function getISOWeekYear(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  return date.getUTCFullYear()
}

/** Lundi de la semaine ISO donnée (en local timezone, début du jour). */
export function weekStart(isoYear: number, isoWeek: number): Date {
  // 4 janvier appartient toujours à la semaine 1 (par définition ISO)
  const jan4 = new Date(isoYear, 0, 4)
  const jan4Day = jan4.getDay() || 7  // lundi=1, dim=7
  // Lundi de la semaine 1
  const week1Monday = new Date(isoYear, 0, 4 - (jan4Day - 1))
  // Décalage de N-1 semaines
  const result = new Date(week1Monday)
  result.setDate(week1Monday.getDate() + (isoWeek - 1) * 7)
  result.setHours(0, 0, 0, 0)
  return result
}

/** Dimanche de la semaine ISO donnée (fin du jour). */
export function weekEnd(isoYear: number, isoWeek: number): Date {
  const start = weekStart(isoYear, isoWeek)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

/** Plage [lundi, dimanche] au format ISO date string "YYYY-MM-DD". */
export function weekRange(isoYear: number, isoWeek: number): { start: string, end: string } {
  const s = weekStart(isoYear, isoWeek)
  const e = weekEnd(isoYear, isoWeek)
  const fmt = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: fmt(s), end: fmt(e) }
}

/** Date en ISO format "YYYY-MM-DD" (local timezone). */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Aujourd'hui en ISO format "YYYY-MM-DD". */
export function todayISO(): string {
  return toISODate(new Date())
}

/** Demain en ISO format "YYYY-MM-DD". */
export function tomorrowISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toISODate(d)
}

/** Décale une date ISO de N jours (positif = futur, négatif = passé). */
export function shiftDateISO(iso: string, days: number): string {
  const [y, m, day] = iso.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Décale une semaine ISO de N semaines. */
export function shiftISOWeek(isoYear: number, isoWeek: number, weeks: number): { isoYear: number, isoWeek: number } {
  const start = weekStart(isoYear, isoWeek)
  start.setDate(start.getDate() + weeks * 7)
  return { isoYear: getISOWeekYear(start), isoWeek: getISOWeek(start) }
}

/** Format jour de la semaine en français court. */
const JOURS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam']
const JOURS_FULL = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** "lundi 24 mai" depuis une ISO date. */
export function formatDayLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${JOURS_FULL[date.getDay()]} ${date.getDate()} ${MOIS[date.getMonth()]}`
}

/** "lun. 24 mai" depuis une ISO date. */
export function formatDayShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${JOURS[date.getDay()]}. ${date.getDate()} ${MOIS[date.getMonth()].slice(0, 3)}.`
}

/** "lundi 24 → dimanche 30 mai" pour une plage de semaine. */
export function formatWeekRange(isoYear: number, isoWeek: number): string {
  const { start, end } = weekRange(isoYear, isoWeek)
  return `${formatDayLong(start)} → ${formatDayLong(end)}`
}
