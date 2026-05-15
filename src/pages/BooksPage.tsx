import { useState, useRef, useEffect } from 'react'
import { useBookStore } from '../store/bookStore'
import type { BookCritique, BookAttente, BookEnCours, BookType, BookSource } from '../store/bookStore'

// ─── Constants ────────────────────────────────────────────────────────────────

const GENRES_DEFAUT = [
  'Roman', 'Essai', 'Philosophie', 'Histoire', 'Biographie',
  'Thriller', 'Science-fiction', 'Poésie', 'Théâtre', 'Autobiographie',
  'Dystopie', 'Classique', 'Contemporain', 'Policier', 'Nouvelles',
]

const SOURCE_LABELS: Record<BookSource, string> = {
  recommandation:    'Recommandation',
  'prix-litteraire': 'Prix littéraire',
  recherche:         'Recherche personnelle',
  'reference-roman': 'Référence roman',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function noteColor(note: number): string {
  if (note >= 9) return 'var(--terra)'
  if (note >= 7) return 'var(--sage-deep)'
  if (note >= 5) return 'var(--fg)'
  return 'var(--fg-muted)'
}

function fmtDate(iso: string | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getCurrentYear() { return new Date().getFullYear() }

function getWeeksElapsed(): number {
  const now  = new Date()
  const jan1 = new Date(now.getFullYear(), 0, 1)
  return Math.max(1, Math.ceil((now.getTime() - jan1.getTime()) / (7 * 86400000)))
}

function compressImage(file: File, maxSize = 300): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > height && width > maxSize) { height *= maxSize / width; width = maxSize }
        else if (height > maxSize) { width *= maxSize / height; height = maxSize }
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = (e.target?.result as string) ?? ''
    }
    reader.readAsDataURL(file)
  })
}

function hashIdx(str: string, mod: number): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h) % mod
}

// ─── BookCover — couverture SVG générative ────────────────────────────────────

const COVER_PALETTES = [
  { bg: '#3A2E22', ink: '#F4ECDC', accent: '#B5532A' },
  { bg: '#B5532A', ink: '#FBF6EA', accent: '#3A2E22' },
  { bg: '#7E9A7A', ink: '#FBF6EA', accent: '#3A2E22' },
  { bg: '#EAD1BE', ink: '#3A2E22', accent: '#8E3D1C' },
  { bg: '#5C7859', ink: '#FBF6EA', accent: '#EAD1BE' },
  { bg: '#FBF6EA', ink: '#3A2E22', accent: '#B5532A' },
  { bg: '#8E3D1C', ink: '#F4ECDC', accent: '#7E9A7A' },
  { bg: '#3A2E22', ink: '#EAD1BE', accent: '#7E9A7A' },
  { bg: '#EADFC8', ink: '#3A2E22', accent: '#5C7859' },
  { bg: '#6B5B48', ink: '#FBF6EA', accent: '#B5532A' },
]
const TEMPLATES = ['plain', 'bandTop', 'bandBottom', 'frame', 'stripe', 'split'] as const

function BookCover({ title, author, width = 120, height = 180, style }: {
  title: string; author: string; width?: number; height?: number; style?: React.CSSProperties
}) {
  const key  = (title || '') + '·' + (author || '')
  const pal  = COVER_PALETTES[hashIdx(key, COVER_PALETTES.length)]
  const tpl  = TEMPLATES[hashIdx(key + '!', TEMPLATES.length)]
  const tSize = Math.max(11, Math.round(width * 0.105))
  const aSize = Math.max(8,  Math.round(width * 0.065))
  const pad   = Math.round(width * 0.09)
  const base: React.CSSProperties = {
    width, height, flexShrink: 0,
    background: pal.bg, color: pal.ink,
    borderRadius: 3,
    boxShadow: '0 1px 2px rgba(58,46,34,0.18), inset 1px 0 0 rgba(0,0,0,0.08)',
    position: 'relative', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    fontFamily: 'var(--font-serif)',
    ...style,
  }

  const Title = (
    <div style={{ fontFamily: 'var(--font-serif)', fontSize: tSize, fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.01em', color: pal.ink, wordBreak: 'break-word' }}>
      {title}
    </div>
  )
  const Author = (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: aSize, letterSpacing: '0.08em', textTransform: 'uppercase', color: pal.ink, opacity: 0.78, marginTop: 6 }}>
      {author}
    </div>
  )
  const Spine = <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, background: 'linear-gradient(to right, rgba(0,0,0,0.18), rgba(0,0,0,0))', pointerEvents: 'none' }} />
  if (tpl === 'plain') return (
    <div style={base}>{Spine}
      <div style={{ padding: pad, marginTop: 'auto' }}>{Title}{Author}</div>
    </div>
  )
  if (tpl === 'bandTop') return (
    <div style={base}>{Spine}
      <div style={{ height: height * 0.34, background: pal.accent }} />
      <div style={{ padding: pad, marginTop: 'auto' }}>{Title}{Author}</div>
    </div>
  )
  if (tpl === 'bandBottom') return (
    <div style={base}>{Spine}
      <div style={{ padding: pad, paddingTop: pad * 1.4 }}>{Title}</div>
      <div style={{ marginTop: 'auto', background: pal.accent, padding: `${pad * 0.7}px ${pad}px` }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: aSize, letterSpacing: '0.08em', textTransform: 'uppercase', color: pal.bg }}>{author}</div>
      </div>
    </div>
  )
  if (tpl === 'frame') return (
    <div style={base}>{Spine}
      <div style={{ position: 'absolute', inset: pad * 0.7, border: `1px solid ${pal.accent}` }} />
      <div style={{ padding: pad * 1.4, marginTop: 'auto', position: 'relative' }}>{Title}{Author}</div>
    </div>
  )
  if (tpl === 'stripe') return (
    <div style={base}>{Spine}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: pad, paddingBottom: 4 }}>{Title}</div>
        <div style={{ height: 4, background: pal.accent, margin: `${pad * 0.5}px ${pad}px` }} />
        <div style={{ padding: `0 ${pad}px ${pad}px`, marginTop: 'auto' }}>{Author}</div>
      </div>
    </div>
  )
  return (
    <div style={base}>{Spine}
      <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', height: '100%' }}>
        <div style={{ background: pal.accent, padding: pad, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: tSize, color: pal.bg, lineHeight: 1.1 }}>{title}</div>
        </div>
        <div style={{ padding: pad, display: 'flex', alignItems: 'flex-end' }}>{Author}</div>
      </div>
    </div>
  )
}

