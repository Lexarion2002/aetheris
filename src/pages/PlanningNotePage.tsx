import { useState, useEffect, useMemo, type CSSProperties } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { usePlanningStore } from '../store/planningStore'

// =============================================================================
// Catalogue des notes système connues
// (un slug inconnu reste éditable, simplement avec un titre par défaut)
// =============================================================================

const KNOWN_NOTES: Record<string, { title: string, hint: string, placeholder: string }> = {
  anti_abandon_rules: {
    title: 'Règles anti-abandon',
    hint: 'Plafonds stricts, calendrier des permissions d\'optimisation, évaluation binaire J+30/60/90, les 9 règles.',
    placeholder: '## Plafond strict\n- Habitudes simultanées : 2 max\n- OKR annuels : 5 max\n- Rocks/trimestre : 5 max\n- MITs/semaine : 3 max\n- Outils actifs : 11 max\n\n> Tout ajout = retrait obligatoire.',
  },
  profile: {
    title: 'Profil & règles d\'interaction',
    hint: 'Identité de référence, ton attendu (radical honesty), format des réponses, niveau d\'expertise.',
    placeholder: '## Profil\nLouis Saure — Alternant M2 Droit des contrats d\'affaires.\n\n## Règles d\'interaction\n- Pas de flatterie, ton neutre et direct.\n- Jamais de spéculation sans signal explicite d\'incertitude.\n- Une seule question de clarification si la demande est ambiguë.',
  },
  stack_reference: {
    title: 'Stack — Référence',
    hint: 'Outils actifs, responsabilité de chacun, règle d\'inflation zéro.',
    placeholder: '| Outil | Responsabilité | Statut |\n|---|---|---|\n| TickTick | Tâches · Habitudes · Pomodoro | 🟢 |\n| Aetheris | Cascade · Finances · Lectures | 🟢 |\n\n> Règle d\'inflation zéro : tout nouvel outil = désinstallation d\'un existant.',
  },
  protocole_re_entree: {
    title: 'Protocole de re-entrée',
    hint: 'Procédure de retour après rupture d\'une habitude. Activé dans les 24h, jamais 3 jours.',
    placeholder: '## Quand activer\nDès qu\'une habitude saute → retour dans les 24h, pas 3 jours.\n\n## Étapes\n1. …\n2. …\n3. …',
  },
}

const ALL_SLUGS = Object.keys(KNOWN_NOTES)

// =============================================================================
// Tokens
// =============================================================================

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 10.5,
  letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--ink-3)',
}

const card: CSSProperties = {
  background: 'var(--paper-1)',
  border: '1px solid var(--paper-2)',
  borderRadius: 12,
  padding: 18,
}

const input: CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 14,
  fontFamily: 'var(--font-sans)',
  color: 'var(--fg)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const btnPrimary: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'var(--terra)', color: 'var(--paper)',
  border: 'none', borderRadius: 8,
  padding: '8px 16px', fontSize: 13, fontWeight: 500,
  cursor: 'pointer',
}

const ghostLink: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: 'transparent', color: 'var(--fg-muted)',
  border: '1px solid var(--border)', borderRadius: 8,
  padding: '6px 12px', fontSize: 12.5,
  cursor: 'pointer', textDecoration: 'none',
}

// =============================================================================
// Page
// =============================================================================

export function PlanningNotePage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const meta = KNOWN_NOTES[slug] ?? { title: slug, hint: '', placeholder: '' }

  const systemNotes = usePlanningStore((s) => s.systemNotes)
  const upsertSystemNote = usePlanningStore((s) => s.upsertSystemNote)

  const existing = useMemo(
    () => systemNotes.find((n) => n.slug === slug),
    [systemNotes, slug],
  )

  const [contentMd, setContentMd] = useState(existing?.contentMd ?? '')
  const [title, setTitle]         = useState(existing?.title ?? meta.title)
  const [savedAt, setSavedAt]     = useState<string | null>(existing?.updatedAt ?? null)
  const [dirty, setDirty]         = useState(false)

  // Reload quand on change de slug
  useEffect(() => {
    const fresh = systemNotes.find((n) => n.slug === slug)
    setContentMd(fresh?.contentMd ?? '')
    setTitle(fresh?.title ?? meta.title)
    setSavedAt(fresh?.updatedAt ?? null)
    setDirty(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const save = () => {
    const saved = upsertSystemNote(slug, { title, contentMd })
    setSavedAt(saved.updatedAt)
    setDirty(false)
  }

  return (
    <div style={{
      maxWidth: 820, margin: '0 auto', padding: '28px 24px 80px',
      display: 'flex', flexDirection: 'column', gap: 22,
    }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/planning" style={{ ...labelStyle, color: 'var(--fg-subtle)', textDecoration: 'none' }}>
            ← Planning
          </Link>
          <NoteSwitcher currentSlug={slug} />
        </div>
        <input
          style={{ ...input, fontSize: 22, fontWeight: 500, border: 'none', padding: 0, fontFamily: 'var(--font-serif, var(--font-sans))', letterSpacing: '-0.01em' }}
          value={title}
          onChange={(e) => { setTitle(e.target.value); setDirty(true) }}
          placeholder="Titre…"
        />
        {meta.hint && (
          <p style={{ color: 'var(--fg-subtle)', fontSize: 12.5, fontStyle: 'italic', margin: 0 }}>
            {meta.hint}
          </p>
        )}
      </header>

      {/* ── Éditeur ─────────────────────────────────────────────────────────── */}
      <section style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <textarea
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'transparent', border: 'none',
            outline: 'none', resize: 'vertical',
            padding: 18, minHeight: 520,
            fontFamily: 'var(--font-mono)', fontSize: 13.5,
            lineHeight: 1.65, color: 'var(--fg)',
          }}
          value={contentMd}
          onChange={(e) => { setContentMd(e.target.value); setDirty(true) }}
          placeholder={meta.placeholder || 'Markdown libre…'}
        />
      </section>

      {/* ── Footer / save ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ ...labelStyle, color: 'var(--fg-subtle)' }}>
          {savedAt
            ? `Enregistré ${new Date(savedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`
            : 'Jamais enregistré'}
          {dirty && <span style={{ color: 'var(--terra)', marginLeft: 8 }}>· modifications non sauvegardées</span>}
        </span>
        <button style={btnPrimary} onClick={save} disabled={!dirty && !!savedAt}>
          <Check size={14} /> Enregistrer
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// Switcher entre les notes connues
// =============================================================================

function NoteSwitcher({ currentSlug }: { currentSlug: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {ALL_SLUGS.map((s) => {
        const active = s === currentSlug
        return (
          <Link
            key={s}
            to={`/planning/notes/${s}`}
            style={{
              ...ghostLink,
              background:  active ? 'var(--paper-2)' : 'transparent',
              color:       active ? 'var(--fg)' : 'var(--fg-muted)',
              borderColor: active ? 'var(--fg-subtle)' : 'var(--border)',
            }}
          >
            {KNOWN_NOTES[s].title}
          </Link>
        )
      })}
    </div>
  )
}

export const SYSTEM_NOTE_CATALOG = KNOWN_NOTES
