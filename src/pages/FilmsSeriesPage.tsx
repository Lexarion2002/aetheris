import { useState, useRef } from 'react'
import { useFilmSerieStore } from '../store/filmSerieStore'
import type { FilmSerie, FilmTag, FilmSerieType, FilmSerieStatus } from '../store/filmSerieStore'

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_TAGS: FilmTag[] = [
  'action', 'comédie', 'drame', 'horreur', 'sci-fi',
  'thriller', 'animation', 'documentaire', 'romance',
  'fantastique', 'biopic', 'crime',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ratingColor(r: number) {
  if (r >= 9) return 'text-amber-400'
  if (r >= 7) return 'text-violet-400'
  if (r >= 5) return 'text-zinc-300'
  return 'text-zinc-500'
}

function fmtDate(iso: string | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function TagPill({ tag }: { tag: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700/50">
      {tag}
    </span>
  )
}

function PosterImg({ src, title }: { src?: string; title: string }) {
  if (!src) {
    return (
      <div className="w-full h-40 bg-zinc-800 border border-zinc-700/50 rounded-lg flex items-center justify-center text-3xl text-zinc-600">
        🎬
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={title}
      className="w-full h-40 object-cover rounded-lg border border-zinc-700/50"
      onError={(e) => {
        const target = e.currentTarget as HTMLImageElement
        target.style.display = 'none'
        const parent = target.parentElement
        if (parent) {
          parent.innerHTML = '<div class="w-full h-40 bg-zinc-800 border border-zinc-700/50 rounded-lg flex items-center justify-center text-3xl text-zinc-600">🎬</div>'
        }
      }}
    />
  )
}

// ─── Add Modal ────────────────────────────────────────────────────────────────

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
    <div className="flex flex-col gap-2">
      <label className="text-xs text-zinc-500 font-medium">Affiche</label>
      <div
        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${dragOver ? 'border-violet-500/60 bg-violet-500/10' : 'border-zinc-700/60 bg-zinc-800/50 hover:border-zinc-600'}`}
        style={{ minHeight: value ? 0 : 100 }}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      >
        {value ? (
          <div className="relative w-full">
            <img src={value} alt="affiche" className="w-full max-h-52 object-contain rounded-lg" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange('') }}
              className="absolute top-1 right-1 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 rounded-full w-6 h-6 flex items-center justify-center text-xs"
            >×</button>
          </div>
        ) : (
          <>
            <span className="text-2xl text-zinc-600">🎬</span>
            <span className="text-xs text-zinc-500">Glisse une image ou clique</span>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}

interface ModalAddItemProps {
  onClose: () => void
}

function ModalAddItem({ onClose }: ModalAddItemProps) {
  const addItem = useFilmSerieStore((s) => s.addItem)

  const [title,       setTitle]       = useState('')
  const [type,        setType]        = useState<FilmSerieType>('film')
  const [director,    setDirector]    = useState('')
  const [releaseYear, setReleaseYear] = useState('')
  const [imageUrl,    setImageUrl]    = useState('')
  const [tags,        setTags]        = useState<FilmTag[]>([])
  const [status,      setStatus]      = useState<FilmSerieStatus>('à voir')

  function toggleTag(tag: FilmTag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function handleSubmit() {
    if (!title.trim()) return
    addItem({
      title:          title.trim(),
      type,
      director:       director.trim() || undefined,
      releaseYear:    releaseYear ? parseInt(releaseYear) : undefined,
      imageUrl:       imageUrl.trim() || undefined,
      tags,
      favoriteScenes: [],
      status,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800/60 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">Ajouter un film / une série</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 font-medium">Titre *</label>
          <input
            className="bg-zinc-800 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
            placeholder="Ex : Dune Part II"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 font-medium">Type</label>
          <div className="flex gap-2">
            {(['film', 'serie'] as FilmSerieType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  type === t
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300'
                }`}
              >
                {t === 'film' ? 'Film' : 'Série'}
              </button>
            ))}
          </div>
        </div>

        {/* Director */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 font-medium">Réalisateur / Créateur</label>
          <input
            className="bg-zinc-800 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
            placeholder="Ex : Denis Villeneuve"
            value={director}
            onChange={(e) => setDirector(e.target.value)}
          />
        </div>

        {/* Release Year */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 font-medium">Année de sortie</label>
          <input
            type="number"
            className="bg-zinc-800 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
            placeholder="Ex : 2024"
            value={releaseYear}
            onChange={(e) => setReleaseYear(e.target.value)}
          />
        </div>

        <PosterUpload value={imageUrl} onChange={setImageUrl} />

        {/* Tags */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-zinc-500 font-medium">Tags</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  tags.includes(tag)
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 font-medium">Statut initial</label>
          <div className="flex gap-2 flex-wrap">
            {(['à voir', 'en cours', 'vu'] as FilmSerieStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  status === s
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm font-medium bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="flex-1 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Critique Modal ────────────────────────────────────────────────────────────

interface ModalCritiqueProps {
  item: FilmSerie
  onClose: () => void
}

function ModalCritique({ item, onClose }: ModalCritiqueProps) {
  const markAsWatched = useFilmSerieStore((s) => s.markAsWatched)

  const [rating,    setRating]    = useState<number>(item.rating ?? 7)
  const [review,    setReview]    = useState(item.review ?? '')
  const [watchDate, setWatchDate] = useState(
    item.watchDate ?? new Date().toISOString().split('T')[0]
  )
  const [scenes,    setScenes]    = useState<string[]>(
    item.favoriteScenes.length > 0 ? item.favoriteScenes : ['']
  )

  function addScene() {
    setScenes((prev) => [...prev, ''])
  }

  function updateScene(idx: number, val: string) {
    setScenes((prev) => prev.map((s, i) => (i === idx ? val : s)))
  }

  function removeScene(idx: number) {
    setScenes((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleSubmit() {
    const cleanScenes = scenes.map((s) => s.trim()).filter(Boolean)
    markAsWatched(item.id, rating, review, watchDate, cleanScenes)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800/60 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">
            Critique — <span className="text-violet-400">{item.title}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Rating slider */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-500 font-medium">Note</label>
            <span className={`text-2xl font-bold tabular-nums ${ratingColor(rating)}`}>
              {rating}<span className="text-sm font-normal text-zinc-600">/10</span>
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
          <div className="flex justify-between text-[10px] text-zinc-700">
            {[1,2,3,4,5,6,7,8,9,10].map((n) => <span key={n}>{n}</span>)}
          </div>
        </div>

        {/* Review */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 font-medium">Critique</label>
          <textarea
            rows={4}
            className="bg-zinc-800 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 resize-none"
            placeholder="Ce que tu en as pensé..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
        </div>

        {/* Watch date */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 font-medium">Date de visionnage</label>
          <input
            type="date"
            className="bg-zinc-800 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
            value={watchDate}
            onChange={(e) => setWatchDate(e.target.value)}
          />
        </div>

        {/* Favorite scenes */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-zinc-500 font-medium">Scènes / moments mémorables</label>
          {scenes.map((scene, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                className="flex-1 bg-zinc-800 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                placeholder={`Scène ${idx + 1}...`}
                value={scene}
                onChange={(e) => updateScene(idx, e.target.value)}
              />
              <button
                onClick={() => removeScene(idx)}
                className="text-zinc-600 hover:text-red-400 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={addScene}
            className="self-start text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            + Ajouter une scène
          </button>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm font-medium bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-500 transition-colors"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Modal ────────────────────────────────────────────────────────────────

interface ModalEditItemProps {
  item: FilmSerie
  onClose: () => void
}

function ModalEditItem({ item, onClose }: ModalEditItemProps) {
  const updateItem = useFilmSerieStore((s) => s.updateItem)

  const [title,       setTitle]       = useState(item.title)
  const [type,        setType]        = useState<FilmSerieType>(item.type)
  const [director,    setDirector]    = useState(item.director ?? '')
  const [releaseYear, setReleaseYear] = useState(item.releaseYear?.toString() ?? '')
  const [imageUrl,    setImageUrl]    = useState(item.imageUrl ?? '')
  const [tags,        setTags]        = useState<FilmTag[]>(item.tags)
  const [review,      setReview]      = useState(item.review ?? '')
  const [rating,      setRating]      = useState<number>(item.rating ?? 7)
  const [scenes,      setScenes]      = useState<string[]>(
    item.favoriteScenes.length > 0 ? item.favoriteScenes : ['']
  )

  function toggleTag(tag: FilmTag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function addScene() {
    setScenes((prev) => [...prev, ''])
  }

  function updateScene(idx: number, val: string) {
    setScenes((prev) => prev.map((s, i) => (i === idx ? val : s)))
  }

  function removeScene(idx: number) {
    setScenes((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleSubmit() {
    if (!title.trim()) return
    const cleanScenes = scenes.map((s) => s.trim()).filter(Boolean)
    updateItem(item.id, {
      title:          title.trim(),
      type,
      director:       director.trim() || undefined,
      releaseYear:    releaseYear ? parseInt(releaseYear) : undefined,
      imageUrl:       imageUrl.trim() || undefined,
      tags,
      review:         review.trim() || undefined,
      rating:         item.status === 'vu' ? rating : item.rating,
      favoriteScenes: cleanScenes,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800/60 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">Modifier</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 font-medium">Titre *</label>
          <input
            className="bg-zinc-800 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 font-medium">Type</label>
          <div className="flex gap-2">
            {(['film', 'serie'] as FilmSerieType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  type === t
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300'
                }`}
              >
                {t === 'film' ? 'Film' : 'Série'}
              </button>
            ))}
          </div>
        </div>

        {/* Director */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 font-medium">Réalisateur / Créateur</label>
          <input
            className="bg-zinc-800 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
            value={director}
            onChange={(e) => setDirector(e.target.value)}
          />
        </div>

        {/* Release Year */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 font-medium">Année de sortie</label>
          <input
            type="number"
            className="bg-zinc-800 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
            value={releaseYear}
            onChange={(e) => setReleaseYear(e.target.value)}
          />
        </div>

        <PosterUpload value={imageUrl} onChange={setImageUrl} />

        {/* Tags */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-zinc-500 font-medium">Tags</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  tags.includes(tag)
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Rating (only if watched) */}
        {item.status === 'vu' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-500 font-medium">Note</label>
              <span className={`text-2xl font-bold tabular-nums ${ratingColor(rating)}`}>
                {rating}<span className="text-sm font-normal text-zinc-600">/10</span>
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>
        )}

        {/* Review */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 font-medium">Critique</label>
          <textarea
            rows={3}
            className="bg-zinc-800 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 resize-none"
            placeholder="Ce que tu en as pensé..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
        </div>

        {/* Favorite scenes */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-zinc-500 font-medium">Scènes / moments mémorables</label>
          {scenes.map((scene, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                className="flex-1 bg-zinc-800 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                placeholder={`Scène ${idx + 1}...`}
                value={scene}
                onChange={(e) => updateScene(idx, e.target.value)}
              />
              <button
                onClick={() => removeScene(idx)}
                className="text-zinc-600 hover:text-red-400 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={addScene}
            className="self-start text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            + Ajouter une scène
          </button>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm font-medium bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="flex-1 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Film Card ─────────────────────────────────────────────────────────────────

interface FilmCardProps {
  item: FilmSerie
  onCritique:     () => void
  onEdit:         () => void
  onMarkInProgress: () => void
  onRemove:       () => void
}

function FilmCard({ item, onCritique, onEdit, onMarkInProgress, onRemove }: FilmCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800/40 rounded-xl shadow overflow-hidden flex flex-col">
      {/* Poster */}
      <div className="relative">
        <PosterImg src={item.imageUrl} title={item.title} />
        {/* Type badge */}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30 backdrop-blur-sm">
          {item.type === 'film' ? 'Film' : 'Série'}
        </span>
        {/* Rating badge (if watched) */}
        {item.rating !== undefined && (
          <span className={`absolute top-2 right-2 text-sm font-bold tabular-nums ${ratingColor(item.rating)} bg-zinc-900/80 backdrop-blur-sm px-1.5 py-0.5 rounded`}>
            {item.rating}/10
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 leading-tight truncate">{item.title}</h3>
          {(item.director || item.releaseYear) && (
            <p className="text-xs text-zinc-500 mt-0.5">
              {[item.director, item.releaseYear].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag) => <TagPill key={tag} tag={tag} />)}
          </div>
        )}

        {/* Review excerpt */}
        {item.review && (
          <p className="text-xs text-zinc-500 italic line-clamp-2">{item.review}</p>
        )}

        {/* Watch date */}
        {item.watchDate && (
          <p className="text-[10px] text-zinc-600">Vu le {fmtDate(item.watchDate)}</p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex gap-1.5 flex-wrap pt-1">
          {item.status === 'à voir' && (
            <button
              onClick={onMarkInProgress}
              className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-violet-500/15 hover:text-violet-400 transition-colors border border-zinc-700/50"
            >
              ▶ Commencer
            </button>
          )}
          {item.status !== 'vu' && (
            <button
              onClick={onCritique}
              className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 transition-colors border border-violet-500/20"
            >
              ✓ Vu
            </button>
          )}
          {item.status === 'vu' && (
            <button
              onClick={onCritique}
              className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-zinc-800 text-zinc-500 hover:text-violet-400 transition-colors border border-zinc-700/50"
            >
              ✎ Critique
            </button>
          )}
          <button
            onClick={onEdit}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-700/50"
          >
            ✏
          </button>
          <button
            onClick={onRemove}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors border border-zinc-700/50"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Section ───────────────────────────────────────────────────────────────────

interface SectionProps {
  title:       string
  count:       number
  accent:      string
  children:    React.ReactNode
}

function Section({ title, count, accent, children }: SectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${accent}`}>
          {count}
        </span>
      </div>
      {children}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function FilmsSeriesPage() {
  const items          = useFilmSerieStore((s) => s.items)
  const removeItem     = useFilmSerieStore((s) => s.removeItem)
  const markInProgress = useFilmSerieStore((s) => s.markInProgress)

  const [showAdd,           setShowAdd]           = useState(false)
  const [critiqueTarget,    setCritiqueTarget]     = useState<FilmSerie | null>(null)
  const [editTarget,        setEditTarget]         = useState<FilmSerie | null>(null)

  const watchlist  = items.filter((i) => i.status === 'à voir')
  const inProgress = items.filter((i) => i.status === 'en cours')
  const watched    = items.filter((i) => i.status === 'vu')

  // Stats
  const avgRating = watched.length > 0
    ? (watched.reduce((acc, i) => acc + (i.rating ?? 0), 0) / watched.length).toFixed(1)
    : null

  function EmptyState({ message }: { message: string }) {
    return (
      <div className="col-span-full py-10 flex flex-col items-center gap-2 text-zinc-700">
        <span className="text-3xl">🎬</span>
        <p className="text-sm">{message}</p>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-zinc-950 p-6 flex flex-col gap-8">

      {/* ── Header ──────────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Films & Séries</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {items.length} titre{items.length !== 1 ? 's' : ''} · {watched.length} vu{watched.length !== 1 ? 's' : ''}
            {avgRating ? ` · moyenne ${avgRating}/10` : ''}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-500 transition-colors shadow"
        >
          <span>+</span> Ajouter
        </button>
      </div>

      {/* ── À voir ──────────────────────────────────────────────────────────────── */}
      <Section title="À voir" count={watchlist.length} accent="bg-zinc-800 text-zinc-400">
        {watchlist.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <EmptyState message="Aucun titre dans la watchlist" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {watchlist.map((item) => (
              <FilmCard
                key={item.id}
                item={item}
                onCritique={() => setCritiqueTarget(item)}
                onEdit={() => setEditTarget(item)}
                onMarkInProgress={() => markInProgress(item.id)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ── En cours ────────────────────────────────────────────────────────────── */}
      <Section title="En cours" count={inProgress.length} accent="bg-violet-500/15 text-violet-400">
        {inProgress.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <EmptyState message="Rien en cours de visionnage" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {inProgress.map((item) => (
              <FilmCard
                key={item.id}
                item={item}
                onCritique={() => setCritiqueTarget(item)}
                onEdit={() => setEditTarget(item)}
                onMarkInProgress={() => markInProgress(item.id)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ── Vu ──────────────────────────────────────────────────────────────────── */}
      <Section title="Vu" count={watched.length} accent="bg-amber-500/15 text-amber-400">
        {/* Stats bar */}
        {watched.length > 0 && avgRating && (
          <div className="flex items-center gap-6 px-4 py-3 bg-zinc-900 border border-zinc-800/40 rounded-xl">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-600 uppercase tracking-wide font-semibold">Titres vus</span>
              <span className="text-xl font-bold text-zinc-100">{watched.length}</span>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-600 uppercase tracking-wide font-semibold">Note moyenne</span>
              <span className={`text-xl font-bold ${ratingColor(parseFloat(avgRating))}`}>{avgRating}/10</span>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-600 uppercase tracking-wide font-semibold">Films</span>
              <span className="text-xl font-bold text-zinc-100">{watched.filter((i) => i.type === 'film').length}</span>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-600 uppercase tracking-wide font-semibold">Séries</span>
              <span className="text-xl font-bold text-zinc-100">{watched.filter((i) => i.type === 'serie').length}</span>
            </div>
          </div>
        )}

        {watched.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <EmptyState message="Aucun titre visionné pour l'instant" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {watched.map((item) => (
              <FilmCard
                key={item.id}
                item={item}
                onCritique={() => setCritiqueTarget(item)}
                onEdit={() => setEditTarget(item)}
                onMarkInProgress={() => markInProgress(item.id)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ── Modals ──────────────────────────────────────────────────────────────── */}
      {showAdd && <ModalAddItem onClose={() => setShowAdd(false)} />}
      {critiqueTarget && (
        <ModalCritique item={critiqueTarget} onClose={() => setCritiqueTarget(null)} />
      )}
      {editTarget && (
        <ModalEditItem item={editTarget} onClose={() => setEditTarget(null)} />
      )}

    </div>
  )
}
