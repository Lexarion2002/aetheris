import { useState, useRef, useEffect } from 'react'
import { useMusicStore } from '../store/musicStore'
import type { AlbumCritique, AlbumAttente, AlbumTag } from '../store/musicStore'

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_TAGS: AlbumTag[] = [
  'ambient', 'jazz', 'rap', 'rock', 'electro', 'classical', 'soul',
  'rnb', 'folk', 'metal', 'pop', 'world', 'experimental', 'indie',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return Math.random().toString(36).substring(2, 15)
}

function noteColor(note: number): string {
  if (note >= 9) return '#B5532A'
  if (note >= 7) return '#5C7859'
  if (note >= 5) return '#6B5B48'
  return '#A08B72'
}

function fmtDate(iso: string | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const primaryBtnStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14,
  padding: '8px 16px', borderRadius: 8, border: '1px solid transparent',
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
  background: 'var(--terra)', color: 'var(--paper-1)',
}
const ghostBtnStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 14,
  padding: '8px 16px', borderRadius: 8, border: '1px solid var(--ink-4)',
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
  background: 'transparent', color: 'var(--ink)',
}
const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)', fontSize: 14, padding: '8px 12px',
  borderRadius: 8, border: '1px solid var(--paper-2)', background: 'var(--paper-1)',
  color: 'var(--ink)', outline: 'none',
}

// ─── AlbumCover ───────────────────────────────────────────────────────────────

const COVER_PALETTES = [
  { bg: '#B5532A', fg: '#F4ECDC', motif: '#8E3D1C' },
  { bg: '#7E9A7A', fg: '#FBF6EA', motif: '#5C7859' },
  { bg: '#3A2E22', fg: '#EAD1BE', motif: '#6B5B48' },
  { bg: '#EAD1BE', fg: '#3A2E22', motif: '#B5532A' },
  { bg: '#D5DFD0', fg: '#3A2E22', motif: '#5C7859' },
  { bg: '#EADFC8', fg: '#3A2E22', motif: '#A08B72' },
  { bg: '#6B5B48', fg: '#F4ECDC', motif: '#EAD1BE' },
  { bg: '#FBF6EA', fg: '#3A2E22', motif: '#B5532A' },
]

function AlbumCover({ titre, artiste, pochette, size, style }: {
  titre: string; artiste: string; pochette?: string
  size?: number   // omit or 0 → full-width fluid square
  style?: React.CSSProperties
}) {
  const isFluid = !size
  const dim: React.CSSProperties = isFluid
    ? { width: '100%', aspectRatio: '1/1', height: 'auto' }
    : { width: size, height: size, flexShrink: 0 }

  if (pochette) {
    return <img src={pochette} alt={titre} style={{ ...dim, borderRadius: 6, objectFit: 'cover', display: 'block', ...style }} />
  }

  const seed = (titre + artiste).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const p = COVER_PALETTES[seed % COVER_PALETTES.length]
  const motif = seed % 4
  const initial = titre.trim().charAt(0).toUpperCase()

  return (
    <div style={{ ...dim, borderRadius: 6, overflow: 'hidden', background: p.bg, position: 'relative', boxShadow: 'inset 0 0 0 1px rgba(58,46,34,0.08)', ...style }}>
      <svg viewBox="0 0 180 180" width="100%" height="100%" style={{ display: 'block' }}>
        {motif === 0 && (<>
          <circle cx="90" cy="90" r="62" fill="none" stroke={p.motif} strokeWidth="1.2" opacity="0.55" />
          <circle cx="90" cy="90" r="44" fill="none" stroke={p.motif} strokeWidth="1.2" opacity="0.4" />
          <circle cx="90" cy="90" r="22" fill="none" stroke={p.motif} strokeWidth="1.2" opacity="0.3" />
          <circle cx="90" cy="90" r="4" fill={p.fg} />
        </>)}
        {motif === 1 && (<>
          <rect x="18" y="32" width="144" height="1" fill={p.motif} opacity="0.6" />
          <rect x="18" y="148" width="144" height="1" fill={p.motif} opacity="0.6" />
          <rect x="30" y="56" width="120" height="68" fill={p.motif} opacity="0.18" />
        </>)}
        {motif === 2 && (<>
          <path d="M 20 140 Q 60 60, 90 90 T 160 40" fill="none" stroke={p.motif} strokeWidth="1.4" opacity="0.65" />
          <path d="M 20 150 Q 60 80, 90 110 T 160 55" fill="none" stroke={p.motif} strokeWidth="1.4" opacity="0.45" />
        </>)}
        {motif === 3 && (<>
          <rect x="24" y="24" width="52" height="132" fill={p.motif} opacity="0.22" />
          <rect x="84" y="24" width="28" height="66" fill={p.motif} opacity="0.35" />
          <rect x="120" y="90" width="36" height="66" fill={p.motif} opacity="0.22" />
        </>)}
        <text x="18" y="168" fill={p.fg}
          style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontStyle: 'italic', fontWeight: 500 }}>
          {initial}
        </text>
        <text x="162" y="28" textAnchor="end" fill={p.fg}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.15em', opacity: 0.7 }}>
          {String((seed % 99) + 1).padStart(2, '0')}
        </text>
      </svg>
    </div>
  )
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({ kicker, title, right }: {
  kicker: string; title: string; right?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
      <div>
        <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>
          {kicker}
        </span>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.15, margin: 0 }}>
          {title}
        </h3>
      </div>
      {right && <div style={{ paddingBottom: 4 }}>{right}</div>}
    </div>
  )
}

