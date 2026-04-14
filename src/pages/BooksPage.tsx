import { useState, useRef } from 'react'
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

function noteColor(note: number) {
  if (note >= 9) return 'text-amber-400'
  if (note >= 7) return 'text-emerald-400'
  if (note >= 5) return 'text-zinc-300'
  return 'text-zinc-500'
}


function fmtDate(iso: string | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getCurrentYear() {
  return new Date().getFullYear()
}

function getWeeksElapsed(): number {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const ms = now.getTime() - startOfYear.getTime()
  return Math.max(1, ms / (7 * 24 * 60 * 60 * 1000))
}

function compressImage(file: File, maxSize = 300): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > height && width > maxSize) {
          height = Math.round(height * maxSize / width)
          width = maxSize
        } else if (height > maxSize) {
          width = Math.round(width * maxSize / height)
          height = maxSize
        }
        canvas.width  = width
        canvas.height = height
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CouvertureImg({ src, alt, size = 52 }: { src: string; alt: string; size?: number }) {
  if (!src) return (
    <div
      className="shrink-0 rounded bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-zinc-600 font-serif select-none"
      style={{ width: size, height: Math.round(size * 1.5) }}
    >
      <span style={{ fontSize: Math.round(size * 0.35) }}>◉</span>
    </div>
  )
  return (
    <img
      src={src} alt={alt}
      className="shrink-0 rounded object-cover border border-zinc-700/50"
      style={{ width: size, height: Math.round(size * 1.5) }}
    />
  )
}


// ─── Book Card (grille) ───────────────────────────────────────────────────────

interface BookCardProps {
  livre:  BookCritique
  onEdit: () => void
}