// ─── CoverDisplay — image ou BookCover ────────────────────────────────────────

function CoverDisplay({ src, title, author, width, height, style }: {
  src?: string; title: string; author: string; width: number; height: number; style?: React.CSSProperties
}) {
  if (src) return (
    <img src={src} alt={title}
      style={{ width, height, objectFit: 'cover', objectPosition: 'center top', borderRadius: 3, display: 'block', flexShrink: 0, ...style }} />
  )
  return <BookCover title={title} author={author} width={width} height={height} style={style} />
}

// ─── Image Drop Zone ──────────────────────────────────────────────────────────

interface ImageDropZoneProps { value: string; onChange: (url: string) => void; height?: number }

function ImageDropZone({ value, onChange, height = 120 }: ImageDropZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    onChange(await compressImage(file))
  }

  return (
    <div
      style={{
        position: 'relative', height, borderRadius: 'var(--r-md)', cursor: 'pointer', overflow: 'hidden',
        border: `2px dashed ${dragOver ? 'var(--terra)' : 'var(--border)'}`,
        background: dragOver ? 'var(--terra-soft)' : 'var(--bg)',
        transition: 'border-color var(--dur) var(--ease), background var(--dur) var(--ease)',
      }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={async (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      onClick={() => inputRef.current?.click()}
    >
      {value ? (
        <div className="flex h-full items-center justify-center gap-3">
          <img src={value} alt="" className="h-full w-auto max-w-[40%] object-cover rounded" />
          <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>Cliquer pour changer</span>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-1">
          <span style={{ color: 'var(--fg-subtle)', fontSize: 20 }}>↑</span>
          <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>Couverture — glisser ou cliquer</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden"
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}

// ─── Genre Picker ─────────────────────────────────────────────────────────────

interface GenrePickerProps {
  selected: string[]; allGenres: string[]
  onChange: (g: string[]) => void; onCreateGenre: (g: string) => void
}

function GenrePicker({ selected, allGenres, onChange, onCreateGenre }: GenrePickerProps) {
  const [input, setInput] = useState('')
  function toggle(g: string) { onChange(selected.includes(g) ? selected.filter((x) => x !== g) : [...selected, g]) }
  function create() {
    const g = input.trim()
    if (!g || allGenres.includes(g)) return
    onCreateGenre(g); onChange([...selected, g]); setInput('')
  }
  const inputCls = 'rounded-[var(--r-md)] px-2.5 py-1 text-xs outline-none transition-colors bg-[var(--bg)] border border-[var(--border)] text-[var(--fg)] focus:border-[var(--terra)] placeholder:text-[var(--fg-subtle)]'
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {allGenres.map((g) => (
          <button key={g} type="button" onClick={() => toggle(g)}
            className="px-2 py-0.5 rounded text-xs border transition-colors"
            style={selected.includes(g)
              ? { background: 'var(--terra-soft)', borderColor: 'var(--terra)', color: 'var(--terra-deep)' }
              : { background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg-muted)' }
            }>
            {g}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); create() } }}
          placeholder="Nouveau genre…" className={`flex-1 ${inputCls}`} />
        <button type="button" onClick={create} disabled={!input.trim()}
          className="px-2 py-1 text-xs rounded transition-colors disabled:opacity-40"
          style={{ background: 'var(--paper-2)', border: '1px solid var(--border)', color: 'var(--fg-muted)', cursor: 'pointer' }}>
          Ajouter
        </button>
      </div>
    </div>
  )
}

// ─── Critique Modal ───────────────────────────────────────────────────────────

interface CritiqueModalProps {
  initial?:  Partial<BookCritique> | null
  fromFile?: Partial<BookAttente> | null
  onClose:   () => void
}

function CritiqueModal({ initial, fromFile, onClose }: CritiqueModalProps) {
  const addCritique    = useBookStore((s) => s.addCritique)
  const updateCritique = useBookStore((s) => s.updateCritique)
  const deleteCritique = useBookStore((s) => s.deleteCritique)
  const livreEnCours   = useBookStore((s) => s.livreEnCours)
  const clearEnCours   = useBookStore((s) => s.clearLivreEnCours)
  const genresPerso    = useBookStore((s) => s.genresPerso)
  const addGenrePerso  = useBookStore((s) => s.addGenrePerso)

  const allGenres = [...GENRES_DEFAUT, ...genresPerso]
  const isEdit    = !!initial?.id
  const prefill   = initial ?? livreEnCours ?? fromFile ?? {}

  const [titre,     setTitre]     = useState(prefill.titre ?? '')
  const [auteur,    setAuteur]    = useState((prefill as BookCritique).auteur ?? (prefill as BookEnCours)?.auteur ?? '')
  const [annee,     setAnnee]     = useState((initial as BookCritique)?.anneePublication ?? '')
  const [couv,      setCouv]      = useState((initial as BookCritique)?.couverture ?? livreEnCours?.couverture ?? '')
  const [note,      setNote]      = useState<number>((initial as BookCritique)?.note ?? 7)
  const [genres,    setGenres]    = useState<string[]>((initial as BookCritique)?.genres ?? [])
  const [troismots, setTroismots] = useState<string[]>((initial as BookCritique)?.troismots ?? ['', '', ''])
  const [critique,  setCritique]  = useState((initial as BookCritique)?.critique ?? '')
  const [citation,  setCitation]  = useState((initial as BookCritique)?.citationFavorite ?? '')
  const [type,      setType]      = useState<BookType>((initial as BookCritique)?.type ?? 'fiction')
  const [dateLect,  setDateLect]  = useState((initial as BookCritique)?.dateLecture ?? new Date().toISOString().split('T')[0])
  const [refRoman,  setRefRoman]  = useState((initial as BookCritique)?.referenceRoman ?? false)

  const canSave = titre.trim() !== '' && auteur.trim() !== ''
  const inputCls = 'w-full rounded-[var(--r-md)] px-3 py-1.5 text-sm outline-none transition-colors bg-[var(--bg)] border border-[var(--border)] text-[var(--fg)] focus:border-[var(--terra)] placeholder:text-[var(--fg-subtle)]'
  const labelCls = 'block text-[11px] uppercase tracking-wide mb-1' + ' text-[var(--fg-muted)]'

  function handleSave() {
    if (!canSave) return
    const data: Omit<BookCritique, 'id'> = {
      titre: titre.trim(), auteur: auteur.trim(), anneePublication: annee.trim(),
      couverture: couv, note, genres,
      troismots: troismots.map((m) => m.trim()).filter(Boolean),
      critique: critique.trim(), citationFavorite: citation.trim(),
      type, dateLecture: dateLect, referenceRoman: refRoman,
    }
    if (isEdit && initial?.id) updateCritique(initial.id, data)
    else { addCritique(data); if (livreEnCours) clearEnCours() }
    onClose()
  }

  function handleDelete() {
    if (!initial?.id) return
    if (!window.confirm('Supprimer ce livre ?')) return
    deleteCritique(initial.id); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(58,46,34,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 rounded-t-2xl"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elev)' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, color: 'var(--fg)', margin: 0 }}>
            {isEdit ? 'Modifier la critique' : 'Ajouter un livre lu'}
          </h2>
          <button onClick={onClose} className="text-lg leading-none" style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>

        <div className="p-6 space-y-5">
          <ImageDropZone value={couv} onChange={setCouv} height={110} />

          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Titre *</label>
              <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre du livre" className={inputCls} style={{ fontFamily: 'var(--font-serif)' }} /></div>
            <div><label className={labelCls}>Auteur *</label>
              <input value={auteur} onChange={(e) => setAuteur(e.target.value)} placeholder="Nom de l'auteur" className={inputCls} /></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Année publi.</label>
              <input value={annee} onChange={(e) => setAnnee(e.target.value)} placeholder="2003" className={inputCls} /></div>
            <div><label className={labelCls}>Type</label>
              <div className="flex gap-1">
                {(['fiction', 'non-fiction'] as BookType[]).map((t) => (
                  <button key={t} type="button" onClick={() => setType(t)}
                    className="flex-1 py-1.5 text-xs rounded-lg border transition-colors"
                    style={type === t
                      ? { background: 'var(--terra-soft)', borderColor: 'var(--terra)', color: 'var(--terra-deep)', cursor: 'pointer' }
                      : { background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg-muted)', cursor: 'pointer' }
                    }>
                    {t === 'fiction' ? 'Fiction' : 'Non-fic.'}
                  </button>
                ))}
              </div>
            </div>
            <div><label className={labelCls}>Date de lecture</label>
              <input type="date" value={dateLect} onChange={(e) => setDateLect(e.target.value)} className={inputCls} /></div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={labelCls}>Note</label>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: noteColor(note), fontVariantNumeric: 'tabular-nums' }}>
                {note % 1 === 0 ? note : note.toFixed(1)}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--fg-subtle)' }}>/10</span>
              </span>
            </div>
            <input type="range" min={1} max={10} step={0.5} value={note}
              onChange={(e) => setNote(parseFloat(e.target.value))}
              className="w-full" style={{ accentColor: 'var(--terra)' }} />
            <div className="flex justify-between text-[10px] font-mono" style={{ color: 'var(--fg-subtle)' }}>
              {[1,2,3,4,5,6,7,8,9,10].map((n) => <span key={n}>{n}</span>)}
            </div>
          </div>

          <div><label className={labelCls}>Genres</label>
            <GenrePicker selected={genres} allGenres={allGenres} onChange={setGenres} onCreateGenre={addGenrePerso} /></div>

          <div><label className={labelCls}>3 mots qui définissent ce livre</label>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <input key={i} value={troismots[i] ?? ''}
                  onChange={(e) => { const n = [...troismots]; n[i] = e.target.value; setTroismots(n) }}
                  placeholder={['Premier', 'Deuxième', 'Troisième'][i]}
                  className={inputCls} style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }} />
              ))}
            </div>
          </div>

          <div><label className={labelCls}>Critique</label>
            <textarea value={critique} onChange={(e) => setCritique(e.target.value)}
              placeholder="Ta critique, sans longueur imposée…" rows={5}
              className={inputCls + ' resize-none leading-relaxed'} style={{ fontFamily: 'var(--font-serif)' }} /></div>

          <div><label className={labelCls}>Citation favorite</label>
            <textarea value={citation} onChange={(e) => setCitation(e.target.value)}
              placeholder="La phrase qui t'a marqué…" rows={3}
              className={inputCls + ' resize-none leading-relaxed'} style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }} /></div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setRefRoman(!refRoman)}
              className="relative h-4 w-7 rounded-full transition-colors"
              style={{ background: refRoman ? 'var(--terra)' : 'var(--border-strong)' }}>
              <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${refRoman ? 'translate-x-3' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>Référence roman — alimente ta bibliothèque d'écriture</span>
          </label>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between px-6 py-4 rounded-b-2xl"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elev)' }}>
          {isEdit
            ? <button onClick={handleDelete} className="text-xs" style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Supprimer</button>
            : <div />
          }
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg transition-colors"
              style={{ color: 'var(--fg-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Annuler</button>
            <button onClick={handleSave} disabled={!canSave}
              className="px-4 py-1.5 text-sm rounded-full font-medium transition-colors disabled:opacity-40"
              style={{ background: 'var(--terra)', color: 'var(--paper-1)', border: 'none', cursor: 'pointer' }}>
              {isEdit ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── File Modal ───────────────────────────────────────────────────────────────

function FileModal({ onClose }: { onClose: () => void }) {
  const addFileAttente = useBookStore((s) => s.addFileAttente)
  const [titre,    setTitre]    = useState('')
  const [auteur,   setAuteur]   = useState('')
  const [source,   setSource]   = useState<BookSource>('recommandation')
  const [pourquoi, setPourquoi] = useState('')
  const canSave = titre.trim() !== ''
  const inputCls = 'w-full rounded-[var(--r-md)] px-3 py-1.5 text-sm outline-none transition-colors bg-[var(--bg)] border border-[var(--border)] text-[var(--fg)] focus:border-[var(--terra)] placeholder:text-[var(--fg-subtle)]'
  const labelCls = 'block text-[11px] uppercase tracking-wide mb-1 text-[var(--fg-muted)]'

  function handleSave() {
    if (!canSave) return
    addFileAttente({ titre: titre.trim(), auteur: auteur.trim(), source, pourquoi: pourquoi.trim() }); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(58,46,34,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl"
        style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, color: 'var(--fg)', margin: 0 }}>Ajouter à la file</h2>
          <button onClick={onClose} style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className={labelCls}>Titre *</label>
            <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre du livre" autoFocus
              className={inputCls} style={{ fontFamily: 'var(--font-serif)' }} /></div>
          <div><label className={labelCls}>Auteur</label>
            <input value={auteur} onChange={(e) => setAuteur(e.target.value)} placeholder="Nom de l'auteur" className={inputCls} /></div>
          <div><label className={labelCls}>Source</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(SOURCE_LABELS) as [BookSource, string][]).map(([k, v]) => (
                <button key={k} type="button" onClick={() => setSource(k)}
                  className="py-1.5 px-2 text-xs rounded-lg border transition-colors text-left"
                  style={source === k
                    ? { background: 'var(--terra-soft)', borderColor: 'var(--terra)', color: 'var(--terra-deep)', cursor: 'pointer' }
                    : { background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg-muted)', cursor: 'pointer' }
                  }>{v}</button>
              ))}
            </div>
          </div>
          <div><label className={labelCls}>Pourquoi ce livre</label>
            <input value={pourquoi} onChange={(e) => setPourquoi(e.target.value)} placeholder="Une ligne de contexte…" className={inputCls} /></div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg"
            style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleSave} disabled={!canSave}
            className="px-4 py-1.5 text-sm rounded-full font-medium disabled:opacity-40"
            style={{ background: 'var(--terra)', color: 'var(--paper-1)', border: 'none', cursor: 'pointer' }}>Ajouter</button>
        </div>
      </div>
    </div>
  )
}

