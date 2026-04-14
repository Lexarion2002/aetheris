import { useState, useRef, useEffect } from 'react'
import { useMusicStore } from '../store/musicStore'
import type { AlbumCritique, AlbumAttente, ArtisteFollowed, AlbumTag } from '../store/musicStore'

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_TAGS: AlbumTag[] = [
  'ambient', 'jazz', 'rap', 'rock', 'electro', 'classical', 'soul',
  'rnb', 'folk', 'metal', 'pop', 'world', 'experimental', 'indie',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Générateur d'ID sécurisé (fallback si crypto.randomUUID n'est pas dispo)
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return Math.random().toString(36).substring(2, 15)
}

function noteColor(note: number) {
  if (note >= 9) return 'text-amber-400'
  if (note >= 7) return 'text-teal-400'
  if (note >= 5) return 'text-zinc-300'
  return 'text-zinc-500'
}

function TagPill({ tag }: { tag: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700/50">
      {tag}
    </span>
  )
}

function NoteStars({ note }: { note: number }) {
  return (
    <span className={`text-lg font-bold tabular-nums ${noteColor(note)}`}>
      {note}<span className="text-xs font-normal text-zinc-600">/10</span>
    </span>
  )
}

function fmtDate(iso: string | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function PochetteImg({ src, alt, size = 48 }: { src: string; alt: string; size?: number }) {
  if (!src) return (
    <div
      className="shrink-0 rounded-md bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-zinc-600 text-xs"
      style={{ width: size, height: size }}
    >
      ♪
    </div>
  )
  return (
    <img
      src={src} alt={alt}
      className="shrink-0 rounded-md object-cover border border-zinc-700/50"
      style={{ width: size, height: size }}
    />
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200">
            {initial ? 'Modifier la critique' : 'Nouvelle critique'}
          </h2>

          {/* Titre / Artiste */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-500 mb-1 block">Titre *</label>
              <input
                value={titre} onChange={(e) => setTitre(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-teal-500/50"
                placeholder="Album"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 mb-1 block">Artiste *</label>
              <div className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-2 py-1.5 flex flex-wrap gap-1 focus-within:border-teal-500/50">
                {artistes.map((a) => (
                  <span key={a} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-700 text-xs text-zinc-200">
                    {a}
                    <button type="button" onClick={() => setArtistes((p) => p.filter((x) => x !== a))} className="text-zinc-500 hover:text-zinc-300">×</button>
                  </span>
                ))}
                <input
                  value={artisteInput}
                  onChange={(e) => setArtisteInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addArtiste(artisteInput) } }}
                  onBlur={() => { if (artisteInput.trim()) addArtiste(artisteInput) }}
                  className="flex-1 min-w-[80px] bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
                  placeholder={artistes.length === 0 ? 'Artiste, Entrée' : '+'}
                />
              </div>
            </div>
          </div>

          {/* Date de sortie */}
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Date de sortie</label>
            <input
              type="date"
              value={dateSortie}
              onChange={(e) => setDateSortie(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-teal-500/50 [color-scheme:dark]"
            />
            {dateSortie && (
              <p className="text-[11px] text-zinc-600 mt-0.5">
                {fmtDate(dateSortie)}
              </p>
            )}
          </div>

          {/* Pochette — upload / drag & drop */}
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Pochette</label>
            <div className="flex gap-3 items-start">
              {/* Drop zone */}
              <div
                className={`relative flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors cursor-pointer min-h-[80px] ${
                  dragOver
                    ? 'border-teal-500/60 bg-teal-500/5'
                    : 'border-zinc-700/60 bg-zinc-800/40 hover:border-zinc-600 hover:bg-zinc-800/60'
                }`}
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
                    <p className="text-xs text-zinc-500">Glisse une image ici</p>
                    <p className="text-[10px] text-zinc-700 mt-0.5">ou clique pour choisir</p>
                    <p className="text-[10px] text-zinc-700">JPG · PNG · WEBP</p>
                  </div>
                )}
              </div>
              {pochette && (
                <button
                  onClick={() => setPochette('')}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-500 text-xs transition-colors shrink-0"
                >
                  ✕ Retirer
                </button>
              )}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-[11px] text-zinc-500 mb-2 block">
              Note : <span className={`font-bold ${noteColor(note)}`}>{note % 1 === 0 ? note : note.toFixed(1)}/10</span>
            </label>
            <input
              type="range" min={1} max={10} step={0.5} value={note}
              onChange={(e) => setNote(parseFloat(e.target.value))}
              className="w-full accent-teal-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-700 mt-0.5">
              <span>1</span><span>5</span><span>10</span>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[11px] text-zinc-500 mb-2 block">Tags (max 3)</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                    tags.includes(tag)
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700/50 hover:border-zinc-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Critique */}
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Critique</label>
            <textarea
              value={critique} onChange={(e) => setCritique(e.target.value)}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-teal-500/50 resize-none"
              placeholder="Ce que j'en pense..."
            />
          </div>

          {/* Tracks */}
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Tracks favorites (une par ligne)</label>
            <textarea
              value={tracks} onChange={(e) => setTracks(e.target.value)}
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-teal-500/50 resize-none"
              placeholder="Track 1&#10;Track 2"
            />
          </div>

          {/* Contexte */}
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Contexte personnel</label>
            <input
              value={contexte} onChange={(e) => setContexte(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-teal-500/50"
              placeholder="Première impression, moment particulier..."
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={!titre.trim() || artistes.length === 0}
              className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
            className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm transition-colors"
          >
            Supprimer
          </button>
        )}
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors">
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
  const [titre,   setTitre]   = useState('')
  const [artiste, setArtiste] = useState('')
  const [source,  setSource]  = useState('')
  const [pourquoi, setPourquoi] = useState('')

  function handleSubmit() {
    if (!titre.trim() || !artiste.trim()) return
    addAlbumFile({ titre: titre.trim(), artiste: artiste.trim(), source: source.trim(), pourquoi: pourquoi.trim() })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200">Ajouter à la file</h2>

          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Titre *</label>
            <input value={titre} onChange={(e) => setTitre(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-teal-500/50"
              placeholder="Album"
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Artiste *</label>
            <input value={artiste} onChange={(e) => setArtiste(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-teal-500/50"
              placeholder="Artiste"
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Source</label>
            <input value={source} onChange={(e) => setSource(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-teal-500/50"
              placeholder="Conseil de X, vu dans Y..."
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Pourquoi</label>
            <input value={pourquoi} onChange={(e) => setPourquoi(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-teal-500/50"
              placeholder="Raison de l'intérêt..."
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={!titre.trim() || !artiste.trim()}
              className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors disabled:opacity-40"
            >
              Ajouter
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors">
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Artiste Modal ─────────────────────────────────────────────────────────────

interface ArtisteModalProps {
  initial?: ArtisteFollowed | null
  onClose: () => void
}

function ArtisteModal({ initial, onClose }: ArtisteModalProps) {
  const followArtiste  = useMusicStore((s) => s.followArtiste)
  const updateArtiste  = useMusicStore((s) => s.updateArtiste)

  const [nom,      setNom]      = useState(initial?.nom      ?? '')
  const [photo,    setPhoto]    = useState(initial?.photo    ?? '')
  const [ecoute,   setEcoute]   = useState<string>(initial?.discographieEcoutee?.toString() ?? '0')
  const [total,    setTotal]    = useState<string>(initial?.discographieTotal?.toString()   ?? '0')
  const [attentes, setAttentes] = useState(initial?.attentes ?? '')
  const [alerte,   setAlerte]   = useState(initial?.alerte   ?? false)

  function handleSubmit() {
    if (!nom.trim()) return
    const data = {
      nom:                  nom.trim(),
      photo:                photo.trim(),
      discographieEcoutee:  parseInt(ecoute) || 0,
      discographieTotal:    parseInt(total)  || 0,
      attentes:             attentes.trim(),
      alerte,
    }
    if (initial) updateArtiste(initial.id!, data)
    else followArtiste(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200">
            {initial ? 'Modifier artiste' : 'Suivre un artiste'}
          </h2>

          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Nom *</label>
            <input value={nom} onChange={(e) => setNom(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-teal-500/50"
              placeholder="Nom de l'artiste"
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Photo (URL)</label>
            <input value={photo} onChange={(e) => setPhoto(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-teal-500/50"
              placeholder="https://..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-500 mb-1 block">Albums écoutés</label>
              <input value={ecoute} onChange={(e) => setEcoute(e.target.value)} type="number" min={0}
                className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-teal-500/50"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 mb-1 block">Total discographie</label>
              <input value={total} onChange={(e) => setTotal(e.target.value)} type="number" min={0}
                className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-teal-500/50"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Notes / attentes</label>
            <textarea value={attentes} onChange={(e) => setAttentes(e.target.value)} rows={2}
              className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-teal-500/50 resize-none"
              placeholder="Prochain album attendu, style..."
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={alerte} onChange={(e) => setAlerte(e.target.checked)} className="accent-teal-500" />
            <span className="text-sm text-zinc-400">Alerte nouvelle sortie</span>
          </label>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={!nom.trim()}
              className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors disabled:opacity-40"
            >
              {initial ? 'Enregistrer' : 'Suivre'}
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors">
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── AlbumEnCoursCard ─────────────────────────────────────────────────────────

function AlbumEnCoursCard({ onCritique }: { onCritique: () => void }) {
  const albumEnCours          = useMusicStore((s) => s.albumEnCours)
  const clearAlbumEnCours     = useMusicStore((s) => s.clearAlbumEnCours)
  const setPremiereImpression = useMusicStore((s) => s.setPremiereImpression)
  const setAlbumEnCours       = useMusicStore((s) => s.setAlbumEnCours)
  const [showForm, setShowForm] = useState(false)
  const [titre,    setTitre]   = useState('')
  const [artiste,  setArtiste] = useState('')
  const [pochette, setPochette] = useState('')

  if (!albumEnCours) {
    return (
      <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-300">En écoute maintenant</h2>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs px-2.5 py-1 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 transition-colors"
          >
            + Démarrer une écoute
          </button>
        </div>
        {showForm ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input value={titre} onChange={(e) => setTitre(e.target.value)}
                placeholder="Album *"
                className="bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-teal-500/50"
              />
              <input value={artiste} onChange={(e) => setArtiste(e.target.value)}
                placeholder="Artiste *"
                className="bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-teal-500/50"
              />
            </div>
            <input value={pochette} onChange={(e) => setPochette(e.target.value)}
              placeholder="URL pochette (optionnel)"
              className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-teal-500/50"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!titre.trim() || !artiste.trim()) return
                  setAlbumEnCours({ titre: titre.trim(), artiste: artiste.trim(), pochette: pochette.trim(), premiereImpression: '' })
                  setShowForm(false)
                }}
                disabled={!titre.trim() || !artiste.trim()}
                className="flex-1 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors disabled:opacity-40"
              >
                Démarrer
              </button>
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm transition-colors">
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Aucun album en cours. Lance une écoute pour prendre des notes.</p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-300">En écoute maintenant</h2>
        <span className="text-[10px] text-zinc-600">
          depuis {new Date(albumEnCours.startedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </span>
      </div>
      <div className="flex gap-4">
        <PochetteImg src={albumEnCours.pochette} alt={albumEnCours.titre} size={64} />
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-zinc-100 truncate">{albumEnCours.titre}</p>
          <p className="text-sm text-zinc-500 truncate">{albumEnCours.artiste}</p>
          <div className="mt-2">
            <input
              value={albumEnCours.premiereImpression}
              onChange={(e) => setPremiereImpression(e.target.value)}
              placeholder="Première impression..."
              className="w-full bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-2.5 py-1 text-xs text-zinc-300 outline-none focus:border-teal-500/50 placeholder:text-zinc-600"
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onCritique}
          className="flex-1 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 text-xs font-medium transition-colors"
        >
          Rédiger la critique
        </button>
        <button
          onClick={clearAlbumEnCours}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-500 text-xs transition-colors"
        >
          Stopper
        </button>
      </div>
    </div>
  )
}

// ─── Bibliotheque ─────────────────────────────────────────────────────────────

type SortMode = 'sortie_desc' | 'critique_desc' | 'note_desc' | 'note_asc' | 'artiste'
type ViewMode = 'grid' | 'list'

function BibliothequeSection({
  onEdit,
  onNew,
}: {
  onEdit: (album: AlbumCritique) => void
  onNew: () => void
}) {
  const bibliotheque   = useMusicStore((s) => s.bibliotheque)
  const deleteCritique = useMusicStore((s) => s.deleteCritique)
  const [sort,       setSort]       = useState<SortMode>('sortie_desc')
  const [view,       setView]       = useState<ViewMode>('grid')
  const [tagFilter,  setTagFilter]  = useState<AlbumTag | ''>('')
  const [searchQ,    setSearchQ]    = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const sorted = [...bibliotheque]
    .filter((a) => {
      if (tagFilter && !a.tags.includes(tagFilter)) return false
      if (searchQ) {
        const q = searchQ.toLowerCase()
        return a.titre.toLowerCase().includes(q) || a.artiste.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      if (sort === 'note_desc')     return b.note - a.note
      if (sort === 'note_asc')      return a.note - b.note
      if (sort === 'artiste')       return a.artiste.localeCompare(b.artiste)
      if (sort === 'critique_desc') return new Date(b.dateCritique).getTime() - new Date(a.dateCritique).getTime()
      // sortie_desc: albums récents d'abord; vide à la fin
      const da = a.dateOriginaleSortie ?? ''
      const db = b.dateOriginaleSortie ?? ''
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      return db.localeCompare(da)
    })

  const usedTags = Array.from(new Set(bibliotheque.flatMap((a) => a.tags)))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-300">
          Bibliothèque
          <span className="ml-2 text-xs text-zinc-600 font-normal">{bibliotheque.length} critiques</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-500 text-xs transition-colors"
          >
            {view === 'grid' ? '☰' : '⊞'}
          </button>
          <button
            onClick={onNew}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 transition-colors"
          >
            + Critique
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Rechercher..."
          className="bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-3 py-1 text-xs text-zinc-300 outline-none focus:border-teal-500/50 w-36"
        />
        <select
          value={sort} onChange={(e) => setSort(e.target.value as SortMode)}
          className="bg-zinc-800 border border-zinc-700/50 rounded-lg px-2 py-1 text-xs text-zinc-400 outline-none"
        >
          <option value="sortie_desc">Date de sortie ↓</option>
          <option value="critique_desc">Date critique ↓</option>
          <option value="note_desc">Note ↓</option>
          <option value="note_asc">Note ↑</option>
          <option value="artiste">Artiste A-Z</option>
        </select>
        {usedTags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setTagFilter('')}
              className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                tagFilter === ''
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                  : 'bg-zinc-800 text-zinc-500 border-zinc-700/50 hover:border-zinc-600'
              }`}
            >
              Tous
            </button>
            {usedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setTagFilter(tag === tagFilter ? '' : tag)}
                className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                  tagFilter === tag
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                    : 'bg-zinc-800 text-zinc-500 border-zinc-700/50 hover:border-zinc-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="py-10 text-center text-xs text-zinc-600">
          {bibliotheque.length === 0 ? 'Aucune critique encore. Commence par écouter un album.' : 'Aucun résultat.'}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {sorted.map((album, idx) => (
            <div
              key={album.id || `grid-${idx}`}
              className="group bg-zinc-900 border border-zinc-800/60 rounded-xl overflow-hidden hover:border-zinc-700/60 transition-colors cursor-pointer"
              onClick={() => onEdit(album)}
            >
              <div className="relative">
                <PochetteImg src={album.pochette} alt={album.titre} size={0} />
                <div
                  className="w-full aspect-square bg-zinc-800 flex items-center justify-center overflow-hidden"
                  style={{ height: 0, paddingBottom: '100%', position: 'relative' }}
                >
                  {album.pochette ? (
                    <img src={album.pochette} alt={album.titre} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-3xl text-zinc-700">♪</div>
                  )}
                </div>
              <div className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                  {album.note}
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm('Supprimer cet album de la bibliothèque ?')) {
                      deleteCritique(album.id!)
                    }
                  }}
                  title="Supprimer l'album"
                  className="absolute top-1.5 left-1.5 z-10 rounded bg-red-500/20 p-1 text-red-400 opacity-0 transition-opacity hover:bg-red-500/40 group-hover:opacity-100"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold text-zinc-200 truncate">{album.titre}</p>
                <p className="text-[11px] text-zinc-500 truncate">{album.artiste}</p>
                {album.dateOriginaleSortie && (
                  <p className="text-[10px] text-zinc-700 mt-0.5 truncate">{fmtDate(album.dateOriginaleSortie)}</p>
                )}
                <div className="flex gap-1 mt-1 flex-wrap">
                  {album.tags.slice(0, 2).map((t) => <TagPill key={t} tag={t} />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map((album, idx) => {
            const itemId = album.id || `list-${idx}`
            return (
              <div
                key={itemId}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800/40 hover:border-zinc-700/50 transition-colors group"
              >
              <PochetteImg src={album.pochette} alt={album.titre} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200 truncate">{album.titre}</span>
                  {album.dateOriginaleSortie && (
                    <span className="text-[11px] text-zinc-600 shrink-0">{fmtDate(album.dateOriginaleSortie)}</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 truncate">{album.artiste}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex gap-1">
                  {album.tags.map((t) => <TagPill key={t} tag={t} />)}
                </div>
                <NoteStars note={album.note} />
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(album)
                    }}
                    className="p-1 rounded text-zinc-600 hover:text-zinc-400 transition-colors text-xs"
                  >
                    ✏
                  </button>
                  {confirmDel === itemId ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteCritique(album.id!)
                          setConfirmDel(null)
                        }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      >
                        Suppr
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmDel(null)
                        }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDel(itemId)
                      }}
                      className="p-1 rounded text-zinc-700 hover:text-red-500 transition-colors text-xs"
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

// ─── Panthéon ─────────────────────────────────────────────────────────────────

function PantheonSection({ onEdit }: { onEdit: (album: AlbumCritique) => void }) {
  const bibliotheque = useMusicStore((s) => s.bibliotheque)
  const pantheon = bibliotheque
    .filter((a) => a.note >= 9)
    .sort((a, b) => {
      const da = a.dateOriginaleSortie ?? ''
      const db = b.dateOriginaleSortie ?? ''
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      return da.localeCompare(db) // ascending: oldest first
    })

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-zinc-300">Panthéon</h2>
        <span className="text-[10px] text-amber-500/70 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">9-10</span>
        <span className="text-xs text-zinc-600 font-normal">{pantheon.length} albums</span>
      </div>
      {pantheon.length === 0 ? (
        <p className="text-xs text-zinc-600 py-4 text-center">Aucun album noté 9 ou 10 encore.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {pantheon.map((album, idx) => (
            <div
              key={album.id || `panth-${idx}`}
              className="relative group cursor-pointer"
              style={{ width: 80 }}
              onClick={() => onEdit(album)}
            >
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-amber-500/20 bg-zinc-800">
                {album.pochette ? (
                  <img src={album.pochette} alt={album.titre} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-zinc-600">♪</div>
                )}
              </div>
              <div className="absolute -top-1 -right-1 text-[10px] font-bold w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                {album.note}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 text-center truncate">{album.titre}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── File d'attente ────────────────────────────────────────────────────────────

function FileAttenteSection({ onNew, onEdit }: { onNew: () => void; onEdit: (a: AlbumAttente) => void }) {
  const fileAttente    = useMusicStore((s) => s.fileAttente)
  const startListening = useMusicStore((s) => s.startListening)
  const removeFromFile = useMusicStore((s) => s.removeFromFile)
  const [confirmDel,  setConfirmDel]  = useState<string | null>(null)
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
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-300">
          File d'attente
          <span className="ml-2 text-xs text-zinc-600 font-normal">{fileAttente.length}</span>
        </h2>
        <div className="flex items-center gap-2">
          {fileAttente.length > 1 && (
            <button
              onClick={randomSelect}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
            >
              🎲
            </button>
          )}
          <button
            onClick={onNew}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
          >
            + Ajouter
          </button>
        </div>
      </div>
      {fileAttente.length === 0 ? (
        <p className="text-xs text-zinc-600 py-3 text-center">Aucun album en attente.</p>
      ) : (
        <div className="space-y-1.5">
          {fileAttente.map((album, idx) => {
            const itemId = album.id || `attente-${idx}`
            return (
              <div
                key={itemId}
                ref={(el) => { itemRefs.current[itemId] = el }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl border group transition-colors duration-300 ${highlighted === itemId ? 'bg-teal-500/15 border-teal-500/40' : 'bg-zinc-900 border-zinc-800/40'}`}
              >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200 truncate">{album.titre}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-zinc-500 truncate">{album.artiste}</span>
                  {album.source && (
                    <span className="text-[10px] text-zinc-600 truncate">· {album.source}</span>
                  )}
                </div>
                {album.pourquoi && (
                  <p className="text-[10px] text-zinc-600 mt-0.5 truncate">{album.pourquoi}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onEdit(album)} className="p-1 rounded text-zinc-600 hover:text-zinc-400 transition-colors text-xs opacity-0 group-hover:opacity-100">✏</button>
                <button
                    onClick={() => startListening(album.id!)}
                  className="text-[11px] px-2 py-1 rounded-lg bg-teal-600/15 hover:bg-teal-600/25 text-teal-400 transition-colors"
                >
                  ▶ Écouter
                </button>
                {confirmDel === itemId ? (
                  <>
                      <button onClick={() => { removeFromFile(album.id!); setConfirmDel(null) }} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">Suppr</button>
                    <button onClick={() => setConfirmDel(null)} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">✕</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDel(itemId)} className="p-1 rounded text-zinc-700 hover:text-red-500 transition-colors text-xs opacity-0 group-hover:opacity-100">🗑</button>
                )}
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function StatsSection() {
  const bibliotheque = useMusicStore((s) => s.bibliotheque)

  if (bibliotheque.length === 0) return null

  const avgNote = bibliotheque.reduce((s, a) => s + a.note, 0) / bibliotheque.length
  const topTag  = Object.entries(
    bibliotheque.flatMap((a) => a.tags).reduce((acc: Record<string, number>, t) => {
      acc[t] = (acc[t] ?? 0) + 1; return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])[0]
  const thisYear = new Date().getFullYear()
  const thisYearCount = bibliotheque.filter((a) => a.dateCritique.startsWith(String(thisYear))).length

  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-300 mb-3">Stats</h2>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-4 text-center">
          <p className={`text-2xl font-bold tabular-nums ${noteColor(Math.round(avgNote))}`}>
            {avgNote.toFixed(1)}
          </p>
          <p className="text-xs text-zinc-600 mt-1">Note moyenne</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-zinc-200 tabular-nums">{thisYearCount}</p>
          <p className="text-xs text-zinc-600 mt-1">Critiques {thisYear}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-4 text-center">
          <p className="text-lg font-bold text-teal-400">{topTag ? topTag[0] : '–'}</p>
          <p className="text-xs text-zinc-600 mt-1">Tag dominant</p>
        </div>
      </div>
    </div>
  )
}

// ─── Artistes suivis ──────────────────────────────────────────────────────────

function ArtistesSection({
  onEdit,
  onNew,
}: {
  onEdit: (a: ArtisteFollowed) => void
  onNew: () => void
}) {
  const artistesSuivis   = useMusicStore((s) => s.artistesSuivis)
  const setArtisteAlerte = useMusicStore((s) => s.setArtisteAlerte)
  const unfollowArtiste  = useMusicStore((s) => s.unfollowArtiste)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-300">
          Artistes suivis
          <span className="ml-2 text-xs text-zinc-600 font-normal">{artistesSuivis.length}</span>
        </h2>
        <button
          onClick={onNew}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
        >
          + Suivre
        </button>
      </div>
      {artistesSuivis.length === 0 ? (
        <p className="text-xs text-zinc-600 py-3 text-center">Aucun artiste suivi.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {artistesSuivis.map((artiste, idx) => {
            const itemId = artiste.id || `art-${idx}`
            const pct = artiste.discographieTotal > 0
              ? Math.round((artiste.discographieEcoutee / artiste.discographieTotal) * 100)
              : 0
            return (
              <div key={itemId} className="flex items-start gap-3 px-3 py-3 rounded-xl bg-zinc-900 border border-zinc-800/40 group hover:border-zinc-700/50 transition-colors">
                <div className="w-10 h-10 shrink-0 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700/40">
                  {artiste.photo ? (
                    <img src={artiste.photo} alt={artiste.nom} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">♪</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200 truncate">{artiste.nom}</span>
                    {artiste.alerte && (
                      <span className="text-[10px] text-teal-400 bg-teal-500/10 border border-teal-500/20 px-1 py-0.5 rounded">🔔</span>
                    )}
                  </div>
                  {artiste.discographieTotal > 0 && (
                    <div className="mt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1 rounded-full bg-zinc-800">
                          <div className="h-full rounded-full bg-teal-500/60" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-zinc-600 tabular-nums">{artiste.discographieEcoutee}/{artiste.discographieTotal}</span>
                      </div>
                    </div>
                  )}
                  {artiste.attentes && (
                    <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{artiste.attentes}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(artiste)} className="p-1 rounded text-zinc-600 hover:text-zinc-400 text-xs">✏</button>
                  <button onClick={() => setArtisteAlerte(artiste.id!, !artiste.alerte)} className="p-1 rounded text-zinc-600 hover:text-teal-400 text-xs">🔔</button>
                  {confirmDel === itemId ? (
                    <>
                      <button onClick={() => { unfollowArtiste(artiste.id!); setConfirmDel(null) }} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Suppr</button>
                      <button onClick={() => setConfirmDel(null)} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">✕</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDel(itemId)} className="p-1 rounded text-zinc-700 hover:text-red-500 text-xs">🗑</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── MusicPage ────────────────────────────────────────────────────────────────

export function MusicPage() {
  const [critiqueModal, setCritiqueModal] = useState<{ open: boolean; album?: Partial<AlbumCritique & AlbumAttente> | null }>({ open: false })
  const [fileModal,     setFileModal]     = useState(false)
  const [artisteModal,  setArtisteModal]  = useState<{ open: boolean; artiste?: ArtisteFollowed | null }>({ open: false })

  const _hasHydrated = useMusicStore((s) => s._hasHydrated)
  const bibliotheque = useMusicStore((s) => s.bibliotheque)
  
  // ─── AUTO-RÉPARATION DES DONNÉES CORROMPUES ───
  useEffect(() => {
    if (_hasHydrated) {
      useMusicStore.setState((state) => {
        let changed = false
        const newBiblio = state.bibliotheque.map((a) => {
          if (!a.id) { changed = true; return { ...a, id: generateId() } }
          return a
        })
        const newAttente = state.fileAttente.map((a) => {
          if (!a.id) { changed = true; return { ...a, id: generateId() } }
          return a
        })
        const newArtistes = state.artistesSuivis.map((a) => {
          if (!a.id) { changed = true; return { ...a, id: generateId() } }
          return a
        })
        return changed ? { bibliotheque: newBiblio, fileAttente: newAttente, artistesSuivis: newArtistes } : state
      })
    }
  }, [_hasHydrated])

  console.log('[MusicPage] 🎵 Hydratation :', _hasHydrated, '| Albums chargés depuis le store:', bibliotheque)

  return (
    <div className="min-h-full bg-zinc-950 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Musique</h1>
              <p className="text-sm text-zinc-500 mt-0.5">Critique musicale personnelle</p>
            </div>
            <button
              onClick={() => setCritiqueModal({ open: true })}
              className="text-sm px-3 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 font-medium transition-colors"
            >
              + Nouvelle critique
            </button>
          </div>
        </div>

        {/* ── Album en cours ───────────────────────────────────────────────── */}
        <AlbumEnCoursCard onCritique={() => setCritiqueModal({ open: true })} />

        {/* ── Bibliothèque ─────────────────────────────────────────────────── */}
        <div className="bg-zinc-900/50 border border-zinc-800/40 rounded-xl p-5">
          <BibliothequeSection
            onEdit={(album) => setCritiqueModal({ open: true, album })}
            onNew={() => setCritiqueModal({ open: true })}
          />
        </div>

        {/* ── Panthéon ─────────────────────────────────────────────────────── */}
        <div className="bg-zinc-900/50 border border-zinc-800/40 rounded-xl p-5">
          <PantheonSection onEdit={(album) => setCritiqueModal({ open: true, album })} />
        </div>

        {/* ── File d'attente ───────────────────────────────────────────────── */}
        <div className="bg-zinc-900/50 border border-zinc-800/40 rounded-xl p-5">
          <FileAttenteSection
            onNew={() => setFileModal(true)}
            onEdit={(album) => setCritiqueModal({ open: true, album })}
          />
        </div>

        {/* ── Stats ────────────────────────────────────────────────────────── */}
        <StatsSection />

        {/* ── Artistes suivis ──────────────────────────────────────────────── */}
        <div className="bg-zinc-900/50 border border-zinc-800/40 rounded-xl p-5">
          <ArtistesSection
            onEdit={(a) => setArtisteModal({ open: true, artiste: a })}
            onNew={() => setArtisteModal({ open: true })}
          />
        </div>

      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {critiqueModal.open && (
        <CritiqueModal
          initial={critiqueModal.album ?? null}
          onClose={() => setCritiqueModal({ open: false })}
        />
      )}
      {fileModal && (
        <FileModal onClose={() => setFileModal(false)} />
      )}
      {artisteModal.open && (
        <ArtisteModal
          initial={artisteModal.artiste ?? null}
          onClose={() => setArtisteModal({ open: false })}
        />
      )}
    </div>
  )
}
