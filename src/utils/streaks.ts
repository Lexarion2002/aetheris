import type { Task, TimeSession } from '../types'

export interface DailyStreak {
  current:     number   // jours consécutifs jusqu'à aujourd'hui (ou hier si pas encore actif)
  best:        number   // record historique
  activeToday: boolean  // vrai si déjà actif aujourd'hui
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

function shiftDay(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().split('T')[0]
}

/**
 * Collecte tous les jours où l'utilisateur a été actif.
 * Un jour est actif si :
 *  - au moins une tâche a été marquée comme `done` ce jour-là (basé sur updatedAt)
 *  - OU au moins une session de focus a été enregistrée ce jour-là
 *  - OU une activité d'un autre store (workout, session d'écriture, etc.) a eu lieu ce jour
 */
function collectActiveDays(tasks: Task[], sessions: TimeSession[], extraDates: string[]): Set<string> {
  const days = new Set<string>()
  for (const t of tasks) {
    if (t.status === 'done' && t.updatedAt) {
      days.add(t.updatedAt.split('T')[0])
    }
  }
  for (const s of sessions) {
    if (s.date) days.add(s.date)
  }
  for (const d of extraDates) {
    if (d) days.add(d.split('T')[0])
  }
  return days
}

// ─── Computation principale ──────────────────────────────────────────────────

export function computeDailyStreak(
  tasks: Task[],
  sessions: TimeSession[],
  extraDates: string[] = [],
): DailyStreak {
  const activeDays = collectActiveDays(tasks, sessions, extraDates)
  if (activeDays.size === 0) return { current: 0, best: 0, activeToday: false }

  const today = todayIso()
  const activeToday = activeDays.has(today)

  // Streak courant : on remonte depuis aujourd'hui (ou hier si pas encore actif)
  let current = 0
  let cursor = activeToday ? today : shiftDay(today, -1)
  while (activeDays.has(cursor)) {
    current++
    cursor = shiftDay(cursor, -1)
  }

  // Meilleur streak historique
  const sorted = [...activeDays].sort()
  let best = 0
  let run = 0
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || shiftDay(sorted[i - 1], 1) !== sorted[i]) run = 1
    else run++
    if (run > best) best = run
  }

  return { current, best: Math.max(best, current), activeToday }
}