// ─── En Cours Modal ───────────────────────────────────────────────────────────

function EnCoursModal({ onClose }: { onClose: () => void }) {
  const livreEnCours       = useBookStore((s) => s.livreEnCours)
  const setLivreEnCours    = useBookStore((s) => s.setLivreEnCours)
  const updateLivreEnCours = useBookStore((s) => s.updateLivreEnCours)
  const isEdit = !!livreEnCours
  const [titre,    setTitre]    = useState(livreEnCours?.titre ?? '')
  const [auteur,   setAuteur]   = useState(livreEnCours?.auteur ?? '')
  const [couv,     setCouv]     = useState(livreEnCours?.couverture ?? '')
  const [pageAct,  setPageAct]  = useState(livreEnCours?.pageActuelle?.toString() ?? '')
  const [pagesTot, setPagesTot] = useState(livreEnCours?.pagesTotal?.toString() ?? '')
  const canSave = titre.trim() !== ''
  const inputCls = 'w-full rounded-[var(--r-md)] px-3 py-1.5 text-sm outline-none transition-colors bg-[var(--bg)] border border-[var(--border)] text-[var(--fg)] focus:border-[var(--terra)] placeholder:text-[var(--fg-subtle)]'
  const labelCls = 'block text-[11px] uppercase tracking-wide mb-1 text-[var(--fg-muted)]'

  function handleSave() {
    if (!canSave) return
    const data = { titre: titre.trim(), auteur: auteur.trim(), couverture: couv,
      pageActuelle: pageAct ? parseInt(pageAct) : null,
      pagesTotal: pagesTot ? parseInt(pagesTot) : null,
      impressions: livreEnCours?.impressions ?? '' }
    if (isEdit) updateLivreEnCours(data); else setLivreEnCours(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(58,46,34,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl"
        style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, color: 'var(--fg)', margin: 0 }}>
            {isEdit ? 'Modifier la lecture en cours' : 'Démarrer une lecture'}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        <div className="p-5 space-y-4">
          <ImageDropZone value={couv} onChange={setCouv} height={90} />
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Titre *</label>
              <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre"
                className={inputCls} style={{ fontFamily: 'var(--font-serif)' }} /></div>
            <div><label className={labelCls}>Auteur</label>
              <input value={auteur} onChange={(e) => setAuteur(e.target.value)} placeholder="Auteur" className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Page actuelle</label>
              <input type="number" value={pageAct} onChange={(e) => setPageAct(e.target.value)} placeholder="—"
                className={inputCls} style={{ fontFamily: 'var(--font-mono)' }} /></div>
            <div><label className={labelCls}>Pages totales</label>
              <input type="number" value={pagesTot} onChange={(e) => setPagesTot(e.target.value)} placeholder="—"
                className={inputCls} style={{ fontFamily: 'var(--font-mono)' }} /></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg"
            style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleSave} disabled={!canSave}
            className="px-4 py-1.5 text-sm rounded-full font-medium disabled:opacity-40"
            style={{ background: 'var(--terra)', color: 'var(--paper-1)', border: 'none', cursor: 'pointer' }}>
            {isEdit ? 'Enregistrer' : 'Commencer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function SectionHeader({ label, caption, right }: { label: string; caption?: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
      <div>
        <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>{label}</span>
        {caption && <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 500, color: 'var(--fg)', margin: 0, lineHeight: 1.15 }}>{caption}</h2>}
      </div>
      {right && <div style={{ paddingBottom: 4 }}>{right}</div>}
    </div>
  )
}

