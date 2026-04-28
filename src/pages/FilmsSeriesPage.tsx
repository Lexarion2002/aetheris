import { useState, useRef, Fragment } from 'react'
import { Film, Tv, Check, Edit2, Trash2, Plus, Play, Bookmark } from 'lucide-react'
import { useFilmSerieStore } from '../store/filmSerieStore'
import type { FilmSerie, FilmSerieType, FilmSerieStatus } from '../store/filmSerieStore'

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTED_TAGS = [
  'action', 'comédie', 'drame', 'horreur', 'sci-fi',
  'thriller', 'animation', 'documentaire', 'romance',
  'fantastique', 'biopic', 'crime',
]

const POSTER_PALETTES = [
  { bg: '#3A2E22', fg: '#F4ECDC', accent: '#B5532A' },
  { bg: '#B5532A', fg: '#FBF6EA', accent: '#3A2E22' },
  { bg: '#5C7859', fg: '#FBF6EA', accent: '#EAD1BE' },
  { bg: '#8E3D1C', fg: '#F4ECDC', accent: '#EAD1BE' },
  { bg: '#2E3A4A', fg: '#EADFC8', accent: '#B5532A' },
  { bg: '#6B5B48', fg: '#FBF6EA', accent: '#EAD1BE' },
  { bg: '#7E5A3A', fg: '#FBF6EA', accent: '#EAD1BE' },
  { bg: '#4A3A2A', fg: '#F4ECDC', accent: '#B5532A' },
  { bg: '#A04A2A', fg: '#FBF6EA', accent: '#3A2E22' },
  { bg: '#3F4A3C', fg: '#EADFC8', accent: '#B5532A' },
  { bg: '#C7B59A', fg: '#3A2E22', accent: '#8E3D1C' },
  { bg: '#1F1A14', fg: '#EAD1BE', accent: '#B5532A' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function fmtDate(iso: string | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Poster — composant génératif ─────────────────────────────────────────────

type PosterMotif = 'circle' | 'lines' | 'band' | 'corner' | 'square' | 'arc' | 'split' | 'dot'

function PosterArtwork({ palette, motif }: {
  palette: { bg: string; fg: string; accent: string }; motif: PosterMotif
}) {
  const { fg, accent } = palette
  switch (motif) {
    case 'circle': return (
      <svg viewBox="0 0 100 150" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <circle cx="50" cy="55" r="28" fill="none" stroke={accent} strokeWidth="0.6" opacity="0.5" />
        <circle cx="50" cy="55" r="18" fill={accent} opacity="0.18" />
      </svg>
    )
    case 'lines': return (
      <svg viewBox="0 0 100 150" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <line key={i} x1="0" x2="100" y1={20 + i * 6} y2={20 + i * 6} stroke={fg} strokeWidth="0.2" opacity="0.18" />
        ))}
      </svg>
    )
    case 'band': return (
      <div style={{ position: 'absolute', left: 0, right: 0, top: '38%', height: 18, background: accent, opacity: 0.85 }} />
    )
    case 'corner': return (
      <svg viewBox="0 0 100 150" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <polygon points="0,0 60,0 0,90" fill={accent} opacity="0.7" />
      </svg>
    )
    case 'square': return (
      <div style={{ position: 'absolute', left: '18%', top: '20%', width: '64%', height: '40%', border: `1px solid ${fg}`, opacity: 0.25 }} />
    )
    case 'arc': return (
      <svg viewBox="0 0 100 150" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path d="M -10 130 Q 50 40 110 130" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.6" />
        <path d="M -10 140 Q 50 60 110 140" fill="none" stroke={fg} strokeWidth="0.3" opacity="0.3" />
      </svg>
    )
    case 'split': return (
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(115deg, transparent 49.5%, ${accent} 49.5%, ${accent} 50.5%, transparent 50.5%)`, opacity: 0.7 }} />
    )
    case 'dot': return (
      <svg viewBox="0 0 100 150" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <circle cx="50" cy="50" r="6" fill={accent} />
      </svg>
    )
    default: return null
  }
}

function Poster({ title, year, width = 168, label }: {
  title: string; year?: string | number; width?: number; label?: string
}) {
  const motifs: PosterMotif[] = ['circle', 'lines', 'band', 'corner', 'square', 'arc', 'split', 'dot']
  const palette = POSTER_PALETTES[hashStr(title) % POSTER_PALETTES.length]
  const motif   = motifs[hashStr(title + 'm') % motifs.length]
  const height  = Math.round(width * 1.5)
  return (
    <div style={{
      position: 'relative', width, height,
      background: palette.bg, color: palette.fg,
      borderRadius: 6, overflow: 'hidden', flexShrink: 0,
      boxShadow: '0 1px 2px rgba(58,46,34,0.12), inset 0 0 0 1px rgba(255,255,255,0.04)',
    }}>
      <PosterArtwork palette={palette} motif={motif} />
      <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {label && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: Math.max(8, width * 0.052),
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: palette.fg, opacity: 0.6, marginBottom: 2,
          }}>{label}</div>
        )}
        <div style={{
          fontFamily: 'var(--font-serif)', fontWeight: 500,
          fontSize: Math.max(12, width * 0.105),
          lineHeight: 1.05, letterSpacing: '-0.01em',
        }}>{title}</div>
        {year && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: Math.max(9, width * 0.058), opacity: 0.7, letterSpacing: '0.04em' }}>
            {year}
          </div>
        )}
      </div>
    </div>
  )
}

function PosterDisplay({ src, title, year, width, label }: {
  src?: string; title: string; year?: string | number; width: number; label?: string
}) {
  if (src) return (
    <img src={src} alt={title} style={{
      width, height: Math.round(width * 1.5),
      objectFit: 'cover', objectPosition: 'center top',
      borderRadius: 6, display: 'block', flexShrink: 0,
    }} />
  )
  return <Poster title={title} year={year} width={width} label={label} />
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

function SectionTitle({ eyebrow, title, trailing }: {
  eyebrow: string; title: string; trailing?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{eyebrow}</span>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 28, color: 'var(--ink)', letterSpacing: '-0.01em', margin: 0, lineHeight: 1.1 }}>{title}</h2>
      </div>
      {trailing && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {trailing}
        </span>
      )}
    </div>
  )
}

// ─── StarBadge ────────────────────────────────────────────────────────────────

function StarBadge({ note, size = 'sm' }: { note: number; size?: 'sm' | 'md' }) {
  const fs = size === 'md' ? 12 : 11
  const starSize = size === 'md' ? 9 : 8
  return (
    <div style={{
      background: 'rgba(58,46,34,0.6)', backdropFilter: 'blur(2px)',
      color: 'var(--paper-1)', padding: size === 'md' ? '4px 9px' : '3px 7px', borderRadius: 4,
      fontFamily: 'var(--font-mono)', fontSize: fs, letterSpacing: '0.04em',
      fontVariantNumeric: 'tabular-nums', fontWeight: 500,
      display: 'inline-flex', alignItems: 'center', gap: size === 'md' ? 5 : 4,
    }}>
      <svg width={starSize} height={starSize} viewBox="0 0 10 10" fill="var(--terra-soft)" aria-hidden="true">
        <polygon points="5,0.5 6.3,3.7 9.7,3.9 7.1,6.1 7.9,9.4 5,7.6 2.1,9.4 2.9,6.1 0.3,3.9 3.7,3.7" />
      </svg>
      {note.toFixed(1)}
    </div>
  )
}

// ─── En cours ─────────────────────────────────────────────────────────────────

function EnCoursSection({ items, onCritique, onEdit }: {
  items: FilmSerie[]
  onCritique: (i: FilmSerie) => void
  onEdit: (i: FilmSerie) => void
}) {
  if (!items.length) return null
  return (
    <section style={{ marginBottom: 64 }}>
      <SectionTitle eyebrow="En cours" title="Ce qu'on traverse" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {items.map(item => (
          <EnCoursCard key={item.id} item={item}
            onCritique={() => onCritique(item)}
            onEdit={() => onEdit(item)} />
        ))}
      </div>
    </section>
  )
}

function EnCoursCard({ item, onCritique, onEdit }: {
  item: FilmSerie; onCritique: () => void; onEdit: () => void
}) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: 16, background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12 }}>
      <PosterDisplay
        src={item.imageUrl}
        title={item.title}
        year={item.releaseYear}
        width={104}
        label={item.type === 'film' ? 'Film' : 'Série'}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            {item.type === 'serie' ? 'Série' : 'Film'}
          </span>
          {item.type === 'serie' ? <Tv size={14} color="var(--ink-3)" /> : <Film size={14} color="var(--ink-3)" />}
        </div>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 20, color: 'var(--ink)', letterSpacing: '-0.01em', margin: 0, lineHeight: 1.15 }}>
          {item.title}
        </h3>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)' }}>
          {item.director && <span>{item.director}</span>}
          {item.director && item.releaseYear && <span style={{ color: 'var(--ink-4)' }}> · </span>}
          {item.releaseYear && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>{item.releaseYear}</span>}
        </div>
        {item.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {item.tags.slice(0, 3).map(t => (
              <span key={t} style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--ink-3)', padding: '1px 6px', border: '1px solid var(--paper-2)', borderRadius: 999 }}>{t}</span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 'auto', display: 'flex', gap: 8, paddingTop: 4 }}>
          <button onClick={onCritique} style={{
            flex: 1, padding: '6px 10px', borderRadius: 6,
            background: 'var(--terra)', border: '1px solid var(--terra)',
            color: 'var(--paper-1)', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}><Check size={12} /> Vu</button>
          <button onClick={onEdit} style={{
            padding: '6px 10px', borderRadius: 6,
            background: 'transparent', border: '1px solid var(--border-strong)',
            color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}><Edit2 size={12} /></button>
        </div>
      </div>
    </div>
  )
}

// ─── Panthéon ─────────────────────────────────────────────────────────────────

function PantheonSection({ items, onCritique, onEdit }: {
  items: FilmSerie[]
  onCritique: (i: FilmSerie) => void
  onEdit: (i: FilmSerie) => void
}) {
  if (!items.length) return null
  return (
    <section style={{ marginBottom: 64 }}>
      <SectionTitle eyebrow="Panthéon" title="Chefs-d'œuvre" trailing={`${items.length} œuvres`} />
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {items.map(item => (
          <PantheonCard key={item.id} item={item}
            onCritique={() => onCritique(item)}
            onEdit={() => onEdit(item)} />
        ))}
      </div>
    </section>
  )
}

function PantheonCard({ item, onCritique, onEdit }: {
  item: FilmSerie; onCritique: () => void; onEdit: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 200, cursor: 'pointer', transition: 'transform var(--dur) var(--ease)', transform: hover ? 'translateY(-2px)' : 'none' }}>
      <div style={{ position: 'relative' }} onClick={onCritique}>
        <PosterDisplay src={item.imageUrl} title={item.title} year={item.releaseYear} width={200} />
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: 'rgba(58,46,34,0.6)', backdropFilter: 'blur(2px)',
          color: 'var(--paper-1)', padding: '3px 7px', borderRadius: 4,
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
          textTransform: 'uppercase', fontWeight: 500,
        }}>{item.type === 'film' ? 'Film' : 'Série'}</div>
        {item.rating !== undefined && (
          <div style={{ position: 'absolute', top: 10, right: 10 }}>
            <StarBadge note={item.rating} size="md" />
          </div>
        )}
        <button onClick={(e) => { e.stopPropagation(); onEdit() }} style={{
          position: 'absolute', bottom: 8, right: 8, opacity: hover ? 1 : 0,
          transition: 'opacity var(--dur) var(--ease)',
          background: 'rgba(58,46,34,0.6)', border: 'none', color: 'var(--paper-1)',
          borderRadius: 4, padding: '3px 6px', cursor: 'pointer', display: 'flex',
        }}><Edit2 size={11} /></button>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 18, color: 'var(--ink)', letterSpacing: '-0.005em', lineHeight: 1.2 }}>{item.title}</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>
          {item.director && <span>{item.director}</span>}
          {item.director && item.releaseYear && <span style={{ color: 'var(--ink-4)' }}> · </span>}
          {item.releaseYear && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>{item.releaseYear}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Bibliothèque ─────────────────────────────────────────────────────────────

type LibFilter = 'tout' | 'film' | 'serie'
type LibSort   = 'recent' | 'note' | 'titre'

function BibliothequeSection({ items, onCritique, onEdit }: {
  items: FilmSerie[]
  onCritique: (i: FilmSerie) => void
  onEdit: (i: FilmSerie) => void
}) {
  const [filter, setFilter] = useState<LibFilter>('tout')
  const [sort,   setSort]   = useState<LibSort>('recent')

  const filtered = items
    .filter(i => filter === 'tout' || i.type === filter)
    .sort((a, b) => {
      if (sort === 'note')  return (b.rating ?? 0) - (a.rating ?? 0)
      if (sort === 'titre') return a.title.localeCompare(b.title, 'fr')
      return new Date(b.watchDate ?? b.createdAt).getTime() - new Date(a.watchDate ?? a.createdAt).getTime()
    })

  const filterOpts: Array<[LibFilter, string]> = [['tout', 'Tout'], ['film', 'Films'], ['serie', 'Séries']]
  const sortOpts:   Array<[LibSort,   string]> = [['recent', 'Récents'], ['note', 'Note'], ['titre', 'A → Z']]

  return (
    <section style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Bibliothèque" title="Tout ce qu'on a vu" trailing={`${filtered.length} œuvres`} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {filterOpts.map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 400,
              padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
              background: filter === k ? 'var(--paper-3)' : 'var(--paper-1)',
              border: `1px solid ${filter === k ? 'var(--ink-4)' : 'var(--paper-2)'}`,
              color: 'var(--ink)',
            }}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Trier</span>
          {sortOpts.map(([k, l], i, arr) => (
            <Fragment key={k}>
              <button onClick={() => setSort(k)} style={{
                border: 0, background: 'transparent', padding: '2px 0', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: 13,
                color: sort === k ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: sort === k ? 500 : 400,
                borderBottom: sort === k ? '1px solid var(--terra)' : '1px solid transparent',
              }}>{l}</button>
              {i < arr.length - 1 && <span style={{ color: 'var(--ink-4)' }}>·</span>}
            </Fragment>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16 }}>
          Aucune œuvre dans cette catégorie
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 24 }}>
          {filtered.map(item => (
            <BiblioCard key={item.id} item={item}
              onCritique={() => onCritique(item)}
              onEdit={() => onEdit(item)} />
          ))}
        </div>
      )}
    </section>
  )
}

function BiblioCard({ item, onCritique, onEdit }: {
  item: FilmSerie; onCritique: () => void; onEdit: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer', transition: 'transform var(--dur) var(--ease)', transform: hover ? 'translateY(-2px)' : 'none' }}>
      <div style={{ position: 'relative' }} onClick={onCritique}>
        <PosterDisplay src={item.imageUrl} title={item.title} year={item.releaseYear} width={168} />
        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: 'rgba(58,46,34,0.6)', backdropFilter: 'blur(2px)',
          color: 'var(--paper-1)', padding: '3px 7px', borderRadius: 4,
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
          textTransform: 'uppercase', fontWeight: 500,
        }}>{item.type === 'film' ? 'Film' : 'Série'}</div>
        {item.rating !== undefined && (
          <div style={{ position: 'absolute', top: 8, right: 8 }}>
            <StarBadge note={item.rating} />
          </div>
        )}
        <button onClick={(e) => { e.stopPropagation(); onEdit() }} style={{
          position: 'absolute', bottom: 8, right: 8, opacity: hover ? 1 : 0,
          transition: 'opacity var(--dur) var(--ease)',
          background: 'rgba(58,46,34,0.6)', border: 'none', color: 'var(--paper-1)',
          borderRadius: 4, padding: '3px 6px', cursor: 'pointer', display: 'flex',
        }}><Edit2 size={11} /></button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 16, color: 'var(--ink)', letterSpacing: '-0.005em', lineHeight: 1.2 }}>{item.title}</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-2)' }}>
          {item.director && <span>{item.director}</span>}
          {item.director && item.releaseYear && <span style={{ color: 'var(--ink-4)' }}> · </span>}
          {item.releaseYear && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>{item.releaseYear}</span>}
        </div>
        {item.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
            {item.tags.slice(0, 3).map(g => (
              <span key={g} style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--ink-3)', padding: '1px 6px', border: '1px solid var(--paper-2)', borderRadius: 999 }}>{g}</span>
            ))}
          </div>
        )}
        {item.watchDate && (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>Vu le {fmtDate(item.watchDate)}</div>
        )}
      </div>
    </div>
  )
}

// ─── File d'attente ────────────────────────────────────────────────────────────

function FileAttenteSection({ items, onMarkInProgress, onCritique, onEdit, onRemove }: {
  items: FilmSerie[]
  onMarkInProgress: (id: string) => void
  onCritique: (i: FilmSerie) => void
  onEdit: (i: FilmSerie) => void
  onRemove: (id: string) => void
}) {
  return (
    <section style={{ marginTop: 16, marginBottom: 16 }}>
      <SectionTitle eyebrow="File d'attente" title="À découvrir" trailing={`${items.length} titres`} />
      {items.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16 }}>
          La file d'attente est vide
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {items.map(item => (
            <FileAttenteCard key={item.id} item={item}
              onMarkInProgress={() => onMarkInProgress(item.id)}
              onCritique={() => onCritique(item)}
              onEdit={() => onEdit(item)}
              onRemove={() => onRemove(item.id)} />
          ))}
        </div>
      )}
    </section>
  )
}

function FileAttenteCard({ item, onMarkInProgress, onCritique, onEdit, onRemove }: {
  item: FilmSerie
  onMarkInProgress: () => void
  onCritique: () => void
  onEdit: () => void
  onRemove: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'stretch', gap: 12,
        padding: 10, borderRadius: 8,
        background: hover ? 'var(--paper-1)' : 'transparent',
        border: `1px solid ${hover ? 'var(--paper-2)' : 'transparent'}`,
        transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)',
      }}>
      <PosterDisplay src={item.imageUrl} title={item.title} year={item.releaseYear} width={48} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 15, color: 'var(--ink)', letterSpacing: '-0.005em', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.title}
        </div>
        {item.director && (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.director}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
          {item.releaseYear && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>{item.releaseYear}</span>}
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500 }}>
            {item.type === 'film' ? 'Film' : 'Série'}
          </span>
        </div>
      </div>
      {hover && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
          <button onClick={onMarkInProgress} title="Commencer" style={{ background: 'var(--terra)', border: 'none', color: 'var(--paper-1)', borderRadius: 4, padding: '4px 6px', cursor: 'pointer', display: 'flex' }}><Play size={11} /></button>
          <button onClick={onCritique} title="Marquer comme vu" style={{ background: 'var(--sage)', border: 'none', color: 'var(--paper-1)', borderRadius: 4, padding: '4px 6px', cursor: 'pointer', display: 'flex' }}><Check size={11} /></button>
          <button onClick={onEdit} title="Modifier" style={{ background: 'var(--paper-2)', border: 'none', color: 'var(--ink-2)', borderRadius: 4, padding: '4px 6px', cursor: 'pointer', display: 'flex' }}><Edit2 size={11} /></button>
          <button onClick={onRemove} title="Supprimer" style={{ background: 'var(--paper-2)', border: 'none', color: 'var(--ink-3)', borderRadius: 4, padding: '4px 6px', cursor: 'pointer', display: 'flex' }}><Trash2 size={11} /></button>
        </div>
      )}
    </div>
  )
}

// ─── Modal styles ─────────────────────────────────────────────────────────────

const modalInput: React.CSSProperties = {
  background: 'var(--paper)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)',
  padding: '8px 12px',
  fontSize: 14,
  fontFamily: 'var(--font-sans)',
  color: 'var(--fg)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const modalLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: 'var(--ink-3)',
}

// ─── PosterUpload ─────────────────────────────────────────────────────────────

function PosterUpload({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_H = 450
        let { width, height } = img
        if (height > MAX_H) { width = Math.round(width * MAX_H / height); height = MAX_H }
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height)
        onChange(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={modalLabel}>Affiche</span>
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        style={{
          minHeight: value ? 0 : 90, borderRadius: 'var(--r-md)',
          border: `2px dashed ${dragOver ? 'var(--terra)' : 'var(--border)'}`,
          background: dragOver ? 'var(--terra-soft)' : 'var(--paper)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 6, cursor: 'pointer',
          transition: 'border-color var(--dur) var(--ease)',
        }}>
        {value ? (
          <div style={{ position: 'relative', width: '100%' }}>
            <img src={value} alt="affiche" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 'var(--r-md)' }} />
            <button type="button"
              onClick={(e) => { e.stopPropagation(); onChange('') }}
              style={{ position: 'absolute', top: 4, right: 4, background: 'var(--paper-2)', border: '1px solid var(--border)', color: 'var(--ink-2)', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14 }}>
              ×
            </button>
          </div>
        ) : (
          <>
            <Film size={22} color="var(--ink-4)" />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)' }}>Glisse une image ou clique</span>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}

// ─── ModalAddItem ─────────────────────────────────────────────────────────────

function ModalAddItem({ onClose }: { onClose: () => void }) {
  const addItem = useFilmSerieStore((s) => s.addItem)

  const [title,       setTitle]       = useState('')
  const [type,        setType]        = useState<FilmSerieType>('film')
  const [director,    setDirector]    = useState('')
  const [releaseYear, setReleaseYear] = useState('')
  const [imageUrl,    setImageUrl]    = useState('')
  const [tags,        setTags]        = useState<string[]>([])
  const [tagInput,    setTagInput]    = useState('')
  const [status,      setStatus]      = useState<FilmSerieStatus>('à voir')

  function addTag(val: string) {
    const t = val.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags((p) => [...p, t])
    setTagInput('')
  }
  function removeTag(t: string) { setTags((p) => p.filter((x) => x !== t)) }

  function handleSubmit() {
    if (!title.trim()) return
    addItem({ title: title.trim(), type, director: director.trim() || undefined, releaseYear: releaseYear ? parseInt(releaseYear) : undefined, imageUrl: imageUrl.trim() || undefined, tags, favoriteScenes: [], status })
    onClose()
  }

  const typeOpts: Array<[FilmSerieType, string]> = [['film', 'Film'], ['serie', 'Série']]
  const statusOpts: FilmSerieStatus[] = ['à voir', 'en cours', 'vu']

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(58,46,34,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--paper-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-3)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 22, color: 'var(--ink)', margin: 0 }}>Ajouter un titre</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={modalLabel}>Titre *</span>
          <input style={modalInput} placeholder="Ex : Dune Part II" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={modalLabel}>Type</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {typeOpts.map(([t, l]) => (
              <button key={t} onClick={() => setType(t)} style={{
                padding: '6px 16px', borderRadius: 'var(--r-full)', border: `1px solid ${type === t ? 'var(--terra)' : 'var(--border)'}`,
                background: type === t ? 'var(--terra-soft)' : 'transparent',
                color: type === t ? 'var(--terra-deep)' : 'var(--ink-2)',
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={modalLabel}>Réalisateur / Créateur</span>
          <input style={modalInput} placeholder="Ex : Denis Villeneuve" value={director} onChange={(e) => setDirector(e.target.value)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={modalLabel}>Année de sortie</span>
          <input type="number" style={modalInput} placeholder="2024" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} />
        </div>

        <PosterUpload value={imageUrl} onChange={setImageUrl} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={modalLabel}>Tags</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map(tag => (
              <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'var(--terra-soft)', border: '1px solid #DEB89C', color: 'var(--terra-deep)', fontFamily: 'var(--font-sans)', fontSize: 12 }}>
                {tag}
                <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: 'var(--terra)', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...modalInput, flex: 1 }} value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) } }}
              placeholder="Ajouter un tag..." />
            <button type="button" onClick={() => addTag(tagInput)} style={{ padding: '8px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--paper-2)', color: 'var(--ink-2)', cursor: 'pointer' }}>+</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTED_TAGS.filter(t => !tags.includes(t)).map(tag => (
              <button key={tag} type="button" onClick={() => addTag(tag)} style={{ padding: '2px 8px', borderRadius: 'var(--r-full)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', fontSize: 11, cursor: 'pointer' }}>{tag}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={modalLabel}>Statut initial</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {statusOpts.map(s => (
              <button key={s} onClick={() => setStatus(s)} style={{
                padding: '6px 14px', borderRadius: 'var(--r-full)',
                border: `1px solid ${status === s ? 'var(--terra)' : 'var(--border)'}`,
                background: status === s ? 'var(--terra-soft)' : 'transparent',
                color: status === s ? 'var(--terra-deep)' : 'var(--ink-2)',
                fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer',
              }}>{s}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink-2)', fontFamily: 'var(--font-sans)', fontSize: 14, cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleSubmit} disabled={!title.trim()} style={{ flex: 1, padding: '10px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--terra)', color: 'var(--paper-1)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: title.trim() ? 1 : 0.4 }}>Ajouter</button>
        </div>
      </div>
    </div>
  )
}

// ─── ModalCritique ────────────────────────────────────────────────────────────

function ModalCritique({ item, onClose }: { item: FilmSerie; onClose: () => void }) {
  const markAsWatched = useFilmSerieStore((s) => s.markAsWatched)

  const [rating,    setRating]    = useState<number>(item.rating ?? 7)
  const [review,    setReview]    = useState(item.review ?? '')
  const [watchDate, setWatchDate] = useState(item.watchDate ?? new Date().toISOString().split('T')[0])
  const [scenes,    setScenes]    = useState<string[]>(item.favoriteScenes.length > 0 ? item.favoriteScenes : [''])

  function addScene() { setScenes(p => [...p, '']) }
  function updateScene(idx: number, val: string) { setScenes(p => p.map((s, i) => i === idx ? val : s)) }
  function removeScene(idx: number) { setScenes(p => p.filter((_, i) => i !== idx)) }

  function handleSubmit() {
    markAsWatched(item.id, rating, review, watchDate, scenes.map(s => s.trim()).filter(Boolean))
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(58,46,34,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--paper-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-3)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 22, color: 'var(--ink)', margin: 0 }}>
            Critique — <span style={{ color: 'var(--terra)' }}>{item.title}</span>
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={modalLabel}>Note</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 500, color: rating >= 9 ? 'var(--terra)' : rating >= 7 ? 'var(--sage-deep)' : 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
              {rating % 1 === 0 ? rating : rating.toFixed(1)}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-3)' }}>/10</span>
            </span>
          </div>
          <input type="range" min={1} max={10} step={0.5} value={rating} onChange={(e) => setRating(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--terra)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => <span key={n}>{n}</span>)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={modalLabel}>Critique</span>
          <textarea rows={4} style={{ ...modalInput, resize: 'none' }} placeholder="Ce que tu en as pensé..." value={review} onChange={(e) => setReview(e.target.value)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={modalLabel}>Date de visionnage</span>
          <input type="date" style={modalInput} value={watchDate} onChange={(e) => setWatchDate(e.target.value)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={modalLabel}>Scènes mémorables</span>
          {scenes.map((scene, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input style={{ ...modalInput, flex: 1 }} placeholder={`Scène ${idx + 1}...`} value={scene} onChange={(e) => updateScene(idx, e.target.value)} />
              <button onClick={() => removeScene(idx)} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
          ))}
          <button onClick={addScene} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--terra)', fontFamily: 'var(--font-sans)', fontSize: 12, cursor: 'pointer', padding: 0 }}>+ Ajouter une scène</button>
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink-2)', fontFamily: 'var(--font-sans)', fontSize: 14, cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleSubmit} style={{ flex: 1, padding: '10px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--terra)', color: 'var(--paper-1)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Valider</button>
        </div>
      </div>
    </div>
  )
}

// ─── ModalEditItem ────────────────────────────────────────────────────────────

function ModalEditItem({ item, onClose }: { item: FilmSerie; onClose: () => void }) {
  const updateItem = useFilmSerieStore((s) => s.updateItem)

  const [title,       setTitle]       = useState(item.title)
  const [type,        setType]        = useState<FilmSerieType>(item.type)
  const [director,    setDirector]    = useState(item.director ?? '')
  const [releaseYear, setReleaseYear] = useState(item.releaseYear?.toString() ?? '')
  const [imageUrl,    setImageUrl]    = useState(item.imageUrl ?? '')
  const [tags,        setTags]        = useState<string[]>(item.tags)
  const [tagInput,    setTagInput]    = useState('')
  const [review,      setReview]      = useState(item.review ?? '')
  const [rating,      setRating]      = useState<number>(item.rating ?? 7)
  const [scenes,      setScenes]      = useState<string[]>(item.favoriteScenes.length > 0 ? item.favoriteScenes : [''])

  function addTag(val: string) {
    const t = val.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(p => [...p, t])
    setTagInput('')
  }
  function removeTag(t: string) { setTags(p => p.filter(x => x !== t)) }
  function addScene() { setScenes(p => [...p, '']) }
  function updateScene(idx: number, val: string) { setScenes(p => p.map((s, i) => i === idx ? val : s)) }
  function removeScene(idx: number) { setScenes(p => p.filter((_, i) => i !== idx)) }

  function handleSubmit() {
    if (!title.trim()) return
    updateItem(item.id, {
      title: title.trim(), type,
      director: director.trim() || undefined,
      releaseYear: releaseYear ? parseInt(releaseYear) : undefined,
      imageUrl: imageUrl.trim() || undefined,
      tags, review: review.trim() || undefined,
      rating: item.status === 'vu' ? rating : item.rating,
      favoriteScenes: scenes.map(s => s.trim()).filter(Boolean),
    })
    onClose()
  }

  const typeOpts: Array<[FilmSerieType, string]> = [['film', 'Film'], ['serie', 'Série']]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(58,46,34,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--paper-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-3)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 22, color: 'var(--ink)', margin: 0 }}>Modifier</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={modalLabel}>Titre *</span>
          <input style={modalInput} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={modalLabel}>Type</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {typeOpts.map(([t, l]) => (
              <button key={t} onClick={() => setType(t)} style={{
                padding: '6px 16px', borderRadius: 'var(--r-full)',
                border: `1px solid ${type === t ? 'var(--terra)' : 'var(--border)'}`,
                background: type === t ? 'var(--terra-soft)' : 'transparent',
                color: type === t ? 'var(--terra-deep)' : 'var(--ink-2)',
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={modalLabel}>Réalisateur / Créateur</span>
          <input style={modalInput} value={director} onChange={(e) => setDirector(e.target.value)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={modalLabel}>Année de sortie</span>
          <input type="number" style={modalInput} value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} />
        </div>

        <PosterUpload value={imageUrl} onChange={setImageUrl} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={modalLabel}>Tags</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map(tag => (
              <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'var(--terra-soft)', border: '1px solid #DEB89C', color: 'var(--terra-deep)', fontFamily: 'var(--font-sans)', fontSize: 12 }}>
                {tag}
                <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: 'var(--terra)', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...modalInput, flex: 1 }} value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) } }}
              placeholder="Ajouter un tag..." />
            <button type="button" onClick={() => addTag(tagInput)} style={{ padding: '8px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--paper-2)', color: 'var(--ink-2)', cursor: 'pointer' }}>+</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTED_TAGS.filter(t => !tags.includes(t)).map(tag => (
              <button key={tag} type="button" onClick={() => addTag(tag)} style={{ padding: '2px 8px', borderRadius: 'var(--r-full)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', fontSize: 11, cursor: 'pointer' }}>{tag}</button>
            ))}
          </div>
        </div>

        {item.status === 'vu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={modalLabel}>Note</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500, color: 'var(--terra)', fontVariantNumeric: 'tabular-nums' }}>
                {rating % 1 === 0 ? rating : rating.toFixed(1)}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-3)' }}>/10</span>
              </span>
            </div>
            <input type="range" min={1} max={10} step={0.5} value={rating} onChange={(e) => setRating(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--terra)' }} />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={modalLabel}>Critique</span>
          <textarea rows={3} style={{ ...modalInput, resize: 'none' }} placeholder="Ce que tu en as pensé..." value={review} onChange={(e) => setReview(e.target.value)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={modalLabel}>Scènes mémorables</span>
          {scenes.map((scene, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input style={{ ...modalInput, flex: 1 }} placeholder={`Scène ${idx + 1}...`} value={scene} onChange={(e) => updateScene(idx, e.target.value)} />
              <button onClick={() => removeScene(idx)} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
          ))}
          <button onClick={addScene} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--terra)', fontFamily: 'var(--font-sans)', fontSize: 12, cursor: 'pointer', padding: 0 }}>+ Ajouter une scène</button>
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink-2)', fontFamily: 'var(--font-sans)', fontSize: 14, cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleSubmit} disabled={!title.trim()} style={{ flex: 1, padding: '10px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--terra)', color: 'var(--paper-1)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: title.trim() ? 1 : 0.4 }}>Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function FilmsSeriesPage() {
  const items          = useFilmSerieStore((s) => s.items)
  const removeItem     = useFilmSerieStore((s) => s.removeItem)
  const markInProgress = useFilmSerieStore((s) => s.markInProgress)

  const [showAdd,        setShowAdd]        = useState(false)
  const [critiqueTarget, setCritiqueTarget] = useState<FilmSerie | null>(null)
  const [editTarget,     setEditTarget]     = useState<FilmSerie | null>(null)

  const inProgress = items.filter(i => i.status === 'en cours')
  const watched    = items.filter(i => i.status === 'vu')
  const watchlist  = items.filter(i => i.status === 'à voir')
  const pantheon   = watched.filter(i => (i.rating ?? 0) >= 9).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))

  const year      = new Date().getFullYear().toString()
  const filmsYear = watched.filter(i => i.type === 'film' && i.watchDate?.startsWith(year)).length
  const seriesYear = watched.filter(i => i.type === 'serie' && i.watchDate?.startsWith(year)).length
  const avgRating = watched.length > 0
    ? (watched.reduce((acc, i) => acc + (i.rating ?? 0), 0) / watched.length)
    : null

  const statItems = [
    { label: 'Films vus',    value: filmsYear,                       unit: `en ${year}` },
    { label: 'Séries vues',  value: seriesYear,                      unit: `en ${year}` },
    { label: 'Note moyenne', value: avgRating ? avgRating.toFixed(1) : '—', unit: 'sur 10' },
  ]

  return (
    <div style={{ minHeight: '100%', background: 'var(--paper)', padding: '40px 48px 80px', maxWidth: 1280, margin: '0 auto', boxSizing: 'border-box' }}>

      {/* ── En-tête ─────────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 40 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Films & Séries</span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 56, lineHeight: 1.05, letterSpacing: '-0.015em', color: 'var(--ink)', margin: '8px 0 10px' }}>
          Cinéma & Séries<span style={{ color: 'var(--terra)' }}>.</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 21, lineHeight: 1.35, color: 'var(--ink-2)', maxWidth: '52ch', marginBottom: 24 }}>
          L'image, le temps, le récit — ce qu'on a vu, ce qu'on traverse, ce qu'on attend.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowAdd(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--terra)', color: 'var(--paper-1)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            <Plus size={14} /> Vu
          </button>
          <button onClick={() => setShowAdd(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 'var(--r-md)', border: '1px solid var(--ink-4)', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--font-sans)', fontSize: 14, cursor: 'pointer' }}>
            <Bookmark size={14} /> File d'attente
          </button>
        </div>
      </div>

      {/* ── Stats KPI ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, marginBottom: 56, borderTop: '1px solid var(--paper-2)', borderBottom: '1px solid var(--paper-2)' }}>
        {statItems.map((s, i) => (
          <div key={s.label} style={{ padding: '20px 24px', borderRight: i < 2 ? '1px solid var(--paper-2)' : 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{s.label}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 38, color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Sections ────────────────────────────────────────────────────────────── */}
      <EnCoursSection items={inProgress} onCritique={setCritiqueTarget} onEdit={setEditTarget} />
      <PantheonSection items={pantheon} onCritique={setCritiqueTarget} onEdit={setEditTarget} />
      <BibliothequeSection items={watched} onCritique={setCritiqueTarget} onEdit={setEditTarget} />
      <FileAttenteSection
        items={watchlist}
        onMarkInProgress={markInProgress}
        onCritique={setCritiqueTarget}
        onEdit={setEditTarget}
        onRemove={removeItem}
      />

      {/* ── Modals ──────────────────────────────────────────────────────────────── */}
      {showAdd        && <ModalAddItem onClose={() => setShowAdd(false)} />}
      {critiqueTarget && <ModalCritique item={critiqueTarget} onClose={() => setCritiqueTarget(null)} />}
      {editTarget     && <ModalEditItem item={editTarget} onClose={() => setEditTarget(null)} />}
    </div>
  )
}