function BookCard({ livre, onEdit }: BookCardProps) {
  return (
    <div
      className="bg-zinc-900 border border-zinc-800/40 rounded-xl overflow-hidden flex flex-col cursor-pointer group shadow-sm hover:border-zinc-700/60 transition-all"
      onClick={onEdit}
    >
      {/* Couverture */}
      <div className="relative w-full aspect-[2/3] overflow-hidden">
        {livre.couverture ? (
          <img
            src={livre.couverture}
            alt={livre.titre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600 text-4xl font-serif select-none">
            ◉
          </div>
        )}
        {/* Badge type */}
        <span className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-medium backdrop-blur-sm border ${
          livre.type === 'fiction'
            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
            : 'bg-sky-500/20 border-sky-500/30 text-sky-300'
        }`}>
          {livre.type === 'fiction' ? 'Fiction' : 'Non-fic.'}
        </span>
        {/* Badge note */}
        <span className={`absolute top-2 right-2 text-xs font-bold tabular-nums bg-zinc-900/85 backdrop-blur-sm px-1.5 py-0.5 rounded font-serif ${noteColor(livre.note)}`}>
          {livre.note % 1 === 0 ? livre.note : livre.note.toFixed(1)}/10
        </span>
        {/* Overlay critique au survol */}
        {livre.critique && (
          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
            <p className="text-[10px] text-zinc-200 font-serif italic line-clamp-5 leading-relaxed">
              {livre.critique}
            </p>
          </div>
        )}
        {/* Badge référence roman */}
        {livre.referenceRoman && (
          <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[9px] bg-violet-500/20 border border-violet-500/30 text-violet-300 backdrop-blur-sm">
            réf. roman
          </span>
        )}
      </div>

      {/* Corps */}
      <div className="flex flex-col gap-1 p-2.5 flex-1">
        <h3 className="text-xs font-semibold text-zinc-100 line-clamp-2 font-serif leading-snug">{livre.titre}</h3>
        <p className="text-[10px] text-zinc-500 truncate">{livre.auteur}{livre.anneePublication ? ` · ${livre.anneePublication}` : ''}</p>
        {livre.troismots.length > 0 && (
          <p className="text-[9px] text-zinc-500 italic font-serif truncate">
            {livre.troismots.join(' · ')}
          </p>
        )}
        {livre.genres.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-0.5">
            {livre.genres.slice(0, 2).map((g) => (
              <span key={g} className="px-1 py-0.5 rounded text-[9px] bg-zinc-800 text-zinc-500 border border-zinc-700/40">{g}</span>
            ))}
          </div>
        )}
        <div className="flex-1" />
        <p className="text-[9px] text-zinc-700 mt-1">{fmtDate(livre.dateLecture)}</p>
      </div>
    </div>
  )
}

// ─── Waitlist Card (grille) ───────────────────────────────────────────────────

interface WaitlistCardProps {
  livre:     BookAttente
  onStart:   () => void
  onRemove:  () => void
}

function WaitlistCard({ livre, onStart, onRemove }: WaitlistCardProps) {
  const sourceCls: Record<BookSource, string> = {
    recommandation:    'bg-zinc-700/50 border-zinc-600/30 text-zinc-400',
    'prix-litteraire': 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    recherche:         'bg-zinc-700/50 border-zinc-600/30 text-zinc-400',
    'reference-roman': 'bg-violet-500/10 border-violet-500/20 text-violet-400',
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800/40 rounded-xl overflow-hidden flex flex-col shadow-sm hover:border-zinc-700/60 transition-all">
      {/* Couverture placeholder */}
      <div className="relative w-full aspect-[2/3] bg-zinc-800/80 flex items-center justify-center text-zinc-700 text-4xl font-serif select-none">
        ◉
        {/* Source badge */}
        <span className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] border ${sourceCls[livre.source]}`}>
          {SOURCE_LABELS[livre.source]}
        </span>
      </div>

      {/* Corps */}
      <div className="flex flex-col gap-1 p-2.5 flex-1">
        <h3 className="text-xs font-semibold text-zinc-100 line-clamp-2 font-serif leading-snug">{livre.titre}</h3>
        {livre.auteur && <p className="text-[10px] text-zinc-500 truncate">{livre.auteur}</p>}
        {livre.pourquoi && (
          <p className="text-[10px] text-zinc-600 italic line-clamp-2">{livre.pourquoi}</p>
        )}
        <div className="flex-1" />
        <div className="flex gap-1.5 mt-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onStart() }}
            className="flex-1 text-[10px] py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-emerald-500/15 hover:text-emerald-400 border border-zinc-700/50 transition-colors"
          >
            ▶ Lire
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="px-2.5 py-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors text-xs"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Image Drop Zone ──────────────────────────────────────────────────────────

interface ImageDropZoneProps {
  value: string
  onChange: (url: string) => void
  height?: number
}

function ImageDropZone({ value, onChange, height = 120 }: ImageDropZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    const url = await compressImage(file)
    onChange(url)
  }

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer overflow-hidden ${
        dragOver ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-zinc-700/60 hover:border-zinc-600'
      }`}
      style={{ height }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={async (e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
      }}
      onClick={() => inputRef.current?.click()}
    >
      {value ? (
        <div className="flex h-full items-center justify-center gap-3">
          <img src={value} alt="" className="h-full w-auto max-w-[40%] object-cover rounded" />
          <span className="text-xs text-zinc-500">Cliquer pour changer</span>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-1">
          <span className="text-zinc-600 text-lg">↑</span>
          <span className="text-xs text-zinc-600">Couverture — glisser ou cliquer</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}

// ─── Genre Picker ─────────────────────────────────────────────────────────────

interface GenrePickerProps {
  selected:  string[]
  allGenres: string[]
  onChange:  (genres: string[]) => void
  onCreateGenre: (genre: string) => void
}

function GenrePicker({ selected, allGenres, onChange, onCreateGenre }: GenrePickerProps) {
  const [input, setInput] = useState('')

  function toggle(genre: string) {
    if (selected.includes(genre)) {
      onChange(selected.filter((g) => g !== genre))
    } else {
      onChange([...selected, genre])
    }
  }

  function create() {
    const g = input.trim()
    if (!g || allGenres.includes(g)) return
    onCreateGenre(g)
    onChange([...selected, g])
    setInput('')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {allGenres.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => toggle(g)}
            className={`px-2 py-0.5 rounded text-xs border transition-colors ${
              selected.includes(g)
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-800 border-zinc-700/50 text-zinc-500 hover:border-zinc-600'
            }`}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); create() } }}
          placeholder="Nouveau genre…"
          className="flex-1 bg-zinc-800 border border-zinc-700/60 rounded px-2 py-1 text-xs text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
        />
        <button
          type="button"
          onClick={create}
          disabled={!input.trim()}
          className="px-2 py-1 text-xs rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600 disabled:opacity-40 transition-colors"
        >
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

  const prefill = initial ?? livreEnCours ?? fromFile ?? {}

  const [titre,     setTitre]     = useState(prefill.titre ?? '')
  const [auteur,    setAuteur]    = useState((prefill as BookCritique).auteur ?? (prefill as BookEnCours)?.auteur ?? '')
  const [annee,     setAnnee]     = useState((initial as BookCritique)?.anneePublication ?? '')
  const [couv,      setCouv]      = useState((initial as BookCritique)?.couverture ?? (livreEnCours?.couverture) ?? '')
  const [note,      setNote]      = useState<number>((initial as BookCritique)?.note ?? 7)
  const [genres,    setGenres]    = useState<string[]>((initial as BookCritique)?.genres ?? [])
  const [troismots, setTroismots] = useState<string[]>((initial as BookCritique)?.troismots ?? ['', '', ''])
  const [critique,  setCritique]  = useState((initial as BookCritique)?.critique ?? '')
  const [citation,  setCitation]  = useState((initial as BookCritique)?.citationFavorite ?? '')
  const [type,      setType]      = useState<BookType>((initial as BookCritique)?.type ?? 'fiction')
  const [dateLect,  setDateLect]  = useState((initial as BookCritique)?.dateLecture ?? new Date().toISOString().split('T')[0])
  const [refRoman,  setRefRoman]  = useState((initial as BookCritique)?.referenceRoman ?? false)

  const canSave = titre.trim() !== '' && auteur.trim() !== ''

  function handleSave() {
    if (!canSave) return
    const data: Omit<BookCritique, 'id'> = {
      titre:            titre.trim(),
      auteur:           auteur.trim(),
      anneePublication: annee.trim(),
      couverture:       couv,
      note,
      genres,
      troismots:        troismots.map((m) => m.trim()).filter(Boolean),
      critique:         critique.trim(),
      citationFavorite: citation.trim(),
      type,
      dateLecture:      dateLect,
      referenceRoman:   refRoman,
    }
    if (isEdit && initial?.id) {
      updateCritique(initial.id, data)
    } else {
      addCritique(data)
      // Vider "en cours" si c'était ce livre
      if (livreEnCours) clearEnCours()
    }
    onClose()
  }

  function handleDelete() {
    if (!initial?.id) return
    if (!window.confirm('Supprimer ce livre de la bibliothèque ?')) return
    deleteCritique(initial.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-900 border border-zinc-800/60 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 bg-zinc-900 rounded-t-2xl">
          <h2 className="text-sm font-semibold text-zinc-100 font-serif">
            {isEdit ? 'Modifier la critique' : 'Ajouter un livre lu'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors text-lg leading-none">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Couverture */}
          <ImageDropZone value={couv} onChange={setCouv} height={110} />

          {/* Titre + Auteur */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 uppercase tracking-wide">Titre *</label>
              <input
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Titre du livre"
                className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 font-serif"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 uppercase tracking-wide">Auteur *</label>
              <input
                value={auteur}
                onChange={(e) => setAuteur(e.target.value)}
                placeholder="Nom de l'auteur"
                className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Année + Type + Date de lecture */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 uppercase tracking-wide">Année publi.</label>
              <input
                value={annee}
                onChange={(e) => setAnnee(e.target.value)}
                placeholder="2003"
                className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 uppercase tracking-wide">Type</label>
              <div className="flex gap-1">
                {(['fiction', 'non-fiction'] as BookType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                      type === t
                        ? t === 'fiction'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                        : 'bg-zinc-800 border-zinc-700/50 text-zinc-500 hover:border-zinc-600'
                    }`}
                  >
                    {t === 'fiction' ? 'Fiction' : 'Non-fic.'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 uppercase tracking-wide">Date de lecture</label>
              <input
                type="date"
                value={dateLect}
                onChange={(e) => setDateLect(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-zinc-500 uppercase tracking-wide">Note</label>
              <span className={`text-2xl font-bold tabular-nums font-serif ${noteColor(note)}`}>
                {note % 1 === 0 ? note : note.toFixed(1)}<span className="text-sm font-normal text-zinc-600">/10</span>
              </span>
            </div>
            <input
              type="range" min={1} max={10} step={0.5}
              value={note}
              onChange={(e) => setNote(parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-700 font-mono">
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>
          </div>

          {/* Genres */}
          <div className="space-y-2">
            <label className="text-[11px] text-zinc-500 uppercase tracking-wide">Genres</label>
            <GenrePicker
              selected={genres}
              allGenres={allGenres}
              onChange={setGenres}
              onCreateGenre={addGenrePerso}
            />
          </div>

          {/* 3 mots */}
          <div className="space-y-2">
            <label className="text-[11px] text-zinc-500 uppercase tracking-wide">3 mots qui définissent ce livre</label>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <input
                  key={i}
                  value={troismots[i] ?? ''}
                  onChange={(e) => {
                    const next = [...troismots]
                    next[i] = e.target.value
                    setTroismots(next)
                  }}
                  placeholder={['Premier', 'Deuxième', 'Troisième'][i]}
                  className="bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 font-serif italic"
                />
              ))}
            </div>
          </div>

          {/* Critique */}
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-500 uppercase tracking-wide">Critique</label>
            <textarea
              value={critique}
              onChange={(e) => setCritique(e.target.value)}
              placeholder="Ta critique, sans longueur imposée…"
              rows={5}
              className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 resize-none leading-relaxed font-serif"
            />
          </div>

          {/* Citation */}
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-500 uppercase tracking-wide">Citation favorite</label>
            <textarea
              value={citation}
              onChange={(e) => setCitation(e.target.value)}
              placeholder="La phrase qui t'a marqué…"
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 resize-none leading-relaxed font-serif italic"
            />
          </div>

          {/* Référence roman */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              onClick={() => setRefRoman(!refRoman)}
              className={`relative h-4 w-7 rounded-full transition-colors ${refRoman ? 'bg-emerald-500' : 'bg-zinc-700'}`}
            >
              <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${refRoman ? 'translate-x-3' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
              Référence roman — alimente ta bibliothèque d'écriture
            </span>
          </label>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between px-6 py-4 border-t border-zinc-800/60 bg-zinc-900 rounded-b-2xl">
          {isEdit ? (
            <button
              onClick={handleDelete}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Supprimer
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isEdit ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── File Modal ───────────────────────────────────────────────────────────────

interface FileModalProps {
  onClose: () => void
}

function FileModal({ onClose }: FileModalProps) {
  const addFileAttente = useBookStore((s) => s.addFileAttente)

  const [titre,   setTitre]   = useState('')
  const [auteur,  setAuteur]  = useState('')
  const [source,  setSource]  = useState<BookSource>('recommandation')
  const [pourquoi, setPourquoi] = useState('')

  const canSave = titre.trim() !== ''

  function handleSave() {
    if (!canSave) return
    addFileAttente({ titre: titre.trim(), auteur: auteur.trim(), source, pourquoi: pourquoi.trim() })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800/60 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
          <h2 className="text-sm font-semibold text-zinc-100 font-serif">Ajouter à la file</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-500 uppercase tracking-wide">Titre *</label>
            <input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Titre du livre"
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 font-serif"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-500 uppercase tracking-wide">Auteur</label>
            <input
              value={auteur}
              onChange={(e) => setAuteur(e.target.value)}
              placeholder="Nom de l'auteur"
              className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-500 uppercase tracking-wide">Source</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(SOURCE_LABELS) as [BookSource, string][]).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSource(k)}
                  className={`py-1.5 px-2 text-xs rounded-lg border transition-colors text-left ${
                    source === k
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-zinc-800 border-zinc-700/50 text-zinc-500 hover:border-zinc-600'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-500 uppercase tracking-wide">Pourquoi ce livre</label>
            <input
              value={pourquoi}
              onChange={(e) => setPourquoi(e.target.value)}
              placeholder="Une ligne de contexte…"
              className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-800/60">
          <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors font-medium"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── En Cours Modal ───────────────────────────────────────────────────────────

interface EnCoursModalProps {
  onClose: () => void
}

function EnCoursModal({ onClose }: EnCoursModalProps) {
  const livreEnCours      = useBookStore((s) => s.livreEnCours)
  const setLivreEnCours   = useBookStore((s) => s.setLivreEnCours)
  const updateLivreEnCours = useBookStore((s) => s.updateLivreEnCours)

  const isEdit = !!livreEnCours

  const [titre,    setTitre]    = useState(livreEnCours?.titre ?? '')
  const [auteur,   setAuteur]   = useState(livreEnCours?.auteur ?? '')
  const [couv,     setCouv]     = useState(livreEnCours?.couverture ?? '')
  const [pageAct,  setPageAct]  = useState<string>(livreEnCours?.pageActuelle?.toString() ?? '')
  const [pagesTot, setPagesTot] = useState<string>(livreEnCours?.pagesTotal?.toString() ?? '')

  const canSave = titre.trim() !== ''

  function handleSave() {
    if (!canSave) return
    const data = {
      titre:        titre.trim(),
      auteur:       auteur.trim(),
      couverture:   couv,
      pageActuelle: pageAct ? parseInt(pageAct) : null,
      pagesTotal:   pagesTot ? parseInt(pagesTot) : null,
      impressions:  livreEnCours?.impressions ?? '',
    }
    if (isEdit) {
      updateLivreEnCours(data)
    } else {
      setLivreEnCours(data)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800/60 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
          <h2 className="text-sm font-semibold text-zinc-100 font-serif">
            {isEdit ? 'Modifier la lecture en cours' : 'Démarrer une lecture'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          <ImageDropZone value={couv} onChange={setCouv} height={90} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 uppercase tracking-wide">Titre *</label>
              <input
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Titre"
                className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 font-serif"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 uppercase tracking-wide">Auteur</label>
              <input
                value={auteur}
                onChange={(e) => setAuteur(e.target.value)}
                placeholder="Auteur"
                className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 uppercase tracking-wide">Page actuelle</label>
              <input
                type="number"
                value={pageAct}
                onChange={(e) => setPageAct(e.target.value)}
                placeholder="—"
                className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 uppercase tracking-wide">Pages totales</label>
              <input
                type="number"
                value={pagesTot}
                onChange={(e) => setPagesTot(e.target.value)}
                placeholder="—"
                className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-800/60">
          <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors font-medium"
          >
            {isEdit ? 'Enregistrer' : 'Commencer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── En Cours Section ─────────────────────────────────────────────────────────

interface EnCoursSectionProps {
  onFinish:     () => void
  onEdit:       () => void
  onStartNew:   () => void
}

function EnCoursSection({ onFinish, onEdit, onStartNew }: EnCoursSectionProps) {
  const livreEnCours       = useBookStore((s) => s.livreEnCours)
  const updateLivreEnCours = useBookStore((s) => s.updateLivreEnCours)
  const clearLivreEnCours  = useBookStore((s) => s.clearLivreEnCours)

  if (!livreEnCours) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/40 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">En cours de lecture</h2>
            <p className="text-xs text-zinc-600 mt-0.5">Aucune lecture en cours</p>
          </div>
          <button
            onClick={onStartNew}
            className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-600/25 transition-colors"
          >
            Commencer un livre
          </button>
        </div>
      </div>
    )
  }

  const { titre, auteur, couverture, pageActuelle, pagesTotal, impressions, dateDebut } = livreEnCours
  const progress = (pageActuelle && pagesTotal && pagesTotal > 0)
    ? Math.round((pageActuelle / pagesTotal) * 100)
    : null

  return (
    <div className="bg-zinc-900/50 border border-emerald-500/20 rounded-xl p-5">
      <div className="flex items-start gap-4">
        <CouvertureImg src={couverture} alt={titre} size={56} />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 font-serif leading-snug">{titre}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{auteur}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={onEdit}
                className="px-2 py-1 text-[11px] rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Modifier
              </button>
              <button
                onClick={onFinish}
                className="px-2 py-1 text-[11px] rounded bg-emerald-600/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-600/25 transition-colors"
              >
                Critique →
              </button>
              <button
                onClick={() => { if (window.confirm('Arrêter cette lecture sans critique ?')) clearLivreEnCours() }}
                className="px-2 py-1 text-[11px] rounded text-zinc-600 hover:text-red-400 transition-colors"
              >
                Arrêter
              </button>
            </div>
          </div>

          {/* Progression pages */}
          {pagesTotal && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-600">
                  {pageActuelle ?? 0} / {pagesTotal} pages
                  {progress !== null && <span className="ml-1 text-emerald-500/70">({progress}%)</span>}
                </span>
              </div>
              {progress !== null && (
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500/60 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          )}

          <p className="text-[11px] text-zinc-600">Commencé le {fmtDate(dateDebut)}</p>

          {/* Impressions */}
          <textarea
            value={impressions}
            onChange={(e) => updateLivreEnCours({ impressions: e.target.value })}
            placeholder="Impressions à chaud — notes libres pendant la lecture…"
            rows={2}
            className="w-full mt-1 bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-3 py-2 text-xs text-zinc-400 outline-none placeholder:text-zinc-700 focus:border-emerald-500/40 resize-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Bibliothèque Section ─────────────────────────────────────────────────────

type SortKey = 'note' | 'date' | 'titre' | 'auteur'

interface BibliothequeSectionProps {
  onEdit: (livre: BookCritique) => void
}

function BibliothequeSection({ onEdit }: BibliothequeSectionProps) {
  const bibliotheque = useBookStore((s) => s.bibliotheque)
  const genresPerso  = useBookStore((s) => s.genresPerso)
  const allGenres    = [...GENRES_DEFAUT, ...genresPerso]

  const [sort,          setSort]          = useState<SortKey>('date')
  const [filterGenre,   setFilterGenre]   = useState('')
  const [filterType,    setFilterType]    = useState<BookType | ''>('')
  const [filterNoteMin, setFilterNoteMin] = useState(0)
  const [search,        setSearch]        = useState('')

  const filtered = bibliotheque
    .filter((b) => !filterGenre || b.genres.includes(filterGenre))
    .filter((b) => !filterType  || b.type === filterType)
    .filter((b) => filterNoteMin === 0 || b.note >= filterNoteMin)
    .filter((b) => {
      if (!search) return true
      const q = search.toLowerCase()
      return b.titre.toLowerCase().includes(q) || b.auteur.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sort === 'note') return b.note - a.note
      if (sort === 'titre') return a.titre.localeCompare(b.titre)
      if (sort === 'auteur') return a.auteur.localeCompare(b.auteur)
      return b.dateLecture.localeCompare(a.dateLecture)
    })

  if (bibliotheque.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/40 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-200 mb-1">Bibliothèque</h2>
        <p className="text-xs text-zinc-600">Aucun livre critique pour l'instant — commence par ajouter un livre lu.</p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/40 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Bibliothèque</h2>
          <p className="text-xs text-zinc-600">{bibliotheque.length} livre{bibliotheque.length > 1 ? 's' : ''} critiqué{bibliotheque.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {/* Recherche */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="bg-zinc-800 border border-zinc-700/60 rounded-lg px-2.5 py-1 text-xs text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 w-36"
        />
        {/* Tri */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="bg-zinc-800 border border-zinc-700/60 rounded-lg px-2 py-1 text-xs text-zinc-400 outline-none focus:border-emerald-500/50"
        >
          <option value="date">Date de lecture</option>
          <option value="note">Note</option>
          <option value="titre">Titre</option>
          <option value="auteur">Auteur</option>
        </select>
        {/* Type */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as BookType | '')}
          className="bg-zinc-800 border border-zinc-700/60 rounded-lg px-2 py-1 text-xs text-zinc-400 outline-none focus:border-emerald-500/50"
        >
          <option value="">Tous types</option>
          <option value="fiction">Fiction</option>
          <option value="non-fiction">Non-fiction</option>
        </select>
        {/* Genre */}
        <select
          value={filterGenre}
          onChange={(e) => setFilterGenre(e.target.value)}
          className="bg-zinc-800 border border-zinc-700/60 rounded-lg px-2 py-1 text-xs text-zinc-400 outline-none focus:border-emerald-500/50"
        >
          <option value="">Tous genres</option>
          {allGenres.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        {/* Note min */}
        <select
          value={filterNoteMin}
          onChange={(e) => setFilterNoteMin(Number(e.target.value))}
          className="bg-zinc-800 border border-zinc-700/60 rounded-lg px-2 py-1 text-xs text-zinc-400 outline-none focus:border-emerald-500/50"
        >
          <option value={0}>Toutes notes</option>
          {[7, 8, 9].map((n) => (
            <option key={n} value={n}>≥ {n}/10</option>
          ))}
        </select>
      </div>

      {/* Grille */}
      {filtered.length === 0 ? (
        <p className="text-xs text-zinc-600 py-2">Aucun livre ne correspond aux filtres.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((livre) => (
            <BookCard key={livre.id} livre={livre} onEdit={() => onEdit(livre)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Panthéon Section ─────────────────────────────────────────────────────────

function PantheonSection({ onEdit }: { onEdit: (livre: BookCritique) => void }) {
  const bibliotheque = useBookStore((s) => s.bibliotheque)
  const pantheon = bibliotheque.filter((b) => b.note >= 9)

  if (pantheon.length === 0) return null

  return (
    <div className="bg-zinc-900/50 border border-amber-500/15 rounded-xl p-5 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <span className="text-amber-400">◆</span> Le Panthéon
          <span className="text-xs font-normal text-zinc-600 ml-1">{pantheon.length} livre{pantheon.length > 1 ? 's' : ''}</span>
        </h2>
        <p className="text-xs text-zinc-600 mt-0.5">Les 9-10 / 10 — tes références absolues</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {pantheon.map((livre) => (
          <button
            key={livre.id}
            onClick={() => onEdit(livre)}
            title={`${livre.titre} — ${livre.auteur} (${livre.note}/10)`}
            className="group relative rounded overflow-hidden border border-zinc-700/50 hover:border-amber-500/40 transition-all hover:scale-105"
          >
            <CouvertureImg src={livre.couverture} alt={livre.titre} size={56} />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded" />
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── File d'attente Section ───────────────────────────────────────────────────

interface FileAttenteSectionProps {
  onAddNew: () => void
}

function FileAttenteSection({ onAddNew }: FileAttenteSectionProps) {
  const fileAttente    = useBookStore((s) => s.fileAttente)
  const removeFromFile = useBookStore((s) => s.removeFromFile)
  const startReading   = useBookStore((s) => s.startReading)
  const livreEnCours   = useBookStore((s) => s.livreEnCours)

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/40 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">File d'attente</h2>
          <p className="text-xs text-zinc-600">{fileAttente.length} livre{fileAttente.length !== 1 ? 's' : ''} à lire</p>
        </div>
        <button
          onClick={onAddNew}
          className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-600/25 transition-colors"
        >
          + Ajouter
        </button>
      </div>

      {fileAttente.length === 0 ? (
        <p className="text-xs text-zinc-600 py-1">Ta pile à lire est vide.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {fileAttente.map((livre) => (
            <WaitlistCard
              key={livre.id}
              livre={livre}
              onStart={() => {
                if (livreEnCours && !window.confirm('Tu as déjà un livre en cours. Démarrer quand même ?')) return
                startReading(livre.id)
              }}
              onRemove={() => removeFromFile(livre.id)}
            />
          ))}
        </div>
      )}
    </div>
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
  const moyNote    = thisYear.length > 0
    ? (thisYear.reduce((s, b) => s + b.note, 0) / thisYear.length).toFixed(1)
    : '—'

  // Auteur le plus lu
  const auteurCount: Record<string, number> = {}
  thisYear.forEach((b) => {
    auteurCount[b.auteur] = (auteurCount[b.auteur] ?? 0) + 1
  })
  const topAuteur = Object.entries(auteurCount).sort((a, b) => b[1] - a[1])[0]

  const stats = [
    { label: 'Livres lus', value: thisYear.length },
    { label: 'Fiction', value: fiction },
    { label: 'Non-fiction', value: nonfiction },
    { label: 'Note moyenne', value: moyNote },
    ...(topAuteur && topAuteur[1] > 1 ? [{ label: 'Auteur le + lu', value: topAuteur[0] }] : []),
  ]

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/40 rounded-xl p-5 space-y-3">
      <h2 className="text-sm font-semibold text-zinc-200">Statistiques {year}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-zinc-800/40 rounded-lg p-3">
            <p className="text-xs text-zinc-600">{s.label}</p>
            <p className="text-lg font-bold text-zinc-200 tabular-nums mt-0.5 truncate">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BooksPage() {
  const bibliotheque  = useBookStore((s) => s.bibliotheque)
  const objectifAnnuel = useBookStore((s) => s.objectifAnnuel)
  const livreEnCours  = useBookStore((s) => s.livreEnCours)
  const _hasHydrated  = useBookStore((s) => s._hasHydrated)

  const year = getCurrentYear()
  const livresAnnee = bibliotheque.filter((b) => b.dateLecture?.startsWith(String(year))).length
  const weeksElapsed = getWeeksElapsed()
  const weeklyRate   = livresAnnee / weeksElapsed
  const projected    = Math.round(weeklyRate * 52)

  // Modals state
  const [critiqueModal, setCritiqueModal] = useState<{ open: boolean; livre?: BookCritique | null; fromFile?: BookAttente | null }>({ open: false })
  const [fileModal,     setFileModal]     = useState(false)
  const [enCoursModal,  setEnCoursModal]  = useState(false)

  if (!_hasHydrated) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex gap-2">
          {[0,1,2].map((i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-zinc-950 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            {/* Titre page */}
            <div>
              <h1 className="text-xl font-semibold text-zinc-100 font-serif tracking-tight">Livres</h1>
              <p className="text-xs text-zinc-600 mt-0.5">
                Bibliothèque, critiques et lectures en cours
              </p>
            </div>

            {/* Objectif annuel */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-4xl font-bold tabular-nums font-serif ${
                  livresAnnee >= objectifAnnuel ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {livresAnnee}
                </span>
                <span className="text-lg text-zinc-600 font-serif">/ {objectifAnnuel}</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-zinc-500 font-medium">livres lus en {year}</p>
                {livresAnnee > 0 ? (
                  <p className="text-[11px] text-zinc-600">
                    {projected >= objectifAnnuel
                      ? `À ce rythme, tu atteindras les ${objectifAnnuel} — continue`
                      : `À ce rythme : ${projected} livres en fin d'année`
                    }
                  </p>
                ) : (
                  <p className="text-[11px] text-zinc-600">Aucun livre ajouté cette année pour l'instant</p>
                )}
              </div>
            </div>

            {/* Barre de progression sobre */}
            <div className="w-64 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${livresAnnee >= objectifAnnuel ? 'bg-amber-400' : 'bg-emerald-500/70'}`}
                style={{ width: `${Math.min(100, (livresAnnee / objectifAnnuel) * 100)}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0 flex-col sm:flex-row">
            <button
              onClick={() => setFileModal(true)}
              className="px-3 py-1.5 text-xs rounded-lg border border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              + File d'attente
            </button>
            <button
              onClick={() => setCritiqueModal({ open: true, livre: null })}
              className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition-colors font-medium"
            >
              + Livre lu
            </button>
          </div>
        </div>

        {/* ── En cours ──────────────────────────────────────────────────── */}
        <EnCoursSection
          onFinish={() => setCritiqueModal({ open: true, livre: null })}
          onEdit={() => setEnCoursModal(true)}
          onStartNew={() => setEnCoursModal(true)}
        />

        {/* ── Bibliothèque ──────────────────────────────────────────────── */}
        <BibliothequeSection onEdit={(livre) => setCritiqueModal({ open: true, livre })} />

        {/* ── Panthéon ──────────────────────────────────────────────────── */}
        <PantheonSection onEdit={(livre) => setCritiqueModal({ open: true, livre })} />

        {/* ── File d'attente ────────────────────────────────────────────── */}
        <FileAttenteSection onAddNew={() => setFileModal(true)} />

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <StatsSection />

        {/* Spacer bas de page */}
        <div className="h-8" />
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {critiqueModal.open && (
        <CritiqueModal
          initial={critiqueModal.livre}
          fromFile={critiqueModal.fromFile}
          onClose={() => setCritiqueModal({ open: false })}
        />
      )}
      {fileModal && (
        <FileModal onClose={() => setFileModal(false)} />
      )}
      {enCoursModal && (
        <EnCoursModal onClose={() => setEnCoursModal(false)} />
      )}

      {/* En cours visible → livre en cours affiche aussi le bouton "Démarrer lecture" dans la file */}
      {livreEnCours && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-emerald-500/30 shadow-lg">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-zinc-400 max-w-[160px] truncate font-serif">{livreEnCours.titre}</span>
          </div>
        </div>
      )}
    </div>
  )
}
