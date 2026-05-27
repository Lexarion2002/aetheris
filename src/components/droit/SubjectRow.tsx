// Ligne sujet dans le tableau de la page matière.
// Cœur de l'UX : intitulé · 4 mini-checkboxes (F/R/S/Q) · pastille confiance · bouton flashcard.

import { useState } from 'react'
import { MiniCheck, ConfDot } from './atoms'
import type { Sujet, SubjectChecks } from '../../store/droitStore'

interface Props {
  sujet:           Sujet
  isLast?:         boolean
  onCycleConfidence: () => void
  onToggle:        (key: keyof SubjectChecks) => void
  onAddFlash?:     () => void
}

export function SubjectRow({ sujet, isLast, onCycleConfidence, onToggle, onAddFlash }: Props) {
  const [hover, setHover] = useState(false)
  const allChecked = sujet.checks.fiche && sujet.checks.revu && sujet.checks.simule && sujet.checks.questions
  const titleColor = allChecked ? 'var(--ink-2)' : 'var(--ink)'

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto',
        gap: 24, alignItems: 'center',
        padding: '14px 20px',
        background: hover ? 'var(--paper-2)' : 'transparent',
        borderBottom: isLast ? 'none' : '1px solid var(--paper-2)',
        transition: 'background var(--dur) var(--ease)',
      }}
    >
      {/* Titre */}
      <div style={{
        fontFamily: 'var(--font-serif)', fontSize: 15.5, color: titleColor,
        lineHeight: 1.3, minWidth: 0,
        fontStyle: allChecked ? 'italic' : 'normal',
      }}>
        {sujet.title}
      </div>

      {/* 4 mini checkboxes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <CheckGroup label="F" title="Fiche"     checked={sujet.checks.fiche}     onClick={() => onToggle('fiche')} />
        <CheckGroup label="R" title="Revu"      checked={sujet.checks.revu}      onClick={() => onToggle('revu')} />
        <CheckGroup label="S" title="Simulé"    checked={sujet.checks.simule}    onClick={() => onToggle('simule')} />
        <CheckGroup label="Q" title="Questions" checked={sujet.checks.questions} onClick={() => onToggle('questions')} />
      </div>

      {/* Pastille confiance cliquable */}
      <button
        onClick={onCycleConfidence}
        title="Confiance — clic pour changer"
        aria-label={`Confiance : ${sujet.confidence}`}
        style={{
          width: 28, height: 28, borderRadius: 999, padding: 0, cursor: 'pointer',
          background: 'transparent', border: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <ConfDot tone={sujet.confidence} size={14} ring />
      </button>

      {/* Bouton + flashcard */}
      {onAddFlash ? (
        <button
          onClick={onAddFlash}
          title="Ajouter une flashcard"
          aria-label="Ajouter une flashcard"
          style={{
            width: 28, height: 28, padding: 0, borderRadius: 6, cursor: 'pointer',
            background: 'transparent',
            border: '1px solid ' + (hover ? 'var(--ink-4)' : 'var(--paper-2)'),
            color: 'var(--ink-2)',
            fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 400,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
            transition: 'border-color var(--dur) var(--ease), color var(--dur) var(--ease)',
          }}
        >
          +
        </button>
      ) : (
        <span style={{ width: 28, height: 28 }} />
      )}
    </div>
  )
}

// ─── CheckGroup ───────────────────────────────────────────────────────────────

function CheckGroup({
  label, title, checked, onClick,
}: {
  label:   string
  title:   string
  checked: boolean
  onClick: () => void
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <MiniCheck checked={checked} label={title} onClick={onClick} />
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: checked ? 'var(--ink)' : 'var(--ink-3)',
        fontWeight: checked ? 500 : 400,
      }}>
        {label}
      </span>
    </span>
  )
}
