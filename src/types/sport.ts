export interface Exercise {
  name: string
  sets: string
  iso?: boolean
}

export interface MuscuSession {
  id: string
  date: string          // YYYY-MM-DD
  title: string
  duration: string      // "1 h 12", "58 min"
  exercises: Exercise[]
  note?: string
}

export interface Split {
  km: number
  pace: string          // "4:58"
}

export interface Run {
  id: string
  date: string          // YYYY-MM-DD
  title: string
  distance: number      // km
  pace: string          // "4:58"
  duration: string      // "50:39"
  elevation?: number
  note?: string
  splits?: Split[]
}

export interface SportGoal {
  id: string
  sport: 'muscu' | 'course'
  title: string
  note?: string
}
