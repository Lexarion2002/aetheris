import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type GlobalStatus = 'recherches' | 'redaction' | 'repetition' | 'finalisation'

interface LawState {
  grandOralDate: string | null   // YYYY-MM-DD
  rapportDate:   string | null   // YYYY-MM-DD
  globalStatus:  GlobalStatus
  notionUrl:     string

  setGrandOralDate: (date: string | null) => void
  setRapportDate:   (date: string | null) => void
  setGlobalStatus:  (status: GlobalStatus) => void
  setNotionUrl:     (url: string) => void
}

export const useLawStore = create<LawState>()(
  persist(
    (set) => ({
      grandOralDate: null,
      rapportDate:   null,
      globalStatus:  'recherches',
      notionUrl:     '',

      setGrandOralDate: (date)   => set({ grandOralDate: date }),
      setRapportDate:   (date)   => set({ rapportDate: date }),
      setGlobalStatus:  (status) => set({ globalStatus: status }),
      setNotionUrl:     (url)    => set({ notionUrl: url }),
    }),
    { name: 'aetheris-law-v1' },
  ),
)
