import { useState } from 'react'
import { EcritureHeader } from './EcritureHeader'
import { SemaineEnCours } from './SemaineEnCours'
import { Bibliotheque } from './Bibliotheque'
import { Statistiques } from './Statistiques'
import type { TabKey } from './EcritureHeader'
import { useEcritureHebdoStore } from '../../store/ecritureHebdoStore'

export function EcriturePage() {
  const [tab, setTab] = useState<TabKey>('semaine')

  const current   = useEcritureHebdoStore(s => s.current)
  const past      = useEcritureHebdoStore(s => s.past)
  const weeks     = useEcritureHebdoStore(s => s.weeks)
  const genres    = useEcritureHebdoStore(s => s.genres)
  const commencer      = useEcritureHebdoStore(s => s.commencer)
  const ajouterSession = useEcritureHebdoStore(s => s.ajouterSession)

  return (
    <div>
      <EcritureHeader tab={tab} setTab={setTab} />
      {tab === 'semaine' && <SemaineEnCours current={current} onCommencer={commencer} onSession={ajouterSession} />}
      {tab === 'biblio'  && <Bibliotheque past={past} />}
      {tab === 'stats'   && <Statistiques weeks={weeks} genres={genres} past={past} />}
    </div>
  )
}
