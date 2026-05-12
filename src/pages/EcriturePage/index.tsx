import { useState } from 'react'
import { EcritureHeader } from './EcritureHeader'
import { SemaineEnCours } from './SemaineEnCours'
import { Bibliotheque } from './Bibliotheque'
import { Statistiques } from './Statistiques'
import type { TabKey } from './EcritureHeader'

export function EcriturePage() {
  const [tab, setTab] = useState<TabKey>('semaine')
  return (
    <div>
      <EcritureHeader tab={tab} setTab={setTab} />
      {tab === 'semaine' && <SemaineEnCours />}
      {tab === 'biblio'  && <Bibliotheque />}
      {tab === 'stats'   && <Statistiques />}
    </div>
  )
}
