import { useState, useRef } from 'react'
import { useWritingStore } from '../store/writingStore'
import type { WritingArc, WritingCharacter, WritingCitation, WritingFragment } from '../store/writingStore'

// ─── Section anchor nav ───────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'pouls',      label: 'Le Pouls'      },
  { id: 'arene',      label: "L'Arène"       },
  { id: 'journal',    label: 'Journal'        },
  { id: 'gladiateurs',label: 'Gladiateurs'    },
  { id: 'signal',     label: 'Le Signal'      },
  { id: 'biblio',     label: 'Bibliothèque'   },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

const today = () => new Date().toISOString().split('T')[0]

function SectionTitle({ id, label }: { id: string; label: string }) {
  return (
    <h2
      id={id}
      className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
    >
      <span className="h-px flex-1 bg-zinc-800" />
      {label}
      <span className="h-px flex-1 bg-zinc-800" />
    </h2>
  )
}

// ─── LE POULS DU ROMAN ───────────────────────────────────────────────────────

function PoulsDuRoman() {
  const lastSentence    = useWritingStore((s) => s.lastSentence)
  const moodKeywords    = useWritingStore((s) => s.moodKeywords)
  const chapterCurrent  = useWritingStore((s) => s.chapterCurrent)
  const chapterTotal    = useWritingStore((s) => s.chapterTotal)
  const updateLastSentence    = useWritingStore((s) => s.updateLastSentence)
  const updateMood            = useWritingStore((s) => s.updateMood)
  const updateChapterProgress = useWritingStore((s) => s.updateChapterProgress)

  const [editSentence,  setEditSentence]  = useState(false)
  const [sentenceVal,   setSentenceVal]   = useState(lastSentence)
  const [editMood,      setEditMood]      = useState(false)
  const [moodVal,       setMoodVal]       = useState(moodKeywords.join(', '))
  const [editChapter,   setEditChapter]   = useState(false)
  const [chapCurr,      setChapCurr]      = useState(String(chapterCurrent))
  const [chapTotal,     setChapTotal]     = useState(String(chapterTotal))

  const saveSentence = () => {
    updateLastSentence(sentenceVal.trim())
    setEditSentence(false)
  }

  const saveMood = () => {
    const kws = moodVal.split(',').map((k) => k.trim()).filter(Boolean)
    updateMood(kws)
    setEditMood(false)
  }

  const saveChapter = () => {
    const c = Math.max(1, parseInt(chapCurr) || 1)
    const t = Math.max(c, parseInt(chapTotal) || c)
    updateChapterProgress(c, t)
    setEditChapter(false)
  }

  return (
    <div className="space-y-8">
      {/* Last sentence */}
      <div className="group relative">
        {lastSentence ? (
          <blockquote
            onClick={() => { setSentenceVal(lastSentence); setEditSentence(true) }}
            className="cursor-text border-l-2 border-zinc-700 pl-5 text-lg italic leading-relaxed text-zinc-400 hover:border-zinc-500 transition-colors"
          >
            {lastSentence}
          </blockquote>
        ) : (
          <button
            onClick={() => { setSentenceVal(''); setEditSentence(true) }}
            className="border-l-2 border-zinc-800 pl-5 text-base italic text-zinc-600 hover:border-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Quelle est la dernière phrase que tu as écrite ?
          </button>
        )}
        {editSentence && (
          <div className="mt-3 space-y-2">
            <textarea
              autoFocus
              value={sentenceVal}
              onChange={(e) => setSentenceVal(e.target.value)}
              rows={2}
              placeholder="La dernière phrase écrite…"
              className="w-full resize-none rounded-lg border border-zinc-700/60 bg-zinc-900 px-4 py-3 text-sm italic text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors"
            />
            <div className="flex gap-2">
              <button onClick={saveSentence} className="rounded px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors">Enregistrer</button>
              <button onClick={() => setEditSentence(false)} className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Annuler</button>
            </div>
          </div>
        )}
      </div>

      {/* Two meta blocks */}
      <div className="flex flex-wrap items-start gap-8">
        {/* Chapter progress */}
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-600">Progression</p>
          {editChapter ? (
            <div className="flex items-center gap-2">
              <input
                type="number" min="1" value={chapCurr}
                onChange={(e) => setChapCurr(e.target.value)}
                className="w-14 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-center text-sm text-zinc-200 outline-none focus:border-zinc-500"
              />
              <span className="text-zinc-600">sur</span>
              <input
                type="number" min="1" value={chapTotal}
                onChange={(e) => setChapTotal(e.target.value)}
                className="w-14 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-center text-sm text-zinc-200 outline-none focus:border-zinc-500"
              />
              <button onClick={saveChapter} className="rounded px-2.5 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors">OK</button>
              <button onClick={() => setEditChapter(false)} className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors">×</button>
            </div>
          ) : (
            <button
              onClick={() => { setChapCurr(String(chapterCurrent)); setChapTotal(String(chapterTotal)); setEditChapter(true) }}
              className="text-2xl font-light text-zinc-200 hover:text-zinc-100 transition-colors tabular-nums"
            >
              Combat <span className="font-semibold">{chapterCurrent}</span>
              <span className="text-zinc-600"> sur {chapterTotal}</span>
            </button>
          )}
        </div>

        {/* Mood */}
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-600">Mood du chapitre</p>
          {editMood ? (
            <div className="space-y-2">
              <input
                autoFocus
                value={moodVal}
                onChange={(e) => setMoodVal(e.target.value)}
                placeholder="tension, absurde, silence…"
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors"
              />
              <div className="flex gap-2">
                <button onClick={saveMood} className="rounded px-2.5 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors">OK</button>
                <button onClick={() => setEditMood(false)} className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors">×</button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => { setMoodVal(moodKeywords.join(', ')); setEditMood(true) }}
              className="flex flex-wrap gap-2 cursor-pointer"
            >
              {moodKeywords.length === 0
                ? <span className="text-sm italic text-zinc-600">Définir le mood…</span>
                : moodKeywords.map((kw, i) => (
                  <span key={i} className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:border-zinc-500 transition-colors">
                    {kw}
                  </span>
                ))
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── L'ARÈNE ─────────────────────────────────────────────────────────────────

function AreneSection() {
  const arcs            = useWritingStore((s) => s.arcs)
  const setActiveArc    = useWritingStore((s) => s.setActiveArc)
  const addArcPhilosopher = useWritingStore((s) => s.addArcPhilosopher)
  const addArc          = useWritingStore((s) => s.addArc)
  const deleteArc       = useWritingStore((s) => s.deleteArc)
  const updateArc       = useWritingStore((s) => s.updateArc)

  const sorted          = [...arcs].sort((a, b) => a.order - b.order)
  const activeIdx       = sorted.findIndex((a) => a.isActive)
  const activePct       = sorted.length > 1 ? (activeIdx / (sorted.length - 1)) * 100 : 0

  const [editPhilosId,  setEditPhilosId]  = useState<string | null>(null)
  const [philosVal,     setPhilosVal]     = useState('')
  const [showAddArc,    setShowAddArc]    = useState(false)
  const [newArcName,    setNewArcName]    = useState('')
  const [newArcDesc,    setNewArcDesc]    = useState('')
  const [editArcId,     setEditArcId]     = useState<string | null>(null)
  const [editArcName,   setEditArcName]   = useState('')
  const [editArcDesc,   setEditArcDesc]   = useState('')

  const savePhilos = (id: string) => {
    addArcPhilosopher(id, philosVal.trim())
    setEditPhilosId(null)
  }

  const submitNewArc = () => {
    if (!newArcName.trim()) return
    addArc({ name: newArcName.trim(), description: newArcDesc.trim(), isActive: false, order: sorted.length })
    setNewArcName(''); setNewArcDesc(''); setShowAddArc(false)
  }

  const startEditArc = (arc: WritingArc) => {
    setEditArcId(arc.id)
    setEditArcName(arc.name)
    setEditArcDesc(arc.description)
  }

  const saveEditArc = (id: string) => {
    updateArc(id, { name: editArcName.trim(), description: editArcDesc.trim() })
    setEditArcId(null)
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div>
        <div className="relative h-1 w-full rounded-full bg-zinc-800">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-teal-500/60 transition-all duration-700"
            style={{ width: `${activePct}%` }}
          />
        </div>
        <div className="mt-4 flex gap-0 overflow-x-auto pb-2">
          {sorted.map((arc, i) => (
            <div key={arc.id} className="flex flex-1 min-w-[120px] flex-col items-center">
              {/* Connector line */}
              <div className="relative flex w-full items-center justify-center">
                <div className={['absolute left-0 top-1/2 h-px w-1/2 -translate-y-1/2', i === 0 ? 'bg-transparent' : arc.isActive || sorted[i - 1]?.isActive ? 'bg-teal-700' : 'bg-zinc-800'].join(' ')} />
                <button
                  onClick={() => setActiveArc(arc.id)}
                  className={[
                    'relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                    arc.isActive
                      ? 'border-teal-400 bg-teal-400/20 text-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.3)]'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-500',
                  ].join(' ')}
                >
                  {i + 1}
                </button>
                <div className={['absolute right-0 top-1/2 h-px w-1/2 -translate-y-1/2', i === sorted.length - 1 ? 'bg-transparent' : arc.isActive ? 'bg-teal-700' : 'bg-zinc-800'].join(' ')} />
              </div>

              {/* Arc info */}
              <div className="mt-3 w-full px-2 text-center">
                {editArcId === arc.id ? (
                  <div className="space-y-1.5 text-left">
                    <input
                      autoFocus
                      value={editArcName}
                      onChange={(e) => setEditArcName(e.target.value)}
                      className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-500"
                    />
                    <input
                      value={editArcDesc}
                      onChange={(e) => setEditArcDesc(e.target.value)}
                      className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-400 outline-none focus:border-zinc-500"
                    />
                    <div className="flex gap-1">
                      <button onClick={() => saveEditArc(arc.id)} className="rounded px-2 py-0.5 text-[10px] bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors">OK</button>
                      <button onClick={() => setEditArcId(null)} className="text-zinc-500 hover:text-zinc-300 text-[10px] transition-colors">×</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p
                      onDoubleClick={() => startEditArc(arc)}
                      className={['text-xs font-semibold', arc.isActive ? 'text-teal-300' : 'text-zinc-400'].join(' ')}
                    >
                      {arc.name}
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-zinc-600 line-clamp-3">
                      {arc.description}
                    </p>
                    {/* Philosopher */}
                    {editPhilosId === arc.id ? (
                      <div className="mt-2 space-y-1">
                        <input
                          autoFocus
                          value={philosVal}
                          onChange={(e) => setPhilosVal(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') savePhilos(arc.id) }}
                          placeholder="Camus, Nietzsche…"
                          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-500"
                        />
                        <div className="flex gap-1">
                          <button onClick={() => savePhilos(arc.id)} className="rounded px-2 py-0.5 text-[10px] bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors">OK</button>
                          <button onClick={() => setEditPhilosId(null)} className="text-zinc-500 hover:text-zinc-300 text-[10px] transition-colors">×</button>
                        </div>
                      </div>
                    ) : arc.philosopher ? (
                      <button
                        onClick={() => { setEditPhilosId(arc.id); setPhilosVal(arc.philosopher ?? '') }}
                        className="mt-1.5 text-[10px] italic text-zinc-600 hover:text-zinc-400 transition-colors"
                      >
                        — {arc.philosopher}
                      </button>
                    ) : (
                      <button
                        onClick={() => { setEditPhilosId(arc.id); setPhilosVal('') }}
                        className="mt-1.5 text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors"
                      >
                        + philosophe
                      </button>
                    )}
                    <div className="mt-1 flex justify-center gap-1">
                      <button
                        onClick={() => deleteArc(arc.id)}
                        className="text-[10px] text-zinc-700 hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Add arc */}
          <div className="flex flex-col items-center min-w-[80px]">
            <button
              onClick={() => setShowAddArc(true)}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-zinc-700 text-xs text-zinc-600 hover:border-zinc-500 hover:text-zinc-400 transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Add arc form */}
      {showAddArc && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <p className="text-xs font-medium text-zinc-400">Nouvel arc de transformation</p>
          <input
            autoFocus
            value={newArcName}
            onChange={(e) => setNewArcName(e.target.value)}
            placeholder="Nom de la phase…"
            className="w-full rounded-lg border border-zinc-700/60 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors"
          />
          <textarea
            value={newArcDesc}
            onChange={(e) => setNewArcDesc(e.target.value)}
            placeholder="Ce qu'Hadrie traverse dans cette phase…"
            rows={2}
            className="w-full resize-none rounded-lg border border-zinc-700/60 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors"
          />
          <div className="flex gap-2">
            <button onClick={submitNewArc} className="rounded-lg px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors">Ajouter</button>
            <button onClick={() => { setShowAddArc(false); setNewArcName(''); setNewArcDesc('') }} className="rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Annuler</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── JOURNAL D'HADRIE ─────────────────────────────────────────────────────────

function JournalSection() {
  const fragments    = useWritingStore((s) => s.fragments)
  const addFragment  = useWritingStore((s) => s.addFragment)
  const deleteFragment = useWritingStore((s) => s.deleteFragment)

  const [text,       setText]       = useState('')
  const [activeId,   setActiveId]   = useState<string | null>(null)

  const submit = () => {
    const t = text.trim()
    if (!t) return
    addFragment(t)
    setText('')
  }

  const activeFragment = fragments.find((f) => f.id === activeId)

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 space-y-4">
        <p className="text-sm italic text-zinc-400">
          Qu'est-ce qu'Hadrie ressent là, maintenant ?
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Je… (écris dans la tête d'Hadrie)"}
          rows={5}
          className="w-full resize-none rounded-lg border border-zinc-700/40 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors leading-relaxed"
        />
        <div className="flex items-center justify-between">
          <span className={['text-[10px]', text.trim().split(/\s+/).filter(Boolean).length >= 20 ? 'text-teal-500' : 'text-zinc-700'].join(' ')}>
            {text.trim().split(/\s+/).filter(Boolean).length} mots
          </span>
          <button
            onClick={submit}
            disabled={text.trim().length < 10}
            className="rounded-lg px-4 py-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Enregistrer un fragment
          </button>
        </div>
      </div>

      {/* Fragment reading modal */}
      {activeFragment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setActiveId(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600">{fmtDate(activeFragment.createdAt)}</p>
              <button onClick={() => setActiveId(null)} className="text-zinc-500 hover:text-zinc-300 transition-colors text-lg leading-none">×</button>
            </div>
            <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">{activeFragment.text}</p>
            <button
              onClick={() => { deleteFragment(activeFragment.id); setActiveId(null) }}
              className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
            >
              Supprimer ce fragment
            </button>
          </div>
        </div>
      )}

      {/* Fragments list */}
      {fragments.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">Fragments passés</p>
          {fragments.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveId(f.id)}
              className="group flex w-full items-start gap-4 rounded-lg border border-zinc-800/60 bg-zinc-900/20 px-4 py-3 text-left hover:border-zinc-700 transition-colors"
            >
              <span className="flex-shrink-0 text-[10px] text-zinc-600 tabular-nums pt-0.5">{fmtDate(f.createdAt)}</span>
              <span className="flex-1 truncate text-sm text-zinc-400 italic">
                {f.text.slice(0, 80)}{f.text.length > 80 ? '…' : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── LA SALLE DES GLADIATEURS ─────────────────────────────────────────────────

function GladiateurSection() {
  const characters    = useWritingStore((s) => s.characters)
  const addCharacter  = useWritingStore((s) => s.addCharacter)
  const deleteCharacter = useWritingStore((s) => s.deleteCharacter)
  const updateCharacter = useWritingStore((s) => s.updateCharacter)

  const [showModal, setShowModal] = useState(false)
  const [editId,    setEditId]    = useState<string | null>(null)

  const empty = { name: '', deathSurvival: '', relationToHadrie: '', revealsAboutHadrie: '', philosophy: '' }
  const [form, setForm] = useState(empty)

  const openAdd = () => { setForm(empty); setEditId(null); setShowModal(true) }
  const openEdit = (c: WritingCharacter) => {
    setForm({ name: c.name, deathSurvival: c.deathSurvival, relationToHadrie: c.relationToHadrie, revealsAboutHadrie: c.revealsAboutHadrie, philosophy: c.philosophy ?? '' })
    setEditId(c.id)
    setShowModal(true)
  }

  const submit = () => {
    if (!form.name.trim()) return
    if (editId) {
      updateCharacter(editId, form)
    } else {
      addCharacter(form)
    }
    setShowModal(false)
    setForm(empty)
    setEditId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
        >
          <span className="text-base leading-none">+</span> Nouveau personnage
        </button>
      </div>

      {characters.length === 0 ? (
        <p className="py-8 text-center text-sm italic text-zinc-600">
          Les gladiateurs attendent d'être convoqués.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="py-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Nom</th>
                <th className="py-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Mourir / Survivre</th>
                <th className="py-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Rapport à Hadrie</th>
                <th className="py-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Ce qu'il révèle</th>
                <th className="py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Philosophie</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {characters.map((c) => (
                <tr key={c.id} className="group border-b border-zinc-800/40 hover:bg-zinc-900/30 transition-colors">
                  <td className="py-3 pr-4 font-medium text-zinc-200 align-top whitespace-nowrap">{c.name}</td>
                  <td className="py-3 pr-4 text-xs text-zinc-400 align-top max-w-[160px]">{c.deathSurvival}</td>
                  <td className="py-3 pr-4 text-xs text-zinc-400 align-top max-w-[160px]">{c.relationToHadrie}</td>
                  <td className="py-3 pr-4 text-xs text-zinc-400 align-top max-w-[160px]">{c.revealsAboutHadrie}</td>
                  <td className="py-3 pr-4 text-xs italic text-zinc-600 align-top whitespace-nowrap">{c.philosophy || '—'}</td>
                  <td className="py-3 align-top">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(c)} className="text-zinc-600 hover:text-zinc-300 transition-colors text-xs">✎</button>
                      <button onClick={() => deleteCharacter(c.id)} className="text-zinc-600 hover:text-red-400 transition-colors text-xs">×</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-200">
                {editId ? 'Modifier le personnage' : 'Nouveau gladiateur'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors text-lg leading-none">×</button>
            </div>
            <div className="space-y-3">
              {[
                { key: 'name',               label: 'Nom',                          placeholder: 'Marcus…' },
                { key: 'deathSurvival',       label: 'Façon de mourir / survivre',   placeholder: 'Il choisit de mourir debout plutôt que…' },
                { key: 'relationToHadrie',    label: 'Rapport à Hadrie',             placeholder: 'Miroir, ennemi, allié…' },
                { key: 'revealsAboutHadrie',  label: "Ce qu'il révèle sur Hadrie",   placeholder: 'Sa présence force Hadrie à…' },
                { key: 'philosophy',          label: 'Philosophie implicite',        placeholder: 'Stoïcisme, absurde…' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="mb-1 block text-[10px] uppercase tracking-widest text-zinc-600">{label}</label>
                  {key === 'deathSurvival' || key === 'revealsAboutHadrie' ? (
                    <textarea
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      rows={2}
                      className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
                    />
                  ) : (
                    <input
                      autoFocus={key === 'name'}
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={submit}
                disabled={!form.name.trim()}
                className="flex-1 rounded-lg py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editId ? 'Modifier' : 'Convoquer'}
              </button>
              <button onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── LE SIGNAL ────────────────────────────────────────────────────────────────

function SignalSection() {
  const dailySessions    = useWritingStore((s) => s.dailySessions)
  const recordDailySession = useWritingStore((s) => s.recordDailySession)

  const [text,       setText]       = useState('')
  const [showWrite,  setShowWrite]  = useState(false)
  const [expandId,   setExpandId]   = useState<string | null>(null)

  const todayStr    = today()
  const wroteToday  = dailySessions.some((d) => d.date === todayStr)

  // Count sessions in current month
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthCount = dailySessions.filter((d) => d.date.startsWith(thisMonth)).length

  const submit = () => {
    const t = text.trim()
    if (!t) return
    recordDailySession(t)
    setText('')
    setShowWrite(false)
  }

  const recentSessions = [...dailySessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)

  return (
    <div className="space-y-5">
      {/* Pulse */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/20 px-5 py-4">
        <div>
          <p className={['text-sm', wroteToday ? 'text-teal-300' : 'italic text-zinc-400'].join(' ')}>
            {wroteToday
              ? "Hadrie a survécu aujourd'hui."
              : 'Hadrie a survécu hier. Et aujourd\'hui ?'}
          </p>
          <p className="mt-0.5 text-[10px] text-zinc-600">
            {monthCount > 0
              ? `✓ ${monthCount} jour${monthCount > 1 ? 's' : ''} écrits ce mois`
              : 'Pas encore écrit ce mois'}
          </p>
        </div>
        <button
          onClick={() => setShowWrite(!showWrite)}
          className={[
            'rounded-lg px-4 py-2 text-xs font-medium transition-colors',
            wroteToday
              ? 'border border-teal-500/30 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200',
          ].join(' ')}
        >
          {wroteToday ? 'Ajouter' : 'Écrire 1 paragraphe'}
        </button>
      </div>

      {showWrite && (
        <div className="space-y-3">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Un paragraphe. Juste un."
            rows={4}
            className="w-full resize-none rounded-xl border border-zinc-700/40 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors leading-relaxed"
          />
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={!text.trim()}
              className="rounded-lg px-4 py-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Enregistrer
            </button>
            <button onClick={() => { setShowWrite(false); setText('') }} className="rounded-lg px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Sessions log */}
      {recentSessions.length > 0 && (
        <div className="space-y-1">
          {recentSessions.map((s) => (
            <div key={s.id} className="rounded-lg border border-zinc-800/40 bg-zinc-900/20">
              <button
                onClick={() => setExpandId(expandId === s.id ? null : s.id)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left"
              >
                <span className="text-xs text-zinc-500 tabular-nums">{fmtDate(s.date)}</span>
                <span className="text-[10px] text-zinc-700">{expandId === s.id ? '▲' : '▼'}</span>
              </button>
              {expandId === s.id && (
                <p className="border-t border-zinc-800/40 px-4 py-3 text-sm leading-relaxed text-zinc-400">
                  {s.text}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── LA BIBLIOTHÈQUE DE L'ABSURDE ─────────────────────────────────────────────

const CITATION_TYPE_LABELS: Record<WritingCitation['type'], string> = {
  citation:  'Citation',
  extract:   'Extrait',
  reference: 'Référence',
}

const KNOWN_AUTHORS = ['Camus', 'Nietzsche', 'Dostoïevski', 'Kafka', 'Sartre', 'Autre']

function BiblioSection() {
  const citations      = useWritingStore((s) => s.citations)
  const addCitation    = useWritingStore((s) => s.addCitation)
  const deleteCitation = useWritingStore((s) => s.deleteCitation)

  // List state
  const [filter,       setFilter]       = useState<WritingCitation['type'] | 'all'>('all')
  const [expandId,     setExpandId]     = useState<string | null>(null)
  const [confirmDelId, setConfirmDelId] = useState<string | null>(null)

  // Modal state
  const [showModal,    setShowModal]    = useState(false)
  const [type,         setType]         = useState<WritingCitation['type']>('citation')
  const [textVal,      setTextVal]      = useState('')
  const [authorSelect, setAuthorSelect] = useState('Camus')
  const [authorCustom, setAuthorCustom] = useState('')
  const [ownExtract,   setOwnExtract]   = useState(false)
  const [submitted,    setSubmitted]    = useState(false)

  const resetModal = () => {
    setTextVal(''); setAuthorSelect('Camus'); setAuthorCustom('')
    setOwnExtract(false); setSubmitted(false)
  }

  const closeModal = () => { resetModal(); setShowModal(false) }

  const openModal = (t: WritingCitation['type']) => {
    resetModal(); setType(t); setShowModal(true)
  }

  const resolvedAuthor = ownExtract
    ? undefined
    : authorSelect === 'Autre'
    ? authorCustom.trim() || undefined
    : authorSelect

  const submit = () => {
    if (!textVal.trim() || submitted) return
    addCitation({
      type,
      text:       textVal.trim(),
      author:     resolvedAuthor,
      ownExtract: ownExtract || undefined,
    })
    setSubmitted(true)
  }

  const filtered = filter === 'all' ? citations : citations.filter((c) => c.type === filter)

  return (
    <div className="space-y-4">
      {/* Filter + Add buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'citation', 'extract', 'reference'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              'rounded-lg px-3 py-1 text-xs font-medium transition-colors',
              filter === f ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300',
            ].join(' ')}
          >
            {f === 'all' ? 'Tout' : CITATION_TYPE_LABELS[f]}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {(['citation', 'extract', 'reference'] as const).map((t) => (
            <button
              key={t}
              onClick={() => openModal(t)}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
            >
              <span className="leading-none">+</span> {CITATION_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm italic text-zinc-600">
          La bibliothèque est vide. Elle attend tes offrandes.
        </p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((c) => (
            <div key={c.id} className="group rounded-xl border border-zinc-800/60 bg-zinc-900/20">
              {/* Row */}
              <div className="flex w-full items-start gap-3 px-4 py-3">
                {/* Type badge + expand toggle */}
                <button
                  onClick={() => setExpandId(expandId === c.id ? null : c.id)}
                  className="flex flex-1 items-start gap-3 text-left"
                >
                  <span className={[
                    'flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider mt-0.5',
                    c.type === 'citation'  ? 'bg-indigo-500/15 text-indigo-400' :
                    c.type === 'extract'   ? 'bg-teal-500/15 text-teal-400' :
                                             'bg-zinc-700/60 text-zinc-400',
                  ].join(' ')}>
                    {c.ownExtract ? 'Ma plume' : CITATION_TYPE_LABELS[c.type]}
                  </span>
                  <span className="flex-1 text-sm text-zinc-400 line-clamp-2">
                    {c.type === 'citation'
                      ? <span className="italic text-zinc-500">"{c.text.slice(0, 60)}{c.text.length > 60 ? '…' : ''}"</span>
                      : <span>{c.text.slice(0, 80)}{c.text.length > 80 ? '…' : ''}</span>
                    }
                  </span>
                  {c.author && (
                    <span className="flex-shrink-0 text-[10px] italic text-zinc-600">— {c.author}</span>
                  )}
                </button>

                {/* Delete button */}
                {confirmDelId === c.id ? (
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      onClick={() => { deleteCitation(c.id); setConfirmDelId(null); setExpandId(null) }}
                      className="rounded px-2 py-0.5 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => setConfirmDelId(null)}
                      className="px-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelId(c.id)}
                    className="flex-shrink-0 mt-0.5 rounded p-1 text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Supprimer"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Expanded text */}
              {expandId === c.id && (
                <div className="border-t border-zinc-800/40 px-4 py-3">
                  <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
                    {c.type === 'citation' ? `"${c.text}"` : c.text}
                  </p>
                  {c.author && <p className="mt-1.5 text-xs italic text-zinc-500">— {c.author}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-200">
                Ajouter — {CITATION_TYPE_LABELS[type]}
              </h3>
              <button onClick={closeModal} className="text-zinc-500 hover:text-zinc-300 transition-colors text-lg leading-none">×</button>
            </div>

            {/* Type selector */}
            <div className="flex gap-1">
              {(['citation', 'extract', 'reference'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={[
                    'flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors',
                    type === t ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-800',
                  ].join(' ')}
                >
                  {CITATION_TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {/* Text */}
              <textarea
                autoFocus
                value={textVal}
                onChange={(e) => setTextVal(e.target.value)}
                placeholder={
                  type === 'citation'  ? 'Il faut imaginer Sisyphe heureux…'
                  : type === 'extract' ? 'Ton propre extrait…'
                  : 'Description / référence visuelle…'
                }
                rows={4}
                className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
              />

              {/* Own extract checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ownExtract}
                  onChange={(e) => setOwnExtract(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-indigo-500"
                />
                <span className="text-xs text-zinc-400">C'est un extrait de ma propre plume</span>
              </label>

              {/* Author dropdown — hidden when own extract */}
              {!ownExtract && type === 'citation' && (
                <div className="space-y-2">
                  <select
                    value={authorSelect}
                    onChange={(e) => setAuthorSelect(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 outline-none focus:border-zinc-600 transition-colors"
                  >
                    {KNOWN_AUTHORS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  {authorSelect === 'Autre' && (
                    <input
                      value={authorCustom}
                      onChange={(e) => setAuthorCustom(e.target.value)}
                      placeholder="Nom de l'auteur…"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={submit}
                disabled={!textVal.trim() || submitted}
                className={[
                  'flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors',
                  submitted
                    ? 'bg-green-500/15 text-green-400 border border-green-500/25 cursor-default'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed',
                ].join(' ')}
              >
                {submitted ? '✓ Enregistrée' : 'Ajouter à la bibliothèque'}
              </button>
              <button onClick={closeModal} className="rounded-lg px-4 py-2.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── WritingView ──────────────────────────────────────────────────────────────

export function WritingView() {
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const scrollTo = (id: string) => {
    setActiveSection(id)
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="space-y-1">

      {/* Sticky section nav */}
      <div className="sticky top-0 z-20 -mx-4 bg-zinc-950/90 px-4 py-2 backdrop-blur border-b border-zinc-800/60 mb-6">
        <div className="flex gap-1 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={[
                'flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                activeSection === s.id
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300',
              ].join(' ')}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Le Pouls du Roman ───────────────────────────────────────────────── */}
      <div ref={(el) => { sectionRefs.current['pouls'] = el }} className="scroll-mt-16 pb-12">
        <SectionTitle id="pouls" label="Le Pouls du Roman" />
        <PoulsDuRoman />
      </div>

      {/* ── L'Arène ─────────────────────────────────────────────────────────── */}
      <div ref={(el) => { sectionRefs.current['arene'] = el }} className="scroll-mt-16 pb-12">
        <SectionTitle id="arene" label="L'Arène — Métamorphose d'Hadrie" />
        <AreneSection />
      </div>

      {/* ── Journal d'Hadrie ────────────────────────────────────────────────── */}
      <div ref={(el) => { sectionRefs.current['journal'] = el }} className="scroll-mt-16 pb-12">
        <SectionTitle id="journal" label="Journal d'Hadrie" />
        <JournalSection />
      </div>

      {/* ── Salle des Gladiateurs ───────────────────────────────────────────── */}
      <div ref={(el) => { sectionRefs.current['gladiateurs'] = el }} className="scroll-mt-16 pb-12">
        <SectionTitle id="gladiateurs" label="La Salle des Gladiateurs" />
        <GladiateurSection />
      </div>

      {/* ── Le Signal ───────────────────────────────────────────────────────── */}
      <div ref={(el) => { sectionRefs.current['signal'] = el }} className="scroll-mt-16 pb-12">
        <SectionTitle id="signal" label="Le Signal" />
        <SignalSection />
      </div>

      {/* ── Bibliothèque de l'Absurde ───────────────────────────────────────── */}
      <div ref={(el) => { sectionRefs.current['biblio'] = el }} className="scroll-mt-16 pb-12">
        <SectionTitle id="biblio" label="La Bibliothèque de l'Absurde" />
        <BiblioSection />
      </div>

    </div>
  )
}
