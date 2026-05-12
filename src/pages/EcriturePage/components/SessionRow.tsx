import { Num } from '../primitives'
import type { EcritureSession } from '../data'

export function SessionRow({ date, note, mots, duree }: EcritureSession) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '110px 1fr 100px 90px',
      gap: 16,
      alignItems: 'center',
      padding: '14px 18px 14px 15px',
      background: 'var(--paper-1)',
      borderRadius: 8,
      border: '1px solid var(--paper-2)',
      borderLeft: '3px solid var(--terra)',
    }}>
      <Num style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-2)' }}>
        {date}
      </Num>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14.5, color: 'var(--ink)' }}>{note}</span>
      <Num style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, textAlign: 'right' }}>
        {mots.toLocaleString('fr-FR').replace(',', ' ')} mots
      </Num>
      <Num style={{ fontSize: 13, color: 'var(--ink-2)', textAlign: 'right' }}>{duree}</Num>
    </div>
  )
}