// ─── SearchField ──────────────────────────────────────────────────────────────

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focus, setFocus] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--paper-1)', border: `1px solid ${focus ? 'var(--ink)' : 'var(--paper-2)'}`, borderRadius: 8, padding: '7px 12px', flex: '0 1 320px', minWidth: 200, transition: 'border-color var(--dur) var(--ease)' }}>
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="var(--ink-3)" strokeWidth={2} style={{ flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        placeholder="Chercher un album, un artiste…"
        style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)', padding: 0 }} />
      {value && (
        <button onClick={() => onChange('')} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)', padding: 0 }}>✕</button>
      )}
    </div>
  )
}

// ─── SortMode + SortMenu ──────────────────────────────────────────────────────

type SortMode = 'sortie_desc' | 'critique_desc' | 'note_desc' | 'note_asc' | 'artiste'

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'sortie_desc',   label: 'Récents'       },
  { value: 'critique_desc', label: 'Date critique'  },
  { value: 'note_desc',     label: 'Note ↓'         },
  { value: 'note_asc',      label: 'Note ↑'         },
  { value: 'artiste',       label: 'Artiste A–Z'    },
]

function SortMenu({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const label = SORT_OPTIONS.find(o => o.value === value)?.label ?? 'Récents'
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--paper-2)', background: 'var(--paper-1)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)' }}>
        <span style={{ color: 'var(--ink-3)' }}>Trier ·</span>
        <span>{label}</span>
        <span style={{ color: 'var(--ink-3)', fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, minWidth: 160, background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 10, boxShadow: '0 6px 20px -8px rgba(58,46,34,0.18)', padding: 4, zIndex: 10 }}>
          {SORT_OPTIONS.map(o => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 10px', borderRadius: 6, border: 0, background: value === o.value ? 'var(--paper-2)' : 'transparent', color: 'var(--ink)', fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ opacity: value === o.value ? 1 : 0, color: 'var(--terra)', fontSize: 12 }}>✓</span>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ChipFilter ───────────────────────────────────────────────────────────────

function ChipFilter({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: active ? 500 : 400, padding: '4px 10px', borderRadius: 999, background: active ? 'var(--paper-3)' : (hover ? 'var(--paper-2)' : 'var(--paper-1)'), border: `1px solid ${active ? 'var(--ink-4)' : 'var(--paper-2)'}`, color: 'var(--ink)', cursor: 'pointer', transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)' }}>
      {children}
    </button>
  )
}

// ─── NowPlaying ───────────────────────────────────────────────────────────────

function NowPlaying({ onCritique }: { onCritique: () => void }) {
  const albumEnCours          = useMusicStore(s => s.albumEnCours)
  const clearAlbumEnCours     = useMusicStore(s => s.clearAlbumEnCours)
  const setPremiereImpression = useMusicStore(s => s.setPremiereImpression)
  const setAlbumEnCours       = useMusicStore(s => s.setAlbumEnCours)
  const [showForm, setShowForm] = useState(false)
  const [titre,    setTitre]    = useState('')
  const [artiste,  setArtiste]  = useState('')
  const [pochette, setPochette] = useState('')

  if (!albumEnCours) {
    return (
      <section>
        <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 14 }}>
          En écoute
        </span>
        {showForm ? (
          <div style={{ background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Album *" style={inputStyle} />
              <input value={artiste} onChange={e => setArtiste(e.target.value)} placeholder="Artiste *" style={inputStyle} />
            </div>
            <input value={pochette} onChange={e => setPochette(e.target.value)} placeholder="URL pochette (optionnel)"
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { if (!titre.trim() || !artiste.trim()) return; setAlbumEnCours({ titre: titre.trim(), artiste: artiste.trim(), pochette: pochette.trim(), premiereImpression: '' }); setShowForm(false) }}
                disabled={!titre.trim() || !artiste.trim()}
                style={{ flex: 1, ...primaryBtnStyle }}>
                Démarrer l'écoute
              </button>
              <button onClick={() => setShowForm(false)} style={ghostBtnStyle}>Annuler</button>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 16, padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--ink-3)', margin: 0, maxWidth: '52ch', lineHeight: 1.4 }}>
              Lance une écoute pour prendre des notes en temps réel.
            </p>
            <button onClick={() => setShowForm(true)} style={{ ...primaryBtnStyle, whiteSpace: 'nowrap', flexShrink: 0 }}>
              + Démarrer
            </button>
          </div>
        )}
      </section>
    )
  }

  return (
    <section>
      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 14 }}>
        En écoute
      </span>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 32, alignItems: 'start', background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 16, padding: 24 }}>
        <AlbumCover titre={albumEnCours.titre} artiste={albumEnCours.artiste} pochette={albumEnCours.pochette} size={220} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--terra)', display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--terra)' }}>En lecture</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 34, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.1, margin: '0 0 6px' }}>
            {albumEnCours.titre}
          </h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--ink-2)' }}>{albumEnCours.artiste}</span>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>
              depuis {new Date(albumEnCours.startedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <textarea
            value={albumEnCours.premiereImpression}
            onChange={e => setPremiereImpression(e.target.value)}
            placeholder="Première impression, ce que j'entends…"
            rows={3}
            style={{ width: '100%', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)', background: 'var(--paper)', border: '1px solid var(--paper-2)', borderRadius: 8, padding: '10px 12px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: 16, lineHeight: 1.5 }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onCritique} style={{ flex: 1, ...primaryBtnStyle, justifyContent: 'center' }}>Rédiger la critique</button>
            <button onClick={clearAlbumEnCours} style={ghostBtnStyle}>Stopper</button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── AlbumCard ────────────────────────────────────────────────────────────────

function AlbumCard({ album, onEdit, onDelete }: {
  album: AlbumCritique
  onEdit: (a: AlbumCritique) => void
  onDelete: (id: string) => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => onEdit(album)} style={{ cursor: 'pointer' }}>
      <div style={{ position: 'relative', transform: hover ? 'translateY(-2px)' : 'translateY(0)', transition: 'transform var(--dur) var(--ease)' }}>
        <AlbumCover titre={album.titre} artiste={album.artiste} pochette={album.pochette} />
        <div style={{ position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 999, background: 'var(--ink)', color: 'var(--paper-1)', display: 'grid', placeItems: 'center', border: '2px solid var(--paper-1)', boxShadow: '0 1px 2px rgba(58,46,34,0.25)' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 500 }}>{album.note}</span>
        </div>
        {hover && (
          <button onClick={e => { e.stopPropagation(); onDelete(album.id!) }}
            style={{ position: 'absolute', top: 10, left: 10, width: 28, height: 28, borderRadius: 6, border: 0, background: 'rgba(155,58,28,0.85)', color: 'white', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 11 }}>
            ✕
          </button>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.25, letterSpacing: '-0.005em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {album.titre}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginTop: 3 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {album.artiste}
          </span>
          {album.dateOriginaleSortie && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)', flexShrink: 0 }}>
              {new Date(album.dateOriginaleSortie).getFullYear()}
            </span>
          )}
        </div>
        {album.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {album.tags.slice(0, 2).map(t => (
              <span key={t} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: 'var(--paper-2)', color: 'var(--ink-3)' }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── BibliothequeSection ──────────────────────────────────────────────────────

const CAROUSEL_ITEM_W = 200
const CAROUSEL_GAP    = 20
const CAROUSEL_PAGE   = 6

function BibliothequeSection({ onEdit, onNew }: { onEdit: (a: AlbumCritique) => void; onNew: () => void }) {
  const bibliotheque   = useMusicStore(s => s.bibliotheque)
  const deleteCritique = useMusicStore(s => s.deleteCritique)
  const [sort,      setSort]      = useState<SortMode>('sortie_desc')
  const [tagFilter, setTagFilter] = useState<AlbumTag | ''>('')
  const [searchQ,   setSearchQ]   = useState('')
  const [canPrev,   setCanPrev]   = useState(false)
  const [canNext,   setCanNext]   = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const sorted = [...bibliotheque]
    .filter(a => {
      if (tagFilter && !a.tags.includes(tagFilter as AlbumTag)) return false
      if (searchQ) {
        const q = searchQ.toLowerCase()
        return (a.titre + ' ' + a.artiste).toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      if (sort === 'note_desc') return b.note - a.note
      if (sort === 'note_asc') return a.note - b.note
      if (sort === 'artiste') return a.artiste.localeCompare(b.artiste)
      if (sort === 'critique_desc') return new Date(b.dateCritique).getTime() - new Date(a.dateCritique).getTime()
      const da = a.dateOriginaleSortie ?? '', db = b.dateOriginaleSortie ?? ''
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      return db.localeCompare(da)
    })

  const usedTags = Array.from(new Set(bibliotheque.flatMap(a => a.tags)))

  const updateArrows = () => {
    const el = scrollRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    updateArrows()
  }, [sorted.length])

  const pageWidth = CAROUSEL_PAGE * (CAROUSEL_ITEM_W + CAROUSEL_GAP)

  const scrollBy = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * pageWidth, behavior: 'smooth' })
  }

  const arrowBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: '50%',
    border: '1px solid var(--paper-2)',
    background: 'var(--paper-1)', color: 'var(--ink)',
    cursor: 'pointer', flexShrink: 0,
    fontFamily: 'var(--font-sans)', fontSize: 16,
    transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)',
  }

  return (
    <section style={{ marginTop: 56 }}>
      <SectionHeader
        kicker="Bibliothèque"
        title="Ta collection"
        right={<button onClick={onNew} style={primaryBtnStyle}>+ Album</button>}
      />

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <SearchField value={searchQ} onChange={setSearchQ} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <ChipFilter active={tagFilter === ''} onClick={() => setTagFilter('')}>Tous</ChipFilter>
          {usedTags.map(tag => (
            <ChipFilter key={tag} active={tagFilter === tag} onClick={() => setTagFilter(tag === tagFilter ? '' : tag as AlbumTag)}>
              {tag}
            </ChipFilter>
          ))}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <SortMenu value={sort} onChange={setSort} />
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--ink-3)', border: '1px dashed var(--ink-4)', borderRadius: 12 }}>
          {bibliotheque.length === 0 ? 'Aucune critique encore. Commence par écouter un album.' : 'Rien ne correspond.'}
        </div>
      ) : (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => scrollBy(-1)}
            disabled={!canPrev}
            style={{ ...arrowBtnStyle, opacity: canPrev ? 1 : 0.3, pointerEvents: canPrev ? 'auto' : 'none' }}
          >←</button>

          <style>{`.biblio-carousel::-webkit-scrollbar { display: none }`}</style>
          <div
            ref={scrollRef}
            onScroll={updateArrows}
            className="biblio-carousel"
            style={{
              display: 'flex', gap: CAROUSEL_GAP, flex: 1,
              overflowX: 'auto', scrollBehavior: 'smooth',
              scrollbarWidth: 'none',
              paddingBottom: 4,
            }}
          >
            {sorted.map((album, idx) => (
              <div key={album.id || `grid-${idx}`} style={{ flexShrink: 0, width: CAROUSEL_ITEM_W }}>
                <AlbumCard
                  album={album}
                  onEdit={onEdit}
                  onDelete={id => { if (window.confirm('Supprimer cet album ?')) deleteCritique(id) }}
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => scrollBy(1)}
            disabled={!canNext}
            style={{ ...arrowBtnStyle, opacity: canNext ? 1 : 0.3, pointerEvents: canNext ? 'auto' : 'none' }}
          >→</button>
        </div>
      )}
    </section>
  )
}