function ProgressBar({ value, max, color = 'var(--terra)', height = 6 }: { value: number; max: number; color?: string; height?: number }) {
  return (
    <div style={{ width: '100%', height, background: 'var(--paper-2)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: '100%', background: color, borderRadius: 999, transition: 'width var(--dur-slow) var(--ease)' }} />
    </div>
  )
}

function NoteBadge({ note }: { note: number }) {
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: 'var(--paper-1)', background: 'var(--ink)', padding: '3px 7px', borderRadius: 4, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
      {note % 1 === 0 ? note : note.toFixed(1)}/10
    </span>
  )
}

function TypeBadge({ type }: { type: BookType }) {
  const isFiction = type === 'fiction'
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: isFiction ? '#6B2F14' : '#3F5A3C', background: isFiction ? 'var(--terra-soft)' : 'var(--sage-soft)', border: `1px solid ${isFiction ? '#DEB89C' : '#B9C8B4'}`, padding: '2px 7px', borderRadius: 4 }}>
      {isFiction ? 'Fiction' : 'Non-fic'}
    </span>
  )
}

// ─── BookCard — carte grille bibliothèque ─────────────────────────────────────

function BookCard({ livre, onEdit }: { livre: BookCritique; onEdit: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={onEdit}
      style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 14, borderRadius: 12, cursor: 'pointer', background: hover ? 'var(--paper-1)' : 'transparent', border: `1px solid ${hover ? 'var(--paper-2)' : 'transparent'}`, transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)' }}>
      <div style={{ position: 'relative', alignSelf: 'center' }}>
        <CoverDisplay src={livre.couverture} title={livre.titre} author={livre.auteur} width={148} height={222} />
        <div style={{ position: 'absolute', top: 8, left: 8 }}><TypeBadge type={livre.type} /></div>
        <div style={{ position: 'absolute', top: 8, right: 8 }}><NoteBadge note={livre.note} /></div>
        {livre.critique && hover && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(58,46,34,0.82)', display: 'flex', alignItems: 'flex-end', padding: 12, borderRadius: 3 }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 10, color: 'var(--paper-1)', fontStyle: 'italic', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical' }}>
              {livre.critique}
            </p>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 500, lineHeight: 1.2, color: 'var(--fg)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{livre.titre}</h3>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-muted)' }}>
          {livre.auteur}{livre.anneePublication && <span style={{ color: 'var(--fg-subtle)' }}> · {livre.anneePublication}</span>}
        </div>
        {livre.troismots.filter(Boolean).length > 0 && (
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 12, fontStyle: 'italic', color: 'var(--fg-subtle)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {livre.troismots.filter(Boolean).join(' · ')}
          </p>
        )}
        {livre.genres.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
            {livre.genres.slice(0, 2).map((g) => (
              <span key={g} style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--fg-muted)', padding: '2px 8px', borderRadius: 999, background: 'var(--paper-2)' }}>{g}</span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-subtle)' }}>
          <span>✓</span><span>{fmtDate(livre.dateLecture)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── QueueRow — ligne liste file d'attente ────────────────────────────────────

function QueueRow({ livre, index, isLast, onStart, onRemove }: {
  livre: BookAttente; index: number; isLast: boolean; onStart: () => void; onRemove: () => void
}) {
  const [hover, setHover] = useState(false)
  const sourceColor: Record<BookSource, string> = {
    recommandation:    'var(--fg-muted)',
    'prix-litteraire': 'var(--terra)',
    recherche:         'var(--fg-muted)',
    'reference-roman': 'var(--sage-deep)',
  }
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'grid', gridTemplateColumns: '32px auto 1fr auto auto', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: isLast ? 0 : '1px solid var(--paper-2)', background: hover ? 'var(--paper-2)' : 'transparent', transition: 'background var(--dur) var(--ease)' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-subtle)', fontVariantNumeric: 'tabular-nums' }}>{String(index).padStart(2, '0')}</span>
      <BookCover title={livre.titre} author={livre.auteur ?? ''} width={44} height={66} style={{ borderRadius: 3 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 500, color: 'var(--fg)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{livre.titre}</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--fg-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {livre.auteur && <span>{livre.auteur} · </span>}
          <span style={{ color: sourceColor[livre.source], fontStyle: 'italic' }}>{SOURCE_LABELS[livre.source]}</span>
          {livre.pourquoi && <span style={{ color: 'var(--fg-subtle)' }}> — {livre.pourquoi}</span>}
        </div>
      </div>
      <button onClick={onStart}
        className="text-xs px-3 py-1.5 rounded-full transition-colors"
        style={{ background: 'var(--terra-soft)', color: 'var(--terra-deep)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', opacity: hover ? 1 : 0.7 }}>
        ▶ Lire
      </button>
      <button onClick={onRemove}
        className="transition-colors"
        style={{ color: 'var(--fg-subtle)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: hover ? 1 : 0.4 }}>
        ×
      </button>
    </div>
  )
}

// ─── En cours Section ─────────────────────────────────────────────────────────

interface EnCoursSectionProps { onFinish: () => void; onEdit: () => void; onStartNew: () => void }

function EnCoursSection({ onFinish, onEdit, onStartNew }: EnCoursSectionProps) {
  const livreEnCours       = useBookStore((s) => s.livreEnCours)
  const updateLivreEnCours = useBookStore((s) => s.updateLivreEnCours)
  const clearLivreEnCours  = useBookStore((s) => s.clearLivreEnCours)

  if (!livreEnCours) return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader label="En cours de lecture" caption="Aucune lecture en cours" />
      <div style={{ background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12, padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--fg-muted)', margin: 0 }}>
          Lance une lecture pour noter tes impressions en temps réel.
        </p>
        <button onClick={onStartNew}
          className="px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap"
          style={{ background: 'var(--terra)', color: 'var(--paper-1)', border: 'none', cursor: 'pointer' }}>
          Commencer un livre
        </button>
      </div>
    </section>
  )

  const { titre, auteur, couverture, pageActuelle, pagesTotal, impressions, dateDebut } = livreEnCours
  const progress = pageActuelle && pagesTotal && pagesTotal > 0 ? Math.round((pageActuelle / pagesTotal) * 100) : null

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader label="En cours de lecture" caption={`Commencé le ${fmtDate(dateDebut)}`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 28, background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12, padding: 24 }}>
        <CoverDisplay src={couverture} title={titre} author={auteur} width={120} height={180} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--terra)', display: 'inline-block' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--terra)' }}>En lecture</span>
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, color: 'var(--fg)', margin: 0, lineHeight: 1.1 }}>{titre}</h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--fg-muted)', marginTop: 4 }}>{auteur}</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={onEdit} className="px-3 py-1 text-xs rounded-lg transition-colors"
                style={{ color: 'var(--fg-muted)', background: 'var(--paper-2)', border: '1px solid var(--border)', cursor: 'pointer' }}>Modifier</button>
              <button onClick={onFinish} className="px-3 py-1 text-xs rounded-full font-medium transition-colors"
                style={{ background: 'var(--terra)', color: 'var(--paper-1)', border: 'none', cursor: 'pointer' }}>Critique →</button>
              <button onClick={() => { if (window.confirm('Arrêter sans critique ?')) clearLivreEnCours() }}
                className="px-3 py-1 text-xs rounded-lg transition-colors"
                style={{ color: 'var(--fg-subtle)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Arrêter</button>
            </div>
          </div>

          {pagesTotal && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  Page {pageActuelle ?? 0} / {pagesTotal}
                </span>
                {progress !== null && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--terra)', fontVariantNumeric: 'tabular-nums' }}>{progress}% lu</span>}
              </div>
              {progress !== null && <ProgressBar value={progress} max={100} />}
            </div>
          )}

          <textarea
            value={impressions}
            onChange={(e) => updateLivreEnCours({ impressions: e.target.value })}
            placeholder="Impressions à chaud — notes libres pendant la lecture…"
            rows={3}
            style={{ width: '100%', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 12px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
          />
        </div>
      </div>
    </section>
  )
}

// ─── Bibliothèque Section ─────────────────────────────────────────────────────

type SortKey = 'note' | 'date' | 'titre' | 'auteur'

const BOOK_CAROUSEL_GAP  = 16
const BOOK_CAROUSEL_COLS = 3
const BOOK_CAROUSEL_ROWS = 2
const BOOK_ARROW_W       = 36

function BibliothequeSection({ onEdit }: { onEdit: (l: BookCritique) => void }) {
  const bibliotheque = useBookStore((s) => s.bibliotheque)
  const genresPerso  = useBookStore((s) => s.genresPerso)
  const allGenres    = [...GENRES_DEFAUT, ...genresPerso]
  const [sort,          setSort]          = useState<SortKey>('date')
  const [filterGenre,   setFilterGenre]   = useState('')
  const [filterType,    setFilterType]    = useState<BookType | ''>('')
  const [filterNoteMin, setFilterNoteMin] = useState(0)
  const [search,        setSearch]        = useState('')
  const [canPrev,       setCanPrev]       = useState(false)
  const [canNext,       setCanNext]       = useState(false)
  const [colWidth,      setColWidth]      = useState(300)
  const wrapRef   = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const filtered = bibliotheque
    .filter((b) => !filterGenre || b.genres.includes(filterGenre))
    .filter((b) => !filterType  || b.type === filterType)
    .filter((b) => filterNoteMin === 0 || b.note >= filterNoteMin)
    .filter((b) => !search || (b.titre + b.auteur).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'note')   return b.note - a.note
      if (sort === 'titre')  return a.titre.localeCompare(b.titre)
      if (sort === 'auteur') return a.auteur.localeCompare(b.auteur)
      return b.dateLecture.localeCompare(a.dateLecture)
    })

  const measure = () => {
    if (!wrapRef.current) return
    const availW = wrapRef.current.clientWidth - (BOOK_ARROW_W + 8) * 2
    setColWidth(Math.floor((availW - (BOOK_CAROUSEL_COLS - 1) * BOOK_CAROUSEL_GAP) / BOOK_CAROUSEL_COLS))
  }

  const updateArrows = () => {
    const el = scrollRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => { updateArrows() }, [filtered.length, colWidth])

  const pageWidth = BOOK_CAROUSEL_COLS * colWidth + (BOOK_CAROUSEL_COLS - 1) * BOOK_CAROUSEL_GAP

  const scrollByPage = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * (pageWidth + BOOK_CAROUSEL_GAP), behavior: 'smooth' })
  }

  const arrowBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: BOOK_ARROW_W, height: BOOK_ARROW_W, borderRadius: '50%',
    border: '1px solid var(--paper-2)',
    background: 'var(--paper-1)', color: 'var(--ink)',
    cursor: 'pointer', flexShrink: 0,
    fontFamily: 'var(--font-sans)', fontSize: 16,
    transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)',
  }

  const selectCls = 'rounded-[var(--r-md)] px-3 py-1.5 text-xs outline-none transition-colors bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--fg-muted)]'

  return (
    <section style={{ marginTop: 56, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader label="Bibliothèque" caption={`Ta collection`}
        right={<span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--fg-muted)' }}>→ {bibliotheque.length} lecture{bibliotheque.length > 1 ? 's' : ''}</span>} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…"
          className="rounded-[var(--r-md)] px-3 py-1.5 text-xs outline-none transition-colors bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--fg)] focus:border-[var(--terra)] placeholder:text-[var(--fg-subtle)]"
          style={{ width: 160 }} />
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selectCls}>
          <option value="date">Date de lecture</option>
          <option value="note">Note</option>
          <option value="titre">Titre</option>
          <option value="auteur">Auteur</option>
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value as BookType | '')} className={selectCls}>
          <option value="">Tous types</option>
          <option value="fiction">Fiction</option>
          <option value="non-fiction">Non-fiction</option>
        </select>
        <select value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)} className={selectCls}>
          <option value="">Tous genres</option>
          {allGenres.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filterNoteMin} onChange={(e) => setFilterNoteMin(Number(e.target.value))} className={selectCls}>
          <option value={0}>Toutes notes</option>
          {[7, 8, 9].map((n) => <option key={n} value={n}>≥ {n}/10</option>)}
        </select>
      </div>

      {bibliotheque.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--fg-muted)', border: '1px dashed var(--ink-4)', borderRadius: 12 }}>
          Aucun livre critiqué pour l'instant — commence par ajouter un livre lu.
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--fg-subtle)', fontSize: 14, fontStyle: 'italic' }}>Aucun livre ne correspond aux filtres.</p>
      ) : (
        <div ref={wrapRef} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => scrollByPage(-1)}
            disabled={!canPrev}
            style={{ ...arrowBtnStyle, opacity: canPrev ? 1 : 0.3, pointerEvents: canPrev ? 'auto' : 'none' }}
          >←</button>

          <style>{`.book-carousel::-webkit-scrollbar { display: none }`}</style>
          <div
            ref={scrollRef}
            onScroll={updateArrows}
            className="book-carousel"
            style={{
              flex: 1, overflowX: 'auto', overflowY: 'hidden',
              display: 'grid',
              gridTemplateRows: `repeat(${BOOK_CAROUSEL_ROWS}, auto)`,
              gridAutoFlow: 'column',
              gridAutoColumns: colWidth,
              gap: BOOK_CAROUSEL_GAP,
              scrollbarWidth: 'none',
            }}
          >
            {filtered.map((livre) => (
              <BookCard key={livre.id} livre={livre} onEdit={() => onEdit(livre)} />
            ))}
          </div>

          <button
            onClick={() => scrollByPage(1)}
            disabled={!canNext}
            style={{ ...arrowBtnStyle, opacity: canNext ? 1 : 0.3, pointerEvents: canNext ? 'auto' : 'none' }}
          >→</button>
        </div>
      )}
    </section>
  )
}

