// Bandeau countdown global du hub /droit.
// Carte horizontale avec accent terra à gauche, met en évidence le J-X des
// partiels et les chiffres clés (sujets fichés, flashcards dues).

interface Props {
  daysLeft: number
  range:    string   // "1er au 4 juin 2026"
  filed:    number   // 3
  total:    number   // 33
  due:      number   // 18
  onReview?: () => void
}

export function CountdownBanner({ daysLeft, range, filed, total, due, onReview }: Props) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '4px 1fr auto',
      background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
      borderRadius: 12, overflow: 'hidden', alignItems: 'stretch',
    }}>
      <div style={{ background: 'var(--terra)' }} />

      <div style={{ padding: '20px 24px 20px 22px', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 500,
            color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1,
          }}>
            Partiels
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 500,
            color: 'var(--terra)', letterSpacing: '0.02em',
          }}>
            J−{daysLeft}
          </span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-2)' }}>
            {range}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 2 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)', letterSpacing: '0.02em' }}>
            <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{filed}</span>
            <span style={{ color: 'var(--ink-3)' }}>/{total}</span>
            <span style={{ color: 'var(--ink-2)', marginLeft: 6 }}>sujets fichés</span>
          </span>
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)', letterSpacing: '0.02em' }}>
            <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{due}</span>
            <span style={{ color: 'var(--ink-2)', marginLeft: 6 }}>flashcards dues aujourd'hui</span>
          </span>
        </div>
      </div>

      {due > 0 && (
        <button
          onClick={onReview}
          style={{
            alignSelf: 'center', marginRight: 20, padding: '8px 14px',
            background: 'transparent', border: '1px solid var(--ink-4)',
            borderRadius: 8, color: 'var(--ink)',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-2)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          Réviser ces {due} cartes →
        </button>
      )}
    </div>
  )
}