// ─── PantheonCard ─────────────────────────────────────────────────────────────

function PantheonCard({ album, onEdit }: { album: AlbumCritique; onEdit: (a: AlbumCritique) => void }) {
  const [hover, setHover] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => onEdit(album)} style={{ cursor: 'pointer' }}>
      <div style={{ position: 'relative', transform: hover ? 'translateY(-2px)' : 'translateY(0)', transition: 'transform var(--dur) var(--ease)' }}>
        <AlbumCover titre={album.titre} artiste={album.artiste} pochette={album.pochette} />
        <div style={{ position: 'absolute', top: 10, right: 10, width: 40, height: 40, borderRadius: 999, background: 'var(--ink)', color: 'var(--paper-1)', display: 'grid', placeItems: 'center', border: '2px solid var(--paper-1)', boxShadow: '0 1px 2px rgba(58,46,34,0.25)' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 500, letterSpacing: '-0.01em', color: noteColor(album.note) }}>
            {album.note}
          </span>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {album.titre}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginTop: 3 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {album.artiste}
          </span>
          {album.dateOriginaleSortie && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)', flexShrink: 0 }}>
              {new Date(album.dateOriginaleSortie).getFullYear()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── PantheonSection ──────────────────────────────────────────────────────────

function PantheonSection({ onEdit }: { onEdit: (a: AlbumCritique) => void }) {
  const bibliotheque = useMusicStore(s => s.bibliotheque)
  const pantheon = bibliotheque
    .filter(a => a.note >= 9)
    .sort((a, b) => {
      const da = a.dateOriginaleSortie ?? '', db = b.dateOriginaleSortie ?? ''
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      return da.localeCompare(db)
    })

  return (
    <section style={{ marginTop: 72 }}>
      <SectionHeader
        kicker="Panthéon"
        title="Tes classiques"
        right={<span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>Albums notés 9 et 10</span>}
      />
      {pantheon.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--ink-3)', border: '1px dashed var(--ink-4)', borderRadius: 12 }}>
          Aucun album noté 9 ou 10 encore.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 28 }}>
          {pantheon.map((album, idx) => (
            <PantheonCard key={album.id || `panth-${idx}`} album={album} onEdit={onEdit} />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── QueueRow ─────────────────────────────────────────────────────────────────

function QueueRow({ index, album, last, onListen, onEdit, onDelete }: {
  index: number
  album: AlbumAttente
  last: boolean
  onListen: () => void
  onEdit: (a: AlbumAttente) => void
  onDelete: () => void
}) {
  const [hover, setHover] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: last ? 'none' : '1px solid var(--paper-2)', background: hover ? 'var(--paper-2)' : 'transparent', transition: 'background var(--dur) var(--ease)', cursor: 'default' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', width: 22, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
        {String(index).padStart(2, '0')}
      </span>
      <AlbumCover titre={album.titre} artiste={album.artiste} size={44} style={{ borderRadius: 4 }} />
      <div style={{ flex: '1 1 0', minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {album.titre}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{album.artiste}</span>
          {album.source && (<><span style={{ color: 'var(--ink-4)', flexShrink: 0 }}>·</span><span style={{ fontStyle: 'italic', color: 'var(--ink-3)', flexShrink: 0 }}>{album.source}</span></>)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, opacity: hover ? 1 : 0.5, transition: 'opacity var(--dur) var(--ease)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, background: 'var(--paper-2)', color: 'var(--ink-2)' }}>
          À écouter
        </span>
        <button onClick={onListen} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 6, border: 0, background: 'var(--terra-soft)', color: 'var(--terra)', cursor: 'pointer' }}>
          ▶ Écouter
        </button>
        <button onClick={() => onEdit(album)} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-3)', fontSize: 14, padding: '2px 4px', opacity: hover ? 1 : 0, transition: 'opacity var(--dur) var(--ease)' }}>
          ✎
        </button>
        {confirmDel ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={onDelete} style={{ fontFamily: 'var(--font-sans)', fontSize: 11, padding: '3px 8px', borderRadius: 4, border: 0, background: 'rgba(155,58,28,0.15)', color: 'var(--danger)', cursor: 'pointer' }}>Suppr</button>
            <button onClick={() => setConfirmDel(false)} style={{ fontFamily: 'var(--font-sans)', fontSize: 11, padding: '3px 8px', borderRadius: 4, border: 0, background: 'var(--paper-2)', color: 'var(--ink-2)', cursor: 'pointer' }}>✕</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDel(true)} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-3)', fontSize: 14, padding: '2px 4px', opacity: hover ? 1 : 0, transition: 'opacity var(--dur) var(--ease)' }}>✕</button>
        )}
      </div>
    </div>
  )
}

