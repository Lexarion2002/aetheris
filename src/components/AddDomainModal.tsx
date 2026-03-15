import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store'
import { getDomainColors } from '../utils/domainColors'
import type { DomainColor } from '../types'

const COLORS: DomainColor[] = ['teal', 'blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'gray']

const EMOJI_SUGGESTIONS = [
  '🏃', '💼', '💰', '📚', '🤝', '🎨', '🧘', '❤️',
  '🌱', '🎯', '⚡', '🌟', '🔥', '💡', '🎵', '✈️',
  '🏠', '🍎', '🎮', '📝', '🌍', '💪', '🧠', '🎓',
  '🔬', '🛠️', '📊', '🎤', '🌈', '🦋', '🏆', '🧩',
]

interface AddDomainModalProps {
  onClose: () => void
}

export function AddDomainModal({ onClose }: AddDomainModalProps) {
  const addDomain = useStore((s) => s.addDomain)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('✦')
  const [color, setColor] = useState<DomainColor>('teal')

  const canSubmit = name.trim().length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    addDomain({ name: name.trim(), description: description.trim(), icon, color })
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Ajouter un domaine"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panneau */}
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-100">Nouveau domaine</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-xs"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* Prévisualisation */}
          <div className={['flex items-center gap-3 rounded-xl border p-3', getDomainColors(color).bgMuted, getDomainColors(color).border].join(' ')}>
            <span className={['flex h-10 w-10 items-center justify-center rounded-lg text-2xl', getDomainColors(color).bg].join(' ')}>
              {icon}
            </span>
            <div>
              <p className={['text-sm font-semibold', getDomainColors(color).text].join(' ')}>
                {name || 'Nom du domaine'}
              </p>
              <p className="text-xs text-zinc-600 truncate max-w-xs">
                {description || 'Description…'}
              </p>
            </div>
          </div>

          {/* Nom */}
          <Field label="Nom">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Sport, Projets perso…"
              maxLength={32}
              autoFocus
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/30 transition-colors"
            />
          </Field>

          {/* Description */}
          <Field label="Description (optionnel)">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Courte description du domaine"
              maxLength={80}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/30 transition-colors"
            />
          </Field>

          {/* Icône */}
          <Field label="Icône">
            <div className="space-y-2">
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value.slice(-2) || '✦')}
                className="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-lg text-zinc-100 outline-none focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/30 transition-colors"
              />
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_SUGGESTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={[
                      'flex h-8 w-8 items-center justify-center rounded-lg text-base transition-colors',
                      icon === emoji
                        ? 'bg-teal-500/20 ring-1 ring-teal-500/40'
                        : 'bg-zinc-800 hover:bg-zinc-700',
                    ].join(' ')}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </Field>

          {/* Couleur */}
          <Field label="Couleur">
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => {
                const { dot } = getDomainColors(c)
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={[
                      'flex h-7 w-7 items-center justify-center rounded-full transition-all',
                      color === c ? 'ring-2 ring-offset-2 ring-offset-zinc-900 ring-white/40 scale-110' : 'hover:scale-105',
                    ].join(' ')}
                    title={c}
                  >
                    <span className={['block h-4 w-4 rounded-full', dot].join(' ')} />
                  </button>
                )
              })}
            </div>
          </Field>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Créer le domaine
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}
