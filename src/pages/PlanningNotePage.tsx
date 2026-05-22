import { useState, useEffect, useMemo, type CSSProperties, type ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Check, Pencil, Download, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { usePlanningStore } from '../store/planningStore'
import { getSeedBySlug } from '../lib/systemNotesSeed'

// =============================================================================
// Catalogue des notes système connues
// (un slug inconnu reste éditable, simplement avec un titre par défaut)
// =============================================================================

const KNOWN_NOTES: Record<string, { title: string, hint: string }> = {
  anti_abandon_rules: {
    title: 'Règles anti-abandon',
    hint: 'Plafonds stricts, calendrier des permissions d\'optimisation, évaluation binaire J+30/60/90, les 9 règles.',
  },
  profile: {
    title: 'Profil & règles d\'interaction',
    hint: 'Identité de référence, ton attendu (radical honesty), format des réponses, niveau d\'expertise.',
  },
  stack_reference: {
    title: 'Stack — Référence',
    hint: 'Outils actifs, responsabilité de chacun, règle d\'inflation zéro.',
  },
  protocole_re_entree: {
    title: 'Protocole de re-entrée',
    hint: 'Procédure de retour après rupture d\'une habitude. Activé dans les 24h, jamais 3 jours.',
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

const btnGhost: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'transparent', color: 'var(--fg-muted)',
  border: '1px solid var(--border)', borderRadius: 8,
  padding: '7px 14px', fontSize: 12.5,
  cursor: 'pointer', textDecoration: 'none',
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
  const meta = KNOWN_NOTES[slug] ?? { title: slug, hint: '' }
  const seed = useMemo(() => getSeedBySlug(slug), [slug])

  const systemNotes = usePlanningStore((s) => s.systemNotes)
  const upsertSystemNote = usePlanningStore((s) => s.upsertSystemNote)

  const existing = useMemo(
    () => systemNotes.find((n) => n.slug === slug),
    [systemNotes, slug],
  )

  const [editing,   setEditing]   = useState(false)
  const [contentMd, setContentMd] = useState(existing?.contentMd ?? '')
  const [title,     setTitle]     = useState(existing?.title ?? meta.title)

  // Reload quand on change de slug
  useEffect(() => {
    const fresh = systemNotes.find((n) => n.slug === slug)
    setContentMd(fresh?.contentMd ?? '')
    setTitle(fresh?.title ?? meta.title)
    setEditing(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const save = () => {
    upsertSystemNote(slug, { title, contentMd })
    setEditing(false)
  }

  const importFromNotion = () => {
    if (!seed) return
    upsertSystemNote(slug, { title: seed.title, contentMd: seed.contentMd })
    setTitle(seed.title)
    setContentMd(seed.contentMd)
    setEditing(false)
  }

  const cancelEdit = () => {
    setContentMd(existing?.contentMd ?? '')
    setTitle(existing?.title ?? meta.title)
    setEditing(false)
  }

  const isEmpty = !contentMd.trim()

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

        {editing ? (
          <input
            style={{ ...input, fontSize: 22, fontWeight: 500, border: 'none', padding: 0, fontFamily: 'var(--font-serif, var(--font-sans))', letterSpacing: '-0.01em' }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre…"
          />
        ) : (
          <h1 style={{
            margin: 0,
            fontSize: 28, fontWeight: 500,
            fontFamily: 'var(--font-serif, var(--font-sans))',
            letterSpacing: '-0.01em',
            color: 'var(--fg)',
          }}>
            {title}
          </h1>
        )}

        {meta.hint && (
          <p style={{ color: 'var(--fg-subtle)', fontSize: 12.5, fontStyle: 'italic', margin: 0 }}>
            {meta.hint}
          </p>
        )}
      </header>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {!editing && !isEmpty && (
          <button style={btnGhost} onClick={() => setEditing(true)}>
            <Pencil size={13} /> Modifier
          </button>
        )}
        {!editing && seed && (
          <button
            style={isEmpty ? btnPrimary : btnGhost}
            onClick={importFromNotion}
            title="Remplace le contenu actuel par la version Notion"
          >
            <Download size={13} /> {isEmpty ? 'Importer depuis Notion' : 'Réimporter depuis Notion'}
          </button>
        )}
        {editing && (
          <>
            <button style={btnPrimary} onClick={save}>
              <Check size={13} /> Enregistrer
            </button>
            <button style={btnGhost} onClick={cancelEdit}>
              <X size={13} /> Annuler
            </button>
          </>
        )}
        {existing?.updatedAt && !editing && (
          <span style={{ ...labelStyle, color: 'var(--fg-subtle)', marginLeft: 'auto' }}>
            Modifié {new Date(existing.updatedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        )}
      </div>

      {/* ── Contenu : édition OU rendu Markdown ─────────────────────────────── */}
      {editing ? (
        <section style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <textarea
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'transparent', border: 'none',
              outline: 'none', resize: 'vertical',
              padding: 18, minHeight: 520,
              fontFamily: 'var(--font-mono)', fontSize: 13.5,
              lineHeight: 1.65, color: 'var(--fg)',
            }}
            value={contentMd}
            onChange={(e) => setContentMd(e.target.value)}
            placeholder="Markdown libre…"
          />
        </section>
      ) : isEmpty ? (
        <EmptyState
          slug={slug}
          hasSeed={!!seed}
          onImport={importFromNotion}
          onWrite={() => setEditing(true)}
        />
      ) : (
        <article style={{ ...card, padding: '28px 32px' }}>
          <NoteMarkdown source={contentMd} />
        </article>
      )}
    </div>
  )
}

// =============================================================================
// Empty state
// =============================================================================

function EmptyState({ slug, hasSeed, onImport, onWrite }: {
  slug: string
  hasSeed: boolean
  onImport: () => void
  onWrite:  () => void
}) {
  return (
    <div style={{
      ...card,
      padding: 48,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      textAlign: 'center',
      borderStyle: 'dashed',
    }}>
      <span style={{ ...labelStyle, color: 'var(--fg-subtle)' }}>
        Note vide
      </span>
      <p style={{ color: 'var(--fg-muted)', fontSize: 14, lineHeight: 1.55, margin: 0, maxWidth: 460 }}>
        {hasSeed
          ? 'Le contenu de cette note existe déjà dans le hub Memory Notion. Tu peux l\'importer en un clic ou la rédiger directement.'
          : `Aucun contenu Notion connu pour le slug « ${slug} ». Rédige la note directement en Markdown.`}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
        {hasSeed && (
          <button style={btnPrimary} onClick={onImport}>
            <Download size={14} /> Importer depuis Notion
          </button>
        )}
        <button style={btnGhost} onClick={onWrite}>
          <Pencil size={13} /> Rédiger en Markdown
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

// =============================================================================
// Rendu Markdown stylé (palette Aetheris)
// =============================================================================

function NoteMarkdown({ source }: { source: string }) {
  return (
    <div style={{ color: 'var(--fg)', fontSize: 14.5, lineHeight: 1.65 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 style={{
              fontFamily: 'var(--font-serif, var(--font-sans))',
              fontSize: 22, fontWeight: 500, color: 'var(--fg)',
              letterSpacing: '-0.01em',
              margin: '24px 0 12px',
              paddingBottom: 6,
              borderBottom: '1px solid var(--paper-2)',
            }}>{children}</h2>
          ),
          h2: ({ children }) => (
            <h3 style={{
              fontFamily: 'var(--font-serif, var(--font-sans))',
              fontSize: 18, fontWeight: 500, color: 'var(--fg)',
              letterSpacing: '-0.01em',
              margin: '24px 0 10px',
            }}>{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 style={{
              ...labelStyle, fontSize: 11, color: 'var(--terra)',
              margin: '18px 0 8px',
            }}>{children}</h4>
          ),
          p: ({ children }) => (
            <p style={{ margin: '0 0 12px', color: 'var(--fg)' }}>{children}</p>
          ),
          ul: ({ children }) => (
            <ul style={{ margin: '0 0 14px', paddingLeft: 22 }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ margin: '0 0 14px', paddingLeft: 22 }}>{children}</ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: 4, lineHeight: 1.6 }}>{children}</li>
          ),
          strong: ({ children }) => (
            <strong style={{ color: 'var(--fg)', fontWeight: 600 }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ color: 'var(--fg-muted)' }}>{children}</em>
          ),
          a: ({ href, children }) => (
            <a href={href} style={{ color: 'var(--terra)', textDecoration: 'underline' }} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote style={{
              margin: '14px 0',
              padding: '10px 16px',
              borderLeft: '3px solid var(--terra)',
              background: 'var(--terra-soft)',
              borderRadius: '0 8px 8px 0',
              color: 'var(--fg)',
              fontStyle: 'italic',
            }}>
              <BlockquoteInner>{children}</BlockquoteInner>
            </blockquote>
          ),
          code: ({ children, ...props }) => {
            const isInline = !(props as { node?: { position?: { start: { line: number }, end: { line: number } } } }).node
              || (props as { node?: { position?: { start: { line: number }, end: { line: number } } } }).node?.position?.start.line
                 === (props as { node?: { position?: { start: { line: number }, end: { line: number } } } }).node?.position?.end.line
            return isInline ? (
              <code style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.9em',
                background: 'var(--paper-2)', color: 'var(--terra)',
                padding: '1px 6px', borderRadius: 4,
              }}>{children}</code>
            ) : (
              <pre style={{
                background: 'var(--paper-2)', color: 'var(--fg)',
                padding: 14, borderRadius: 8, overflow: 'auto',
                fontSize: 12.5, lineHeight: 1.5,
                margin: '12px 0',
              }}><code>{children}</code></pre>
            )
          },
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '14px 0' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                fontSize: 13.5,
                background: 'var(--paper)',
                border: '1px solid var(--paper-2)',
                borderRadius: 10,
                overflow: 'hidden',
              }}>{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead style={{ background: 'var(--paper-2)' }}>{children}</thead>
          ),
          th: ({ children }) => (
            <th style={{
              ...labelStyle, fontSize: 10,
              textAlign: 'left', padding: '10px 14px',
              borderBottom: '1px solid var(--paper-2)',
              color: 'var(--ink-3)',
            }}>{children}</th>
          ),
          td: ({ children }) => (
            <td style={{
              padding: '10px 14px',
              borderTop: '1px solid var(--paper-2)',
              color: 'var(--fg)',
              verticalAlign: 'top',
            }}>{children}</td>
          ),
          hr: () => (
            <hr style={{
              border: 'none',
              borderTop: '1px solid var(--paper-2)',
              margin: '24px 0',
            }} />
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}

// React-markdown wraps content of a blockquote in <p>. On laisse passer,
// mais on règle la marge intérieure pour rester compact.
function BlockquoteInner({ children }: { children: ReactNode }) {
  return <div style={{ marginBottom: 0 }}>{children}</div>
}

export const SYSTEM_NOTE_CATALOG = KNOWN_NOTES