// ─── FileAttenteSection ───────────────────────────────────────────────────────

function FileAttenteSection({ onNew, onEdit }: { onNew: () => void; onEdit: (a: AlbumAttente) => void }) {
  const fileAttente    = useMusicStore(s => s.fileAttente)
  const startListening = useMusicStore(s => s.startListening)
  const removeFromFile = useMusicStore(s => s.removeFromFile)
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})

  function randomSelect() {
    if (fileAttente.length === 0) return
    const album = fileAttente[Math.floor(Math.random() * fileAttente.length)]
    const id = album.id!
    setHighlighted(id)
    setTimeout(() => setHighlighted(null), 2000)
    itemRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <section style={{ marginTop: 72 }}>
      <SectionHeader
        kicker="File d'attente"
        title={`${fileAttente.length} album${fileAttente.length > 1 ? 's' : ''} à écouter`}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            {fileAttente.length > 1 && (
              <button onClick={randomSelect} style={ghostBtnStyle}>🎲 Mélanger</button>
            )}
            <button onClick={onNew} style={primaryBtnStyle}>+ Ajouter</button>
          </div>
        }
      />
      {fileAttente.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--ink-3)', border: '1px dashed var(--ink-4)', borderRadius: 12 }}>
          Aucun album en attente.
        </div>
      ) : (
        <div style={{ background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12, overflow: 'hidden' }}>
          {fileAttente.map((album, i) => (
            <div key={album.id || `attente-${i}`} ref={el => { if (album.id) itemRefs.current[album.id] = el }}
              style={{ outline: highlighted === album.id ? '2px solid var(--terra-soft)' : 'none', outlineOffset: -2, transition: 'outline 300ms ease' }}>
              <QueueRow
                index={i + 1}
                album={album}
                last={i === fileAttente.length - 1}
                onListen={() => startListening(album.id!)}
                onEdit={onEdit}
                onDelete={() => removeFromFile(album.id!)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ─── MusicPage ────────────────────────────────────────────────────────────────

export function MusicPage() {
  const [critiqueModal, setCritiqueModal] = useState<{ open: boolean; album?: Partial<AlbumCritique & AlbumAttente> | null }>({ open: false })
  const [fileModal,     setFileModal]     = useState(false)

  const _hasHydrated = useMusicStore(s => s._hasHydrated)
  const bibliotheque = useMusicStore(s => s.bibliotheque)
  const fileAttente  = useMusicStore(s => s.fileAttente)
  const albumEnCours = useMusicStore(s => s.albumEnCours)

  // Auto-fix corrupted data (missing IDs)
  useEffect(() => {
    if (_hasHydrated) {
      useMusicStore.setState(state => {
        let changed = false
        const newBiblio   = state.bibliotheque.map(a => { if (!a.id) { changed = true; return { ...a, id: generateId() } } return a })
        const newAttente  = state.fileAttente.map(a => { if (!a.id) { changed = true; return { ...a, id: generateId() } } return a })
        const newArtistes = state.artistesSuivis.map(a => { if (!a.id) { changed = true; return { ...a, id: generateId() } } return a })
        return changed ? { bibliotheque: newBiblio, fileAttente: newAttente, artistesSuivis: newArtistes } : state
      })
    }
  }, [_hasHydrated])

  // Stats
  const thisYear      = new Date().getFullYear()
  const thisYearCount = bibliotheque.filter(a => a.dateCritique.startsWith(String(thisYear))).length
  const pantheonCount = bibliotheque.filter(a => a.note >= 9).length

  return (
    <div style={{ padding: '32px 0 96px', maxWidth: 1180, margin: '0 auto' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40, gap: 32 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            musique · bibliothèque
          </span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 52, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.015em', margin: '6px 0 12px', lineHeight: 1.05 }}>
            Musique.
          </h1>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 19, color: 'var(--ink-2)', margin: 0, maxWidth: '52ch', lineHeight: 1.4 }}>
            « Ce qu'on écoute en ce moment, ce qu'on a aimé, ce qui attend. »
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => setCritiqueModal({ open: true })} style={primaryBtnStyle}>
            + Album
          </button>
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 40, padding: '14px 0 28px', borderBottom: '1px solid var(--paper-2)', marginBottom: 40, flexWrap: 'wrap' }}>
        {[
          { label: 'Bibliothèque', value: String(bibliotheque.length), unit: 'albums' },
          { label: 'Cette année',  value: String(thisYearCount),       unit: 'critiqués' },
          { label: 'Panthéon',     value: String(pantheonCount),       unit: 'classiques' },
          { label: 'À écouter',   value: String(fileAttente.length),  unit: 'en attente' },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{s.label}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-3)' }}>{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── En écoute ───────────────────────────────────────────────────────── */}
      <NowPlaying onCritique={() => setCritiqueModal({ open: true, album: albumEnCours ? { titre: albumEnCours.titre, artiste: albumEnCours.artiste, pochette: albumEnCours.pochette } : null })} />

      {/* ── Bibliothèque ────────────────────────────────────────────────────── */}
      <BibliothequeSection
        onEdit={album => setCritiqueModal({ open: true, album })}
        onNew={() => setCritiqueModal({ open: true })}
      />

      {/* ── Panthéon ────────────────────────────────────────────────────────── */}
      <PantheonSection onEdit={album => setCritiqueModal({ open: true, album })} />

      {/* ── File d'attente ──────────────────────────────────────────────────── */}
      <FileAttenteSection
        onNew={() => setFileModal(true)}
        onEdit={album => setCritiqueModal({ open: true, album })}
      />

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {critiqueModal.open && (
        <CritiqueModal
          initial={critiqueModal.album ?? null}
          onClose={() => setCritiqueModal({ open: false })}
        />
      )}
      {fileModal && <FileModal onClose={() => setFileModal(false)} />}
    </div>
  )
}

// ─── Critique Modal ────────────────────────────────────────────────────────────

interface CritiqueModalProps {
  initial?: Partial<AlbumCritique & AlbumAttente> | null
  onClose: () => void
}

function CritiqueModal({ initial, onClose }: CritiqueModalProps) {
  const addCritique       = useMusicStore((s) => s.addCritique)
  const updateCritique    = useMusicStore((s) => s.updateCritique)
  const deleteCritique    = useMusicStore((s) => s.deleteCritique)
  const fileAttente       = useMusicStore((s) => s.fileAttente)
  const removeFromFile    = useMusicStore((s) => s.removeFromFile)
  const albumEnCours      = useMusicStore((s) => s.albumEnCours)
  const clearAlbumEnCours = useMusicStore((s) => s.clearAlbumEnCours)
  const bibliotheque      = useMusicStore((s) => s.bibliotheque)

  const [titre,      setTitre]      = useState(initial?.titre      ?? albumEnCours?.titre   ?? '')
  const [artistes,      setArtistes]      = useState<string[]>(
    (initial?.artiste ?? albumEnCours?.artiste ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  )
  const [artisteInput, setArtisteInput] = useState('')
  const [dateSortie, setDateSortie] = useState(initial?.dateOriginaleSortie ?? '')
  const [pochette,   setPochette]   = useState(initial?.pochette   ?? albumEnCours?.pochette ?? '')
  const [note,       setNote]       = useState<number>(initial?.note ?? 7)
  const [tags,       setTags]       = useState<AlbumTag[]>(initial?.tags ?? [])
  const [critique,   setCritique]   = useState(initial?.critique   ?? '')
  const [tracks,     setTracks]     = useState(initial?.tracksFavorites?.join('\n') ?? '')
  const [contexte,   setContexte]   = useState(initial?.contexte   ?? albumEnCours?.premiereImpression ?? '')
  const [dragOver,   setDragOver]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleImageFile(file: File) {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_SIZE = 300
        let { width, height } = img
        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width
          width = MAX_SIZE
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height
          height = MAX_SIZE
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        setPochette(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = (e.target?.result as string) ?? ''
    }
    reader.readAsDataURL(file)
  }

  function toggleTag(tag: AlbumTag) {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag)
      if (prev.length >= 3) return prev
      return [...prev, tag]
    })
  }

  const isExistingCritique = !!(initial?.id && bibliotheque.some((a) => a.id === initial.id))

  function addArtiste(val: string) {
    const name = val.trim()
    if (name && !artistes.includes(name)) setArtistes((p) => [...p, name])
    setArtisteInput('')
  }

  function handleSubmit() {
    if (!titre.trim() || artistes.length === 0) return
    const data = {
      titre:               titre.trim(),
      artiste:             artistes.join(', '),
      dateOriginaleSortie: dateSortie,
      pochette,
      note,
      tags,
      critique:            critique.trim(),
      tracksFavorites:     tracks.split('\n').map((t) => t.trim()).filter(Boolean),
      contexte:            contexte.trim(),
    }

    if (isExistingCritique) {
      updateCritique(initial.id!, data)
    } else {
      addCritique({ id: initial?.id || generateId(), ...data })
      if (initial?.id && fileAttente.some((a) => a.id === initial.id)) {
        removeFromFile(initial.id!)
      }
      if (albumEnCours) clearAlbumEnCours()
    }
    onClose()
  }

  const inputCls = 'w-full rounded-[var(--r-md)] px-3 py-2 text-sm outline-none transition-colors bg-[var(--bg)] border border-[var(--border)] text-[var(--fg)] focus:border-[var(--terra)] placeholder:text-[var(--fg-subtle)]'
  const labelCls = 'block mb-1 text-[11px] text-[var(--fg-muted)]'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(58,46,34,0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: 'var(--fg)', margin: 0 }}>
            {initial ? 'Modifier la critique' : 'Nouvelle critique'}
          </h2>

          {/* Titre / Artiste */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Titre *</label>
              <input value={titre} onChange={(e) => setTitre(e.target.value)} className={inputCls} placeholder="Album" />
            </div>
            <div>
              <label className={labelCls}>Artiste *</label>
              <div
                className="w-full flex flex-wrap gap-1 px-2 py-1.5 rounded-[var(--r-md)] transition-colors"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', minHeight: 38 }}
              >
                {artistes.map((a) => (
                  <span key={a} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: 'var(--paper-3)', color: 'var(--fg)' }}>
                    {a}
                    <button type="button" onClick={() => setArtistes((p) => p.filter((x) => x !== a))} style={{ color: 'var(--fg-muted)' }}>×</button>
                  </span>
                ))}
                <input
                  value={artisteInput}
                  onChange={(e) => setArtisteInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addArtiste(artisteInput) } }}
                  onBlur={() => { if (artisteInput.trim()) addArtiste(artisteInput) }}
                  className="flex-1 min-w-[80px] bg-transparent text-sm outline-none"
                  style={{ color: 'var(--fg)' }}
                  placeholder={artistes.length === 0 ? 'Artiste, Entrée' : '+'}
                />
              </div>
            </div>
          </div>

          {/* Date de sortie */}
          <div>
            <label className={labelCls}>Date de sortie</label>
            <input type="date" value={dateSortie} onChange={(e) => setDateSortie(e.target.value)} className={inputCls} />
            {dateSortie && (
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-subtle)' }}>{fmtDate(dateSortie)}</p>
            )}
          </div>

          {/* Pochette — upload / drag & drop */}
          <div>
            <label className={labelCls}>Pochette</label>
            <div className="flex gap-3 items-start">
              <div
                className="relative flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors cursor-pointer min-h-[80px]"
                style={{
                  borderColor: dragOver ? 'var(--terra)' : 'var(--border)',
                  background: dragOver ? 'var(--terra-soft)' : 'var(--bg)',
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  const file = e.dataTransfer.files[0]
                  if (file) handleImageFile(file)
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageFile(file)
                  }}
                />
                {pochette ? (
                  <img src={pochette} alt="pochette" className="w-full h-full object-cover rounded-xl max-h-48" />
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Glisse une image ici</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--fg-subtle)' }}>ou clique pour choisir · JPG PNG WEBP</p>
                  </div>
                )}
              </div>
              {pochette && (
                <button
                  onClick={() => setPochette('')}
                  className="px-2.5 py-1.5 rounded-lg text-xs transition-colors shrink-0"
                  style={{ background: 'var(--paper-2)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
                >
                  ✕ Retirer
                </button>
              )}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className={labelCls}>
              Note : <span className="font-semibold" style={{ color: noteColor(note) }}>{note % 1 === 0 ? note : note.toFixed(1)}/10</span>
            </label>
            <input
              type="range" min={1} max={10} step={0.5} value={note}
              onChange={(e) => setNote(parseFloat(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--terra)' }}
            />
            <div className="flex justify-between text-[10px] mt-0.5" style={{ color: 'var(--fg-subtle)' }}>
              <span>1</span><span>5</span><span>10</span>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className={labelCls}>Tags (max 3)</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="px-2 py-0.5 rounded text-[11px] border transition-colors"
                  style={tags.includes(tag)
                    ? { background: 'var(--terra-soft)', borderColor: 'var(--terra)', color: 'var(--terra-deep)' }
                    : { background: 'var(--paper-2)', borderColor: 'var(--border)', color: 'var(--fg)' }
                  }
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Critique */}
          <div>
            <label className={labelCls}>Critique</label>
            <textarea
              value={critique} onChange={(e) => setCritique(e.target.value)}
              rows={3}
              className={inputCls + ' resize-none'}
              placeholder="Ce que j'en pense..."
            />
          </div>

          {/* Tracks */}
          <div>
            <label className={labelCls}>Tracks favorites (une par ligne)</label>
            <textarea
              value={tracks} onChange={(e) => setTracks(e.target.value)}
              rows={2}
              className={inputCls + ' resize-none'}
              placeholder={"Track 1\nTrack 2"}
            />
          </div>

          {/* Contexte */}
          <div>
            <label className={labelCls}>Contexte personnel</label>
            <input
              value={contexte} onChange={(e) => setContexte(e.target.value)}
              className={inputCls}
              placeholder="Première impression, moment particulier..."
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={!titre.trim() || artistes.length === 0}
              className="flex-1 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--terra)', color: 'var(--paper-1)', borderRadius: 'var(--r-full)', border: 'none', cursor: 'pointer' }}
            >
              {!!initial ? 'Enregistrer' : 'Ajouter à la bibliothèque'}
            </button>
            {!!initial && (
              <button
                onClick={() => {
                  if (window.confirm('Supprimer cette critique ?')) {
                    deleteCritique(initial.id!)
                    onClose()
                  }
                }}
                className="px-4 py-2 text-sm transition-colors"
                style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}
              >
                Supprimer
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm transition-colors"
              style={{ background: 'var(--paper-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── File Modal ────────────────────────────────────────────────────────────────

function FileModal({ onClose }: { onClose: () => void }) {
  const addAlbumFile = useMusicStore((s) => s.addAlbumFile)
  const [titre,    setTitre]    = useState('')
  const [artiste,  setArtiste]  = useState('')
  const [source,   setSource]   = useState('')
  const [pourquoi, setPourquoi] = useState('')

  function handleSubmit() {
    if (!titre.trim() || !artiste.trim()) return
    addAlbumFile({ titre: titre.trim(), artiste: artiste.trim(), source: source.trim(), pourquoi: pourquoi.trim() })
    onClose()
  }

  const inputCls = 'w-full rounded-[var(--r-md)] px-3 py-2 text-sm outline-none transition-colors bg-[var(--bg)] border border-[var(--border)] text-[var(--fg)] focus:border-[var(--terra)] placeholder:text-[var(--fg-subtle)]'
  const labelCls = 'block mb-1 text-[11px] text-[var(--fg-muted)]'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(58,46,34,0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl"
        style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-3">
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--fg)', margin: 0 }}>
            Ajouter à la file
          </h2>
          <div>
            <label className={labelCls}>Titre *</label>
            <input value={titre} onChange={(e) => setTitre(e.target.value)}
              className={inputCls}
              placeholder="Album"
            />
          </div>
          <div>
            <label className={labelCls}>Artiste *</label>
            <input value={artiste} onChange={(e) => setArtiste(e.target.value)}
              className={inputCls}
              placeholder="Artiste"
            />
          </div>
          <div>
            <label className={labelCls}>Source</label>
            <input value={source} onChange={(e) => setSource(e.target.value)}
              className={inputCls}
              placeholder="Conseil de X, vu dans Y..."
            />
          </div>
          <div>
            <label className={labelCls}>Pourquoi</label>
            <input value={pourquoi} onChange={(e) => setPourquoi(e.target.value)}
              className={inputCls}
              placeholder="Raison de l'intérêt..."
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={!titre.trim() || !artiste.trim()}
              className="flex-1 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--terra)', color: 'var(--paper-1)', borderRadius: 'var(--r-full)', border: 'none', cursor: 'pointer' }}
            >
              Ajouter
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm transition-colors"
              style={{ background: 'var(--paper-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