// ─── Panthéon Section ─────────────────────────────────────────────────────────

function PantheonSection({ onEdit }: { onEdit: (l: BookCritique) => void }) {
  const bibliotheque = useBookStore((s) => s.bibliotheque)
  const scrollRef    = useRef<HTMLDivElement>(null)
  const pantheon     = bibliotheque.filter((b) => b.note >= 9).sort((a, b) => b.note - a.note || a.titre.localeCompare(b.titre))

  if (pantheon.length === 0) return null

  const scrollBy = (dx: number) => scrollRef.current?.scrollBy({ left: dx, behavior: 'smooth' })

  return (
    <section style={{ marginTop: 72, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <SectionHeader label="Panthéon" caption="Tes classiques"
        right={
          <div style={{ display: 'flex', gap: 4 }}>
            {[{ dx: -360, icon: '‹' }, { dx: 360, icon: '›' }].map(({ dx, icon }) => (
              <button key={dx} onClick={() => scrollBy(dx)}
                style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--paper-2)', background: 'var(--paper-1)', color: 'var(--fg-muted)', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 18 }}>
                {icon}
              </button>
            ))}
          </div>
        }
      />
      <div ref={scrollRef} style={{ display: 'flex', gap: 18, overflowX: 'auto', padding: '8px 4px 20px', scrollbarWidth: 'thin', scrollbarColor: 'var(--paper-3) transparent', maskImage: 'linear-gradient(to right, transparent, black 24px, black calc(100% - 60px), transparent)' }}>
        {pantheon.map((livre) => (
          <button key={livre.id} onClick={() => onEdit(livre)}
            style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, width: 132, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
            <div style={{ position: 'relative' }}>
              <CoverDisplay src={livre.couverture} title={livre.titre} author={livre.auteur} width={132} height={198} />
              <div style={{ position: 'absolute', bottom: -8, right: -8, width: 36, height: 36, borderRadius: 999, background: 'var(--ink)', color: 'var(--paper-1)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, boxShadow: '0 6px 20px -8px rgba(58,46,34,0.35)', border: '2px solid var(--paper-1)' }}>
                {livre.note}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, lineHeight: 1.2, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{livre.titre}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {livre.auteur}{livre.anneePublication && <span style={{ color: 'var(--fg-subtle)' }}> · {livre.anneePublication}</span>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

// ─── File d'attente Section ───────────────────────────────────────────────────

function FileAttenteSection({ onAddNew }: { onAddNew: () => void }) {
  const fileAttente    = useBookStore((s) => s.fileAttente)
  const removeFromFile = useBookStore((s) => s.removeFromFile)
  const startReading   = useBookStore((s) => s.startReading)
  const livreEnCours   = useBookStore((s) => s.livreEnCours)

  return (
    <section style={{ marginTop: 72, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader label="File d'attente" caption={`${fileAttente.length} livre${fileAttente.length > 1 ? 's' : ''} patienten${fileAttente.length > 1 ? 't' : 't'}`}
        right={
          <button onClick={onAddNew} className="px-4 py-1.5 text-sm font-medium rounded-full"
            style={{ background: 'var(--terra)', color: 'var(--paper-1)', border: 'none', cursor: 'pointer' }}>
            + Ajouter
          </button>
        }
      />
      {fileAttente.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--fg-muted)', border: '1px dashed var(--ink-4)', borderRadius: 12 }}>
          Ta pile à lire est vide.
        </div>
      ) : (
        <div style={{ background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12, overflow: 'hidden' }}>
          {fileAttente.map((livre, i) => (
            <QueueRow key={livre.id} livre={livre} index={i + 1} isLast={i === fileAttente.length - 1}
              onStart={() => {
                if (livreEnCours && !window.confirm('Tu as déjà un livre en cours. Démarrer quand même ?')) return
                startReading(livre.id)
              }}
              onRemove={() => removeFromFile(livre.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Stats Section ────────────────────────────────────────────────────────────

function StatsSection() {
  const bibliotheque = useBookStore((s) => s.bibliotheque)
  const year = getCurrentYear()
  const thisYear = bibliotheque.filter((b) => b.dateLecture?.startsWith(String(year)))
  if (thisYear.length === 0) return null

  const fiction    = thisYear.filter((b) => b.type === 'fiction').length
  const nonfiction = thisYear.filter((b) => b.type === 'non-fiction').length
  const moyNote    = (thisYear.reduce((s, b) => s + b.note, 0) / thisYear.length).toFixed(1).replace('.', ',')
  const auteurCount: Record<string, number> = {}
  thisYear.forEach((b) => { auteurCount[b.auteur] = (auteurCount[b.auteur] ?? 0) + 1 })
  const topAuteur = Object.entries(auteurCount).sort((a, b) => b[1] - a[1])[0]

  const kpis = [
    { label: 'Livres lus', value: String(thisYear.length), mono: true, accent: true },
    { label: 'Fiction', value: String(fiction), mono: true },
    { label: 'Non-fiction', value: String(nonfiction), mono: true },
    { label: 'Note moyenne', value: moyNote, mono: true },
    ...(topAuteur && topAuteur[1] > 1 ? [{ label: 'Auteur le + lu', value: topAuteur[0], mono: false }] : []),
  ]

  return (
    <section style={{ marginTop: 72, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader label={`Statistiques ${year}`} caption="Ce que dit ton année" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--paper-2)', border: '1px solid var(--paper-2)', borderRadius: 12, overflow: 'hidden' }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ background: 'var(--paper-1)', padding: '20px 22px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-subtle)', display: 'block', marginBottom: 8 }}>{k.label}</span>
            <div style={{ fontFamily: k.mono ? 'var(--font-serif)' : 'var(--font-serif)', fontSize: k.mono ? 40 : 20, fontWeight: 500, color: k.accent ? 'var(--terra)' : 'var(--fg)', lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── BooksPage ────────────────────────────────────────────────────────────────

export function BooksPage() {
  const bibliotheque   = useBookStore((s) => s.bibliotheque)
  const objectifAnnuel = useBookStore((s) => s.objectifAnnuel)
  const livreEnCours   = useBookStore((s) => s.livreEnCours)
  const _hasHydrated   = useBookStore((s) => s._hasHydrated)

  const year          = getCurrentYear()
  const livresAnnee   = bibliotheque.filter((b) => b.dateLecture?.startsWith(String(year))).length
  const weeksElapsed  = getWeeksElapsed()
  const weeklyRate    = livresAnnee / weeksElapsed
  const projected     = Math.round(weeklyRate * 52)
  const pct           = Math.round(Math.min(100, (livresAnnee / objectifAnnuel) * 100))

  const [critiqueModal, setCritiqueModal] = useState<{ open: boolean; livre?: BookCritique | null; fromFile?: BookAttente | null }>({ open: false })
  const [fileModal,     setFileModal]     = useState(false)
  const [enCoursModal,  setEnCoursModal]  = useState(false)

  if (!_hasHydrated) return (
    <div className="flex h-full items-center justify-center">
      <div className="flex gap-2">
        {[0,1,2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: 'var(--terra)', animationDelay: `${i * 120}ms` }} />)}
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--paper)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 48px 80px', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32, borderBottom: '1px solid var(--paper-2)', marginBottom: 56 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                livres · bibliothèque
              </span>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 52, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.015em', margin: '6px 0 12px', lineHeight: 1.05 }}>
                Livres<span style={{ color: 'var(--terra)' }}>.</span>
              </h1>
              <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 19, color: 'var(--fg-muted)', margin: 0, maxWidth: '52ch', lineHeight: 1.4 }}>
                Ce que tu lis, ce que tu as aimé, ce qui attend. {year} — une année que tu écris page après page.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 12, flexShrink: 0 }}>
              <button onClick={() => setFileModal(true)}
                className="px-4 py-2 text-sm transition-colors"
                style={{ background: 'transparent', color: 'var(--fg)', border: '1px solid var(--ink-4)', borderRadius: 8, cursor: 'pointer' }}>
                File d'attente
              </button>
              <button onClick={() => setCritiqueModal({ open: true, livre: null })}
                className="px-4 py-2 text-sm font-medium rounded-full transition-colors"
                style={{ background: 'var(--terra)', color: 'var(--paper-1)', border: 'none', cursor: 'pointer' }}>
                + Livre lu
              </button>
            </div>
          </div>

          {/* Objectif annuel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center', background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Objectif {year}</span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--fg)', letterSpacing: '-0.01em' }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)', fontSize: 22 }}>{livresAnnee}</span>
                    <span style={{ color: 'var(--fg-subtle)' }}> / </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)', fontSize: 22, color: 'var(--fg-muted)' }}>{objectifAnnuel}</span>
                    <span style={{ color: 'var(--fg-subtle)', fontStyle: 'italic', fontSize: 16 }}> livres</span>
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-muted)', letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
              </div>
              <ProgressBar value={livresAnnee} max={objectifAnnuel} height={8} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-subtle)', letterSpacing: '0.06em' }}>
                {['JAN','FÉV','MAR','AVR','MAI','JUI','JUI','AOÛ','SEP','OCT','NOV','DÉC'].map((m) => <span key={m}>{m}</span>)}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, paddingLeft: 24, borderLeft: '1px solid var(--paper-2)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>au rythme actuel</span>
              {livresAnnee > 0 ? (
                <>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{projected}</span>
                    <span style={{ color: 'var(--fg-subtle)', fontStyle: 'italic', fontSize: 14 }}> livres en {year}</span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontStyle: 'italic', color: projected >= objectifAnnuel ? 'var(--sage-deep)' : 'var(--terra)' }}>
                    {projected >= objectifAnnuel ? '→ objectif atteignable.' : '→ il faut accélérer un peu.'}
                  </span>
                </>
              ) : (
                <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--fg-muted)' }}>Aucune lecture cette année.</span>
              )}
            </div>
          </div>
        </header>

        {/* ── En cours ────────────────────────────────────────────────────── */}
        <EnCoursSection
          onFinish={() => setCritiqueModal({ open: true, livre: null })}
          onEdit={() => setEnCoursModal(true)}
          onStartNew={() => setEnCoursModal(true)}
        />

        {/* ── Bibliothèque ─────────────────────────────────────────────────── */}
        <BibliothequeSection onEdit={(livre) => setCritiqueModal({ open: true, livre })} />

        {/* ── Panthéon ─────────────────────────────────────────────────────── */}
        <PantheonSection onEdit={(livre) => setCritiqueModal({ open: true, livre })} />

        {/* ── File d'attente ───────────────────────────────────────────────── */}
        <FileAttenteSection onAddNew={() => setFileModal(true)} />

        {/* ── Stats ────────────────────────────────────────────────────────── */}
        <StatsSection />

        {/* Footer */}
        <footer style={{ marginTop: 72, paddingTop: 24, borderTop: '1px solid var(--paper-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
          <span>aetheris · livres · {bibliotheque.length} critique{bibliotheque.length > 1 ? 's' : ''}</span>
          <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-serif)', textTransform: 'none', letterSpacing: 0, color: 'var(--ink-2)', fontSize: 14 }}>
            « lire, c'est élargir le territoire de l'attention. »
          </span>
        </footer>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {critiqueModal.open && (
        <CritiqueModal initial={critiqueModal.livre} fromFile={critiqueModal.fromFile} onClose={() => setCritiqueModal({ open: false })} />
      )}
      {fileModal && <FileModal onClose={() => setFileModal(false)} />}
      {enCoursModal && <EnCoursModal onClose={() => setEnCoursModal(false)} />}

      {/* Badge livre en cours (coin bas droit) */}
      {livreEnCours && (
        <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, background: 'var(--bg-elev)', border: '1px solid var(--border)', boxShadow: '0 6px 20px -8px rgba(58,46,34,0.25)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--terra)', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 13, color: 'var(--fg-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{livreEnCours.titre}</span>
          </div>
        </div>
      )}
    </div>
  )
}
