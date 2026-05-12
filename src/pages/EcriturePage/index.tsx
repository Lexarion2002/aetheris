import { useState } from 'react'
import { EcritureHeader } from './EcritureHeader'
import { SemaineEnCours } from './SemaineEnCours'
import { Bibliotheque } from './Bibliotheque'
import { Statistiques } from './Statistiques'
import type { TabKey } from './EcritureHeader'
import type { NouvelleActuelle, NouvellePassee, SemaineStats, GenreStats } from './data'
import { CURRENT, PAST, WEEKS, GENRES } from './data'

export function EcriturePage() {
  const [tab, setTab]         = useState<TabKey>('semaine')
  const [current, setCurrent] = useState<NouvelleActuelle | null>(CURRENT)
  const [past, setPast]       = useState<NouvellePassee[]>(PAST)
  const [weeks, setWeeks]     = useState<SemaineStats[]>(WEEKS)
  const [genres, setGenres]   = useState<GenreStats[]>(GENRES)

  function commencer(data: { titre: string; genre: string; synopsis: string; objectif: number }) {
    const n = past.length + 1
    setCurrent({
      n,
      titre: data.titre,
      genre: data.genre,
      synopsis: data.synopsis,
      jours_restants: 7,
      objectif: data.objectif,
      ecrits: 0,
      sessions: [],
      fragments: { idees: [], alternatives: [] },
    })
    setWeeks(prev => [...prev, { n, mots: 0, etat: 'en cours' }])
    setGenres(prev => {
      const existing = prev.find(g => g.nom === data.genre)
      if (existing) return prev.map(g => g.nom === data.genre ? { ...g, n: g.n + 1 } : g)
      return [...prev, { nom: data.genre, n: 1 }]
    })
  }

  return (
    <div>
      <EcritureHeader tab={tab} setTab={setTab} />
      {tab === 'semaine' && <SemaineEnCours current={current} onCommencer={commencer} />}
      {tab === 'biblio'  && <Bibliotheque past={past} />}
      {tab === 'stats'   && <Statistiques weeks={weeks} genres={genres} past={past} />}
    </div>
  )
}
