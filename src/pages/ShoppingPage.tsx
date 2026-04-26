import { useState, useMemo, useRef } from 'react'
import { useShoppingStore } from '../store/shoppingStore'
import type { ShoppingItem, BoughtItem, ShoppingCategory, ShoppingPriority, ShoppingVerdict } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITIES: ShoppingPriority[] = ['Envie', 'Besoin', 'Urgent']

const CAT_SWATCHES = [
  '#B5532A', '#EAD1BE', '#7E9A7A', '#D5DFD0',
  '#6B5B48', '#DFD2B5', '#A08B72', '#3A2E22',
]
const VERDICTS:   ShoppingVerdict[]  = ['Satisfait', 'Mitigé', 'Déçu']

const priorityChipStyle: Record<ShoppingPriority, React.CSSProperties> = {
  Envie:  { background: 'var(--paper-2)',    color: 'var(--fg-muted)',   border: '1px solid var(--border)' },
  Besoin: { background: 'var(--terra-soft)', color: 'var(--terra-deep)', border: '1px solid var(--terra)' },
  Urgent: { background: 'rgba(155,58,28,.12)', color: 'var(--danger)',   border: '1px solid var(--danger)' },
}

const verdictChipStyle: Record<ShoppingVerdict, React.CSSProperties> = {
  Satisfait: { background: 'var(--sage-soft)', color: 'var(--sage-deep)', border: '1px solid #B9C8B4' },
  Mitigé:    { background: 'rgba(192,106,47,.12)', color: 'var(--warn)', border: '1px solid var(--warn)' },
  Déçu:      { background: 'rgba(155,58,28,.12)', color: 'var(--danger)', border: '1px solid var(--danger)' },
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

// ─── ImagePlaceholder ─────────────────────────────────────────────────────────

function ImagePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center" style={{ background: 'var(--paper-2)', color: 'var(--fg-subtle)' }}>
      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
      </svg>
    </div>
  )
}

// ─── ModalAddItem ─────────────────────────────────────────────────────────────

interface ModalAddItemProps {
  initial?:   ShoppingItem
  categories: ShoppingCategory[]
  onSave:     (data: Omit<ShoppingItem, 'id' | 'createdAt'>) => void
  onClose:    () => void
  onNewCat:   (name: string, color: string) => ShoppingCategory
}

function ModalAddItem({ initial, categories, onSave, onClose, onNewCat }: ModalAddItemProps) {
  const [name,       setName]       = useState(initial?.name       ?? '')
  const [brand,      setBrand]      = useState(initial?.brand      ?? '')
  const [price,      setPrice]      = useState(initial?.price?.toString() ?? '')
  const [imageUrl,   setImageUrl]   = useState(initial?.imageUrl   ?? '')
  const [link,       setLink]       = useState(initial?.link       ?? '')
  const [notes,      setNotes]      = useState(initial?.notes      ?? '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [priority,   setPriority]   = useState<ShoppingPriority>(initial?.priority ?? 'Envie')
  const [newCatName,  setNewCatName]  = useState('')
  const [newCatColor, setNewCatColor] = useState(CAT_SWATCHES[0])
  const [showNewCat,  setShowNewCat]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => setImageUrl(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleCreateCat = () => {
    if (!newCatName.trim()) return
    const cat = onNewCat(newCatName.trim(), newCatColor)
    setCategoryId(cat.id)
    setNewCatName('')
    setShowNewCat(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !price) return
    onSave({
      name:       name.trim(),
      brand:      brand.trim() || undefined,
      price:      parseFloat(price),
      imageUrl:   imageUrl || undefined,
      link:       link.trim() || undefined,
      notes:      notes.trim() || undefined,
      categoryId: categoryId || undefined,
      priority,
    })
    onClose()
  }

  const inputCls = 'w-full rounded-[var(--r-md)] px-3 py-2 text-sm outline-none transition-colors bg-[var(--bg)] border border-[var(--border)] text-[var(--fg)] focus:border-[var(--terra)] placeholder:text-[var(--fg-subtle)]'
  const labelCls = 'mb-1.5 block text-[var(--fs-sm)] text-[var(--fg-muted)]'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(58,46,34,0.4)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)' }}
      >
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--fg)', margin: 0 }}>
          {initial ? "Modifier l'article" : 'Nouvel article'}
        </h2>

        {/* Image upload */}
        <div>
          <label className={labelCls}>Image</label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])} />
          {imageUrl ? (
            <div className="relative w-full aspect-[3/1] rounded-xl overflow-hidden">
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => setImageUrl('')}
                className="absolute top-2 right-2 rounded-full p-1 transition-colors"
                style={{ background: 'rgba(58,46,34,0.7)', color: 'var(--paper-1)' }}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-6 text-sm transition-colors"
              style={{ border: '1px dashed var(--border)', color: 'var(--fg-muted)', background: 'transparent' }}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Ajouter une image
            </button>
          )}
        </div>

        {/* Nom + Marque */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Nom *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className={inputCls} placeholder="Ex : Air Jordan 1" />
          </div>
          <div>
            <label className={labelCls}>Marque</label>
            <input value={brand} onChange={(e) => setBrand(e.target.value)}
              className={inputCls} placeholder="Ex : Nike" />
          </div>
        </div>

        {/* Prix */}
        <div>
          <label className={labelCls}>Prix (€) *</label>
          <input type="number" min="0" step="0.01" value={price}
            onChange={(e) => setPrice(e.target.value)} required
            className={inputCls} placeholder="0" />
        </div>

        {/* Lien */}
        <div>
          <label className={labelCls}>Lien</label>
          <input value={link} onChange={(e) => setLink(e.target.value)}
            className={inputCls} placeholder="https://..." />
        </div>

        {/* Catégorie */}
        <div>
          <label className={labelCls}>Catégorie</label>
          <div className="flex gap-2">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className={inputCls + ' flex-1'}>
              <option value="">Aucune</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="button" onClick={() => setShowNewCat((v) => !v)}
              className="rounded-[var(--r-md)] px-3 py-2 text-xs transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--fg-muted)', background: 'transparent', cursor: 'pointer' }}>
              + Créer
            </button>
          </div>
          {showNewCat && (
            <div className="mt-3 space-y-2">
              <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                className={inputCls} placeholder="Nom de la catégorie" />
              {/* Swatches design system */}
              <div>
                <p className="text-[11px] mb-1.5" style={{ color: 'var(--fg-muted)' }}>Couleur</p>
                <div className="grid grid-cols-4 gap-2" style={{ width: 'fit-content' }}>
                  {CAT_SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCatColor(color)}
                      className="h-7 w-7 rounded-full transition-all"
                      style={{
                        backgroundColor: color,
                        outline: newCatColor === color ? `2px solid var(--terra)` : '2px solid transparent',
                        outlineOffset: 2,
                        transform: newCatColor === color ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={handleCreateCat}
                  className="px-4 py-1.5 text-xs font-medium transition-colors"
                  style={{ background: 'var(--terra)', color: 'var(--paper-1)', borderRadius: 'var(--r-full)', border: 'none', cursor: 'pointer' }}>
                  OK
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Priorité */}
        <div>
          <label className={labelCls}>Priorité</label>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button key={p} type="button" onClick={() => setPriority(p)}
                className="flex-1 rounded-[var(--r-md)] py-2 text-xs font-medium transition-colors"
                style={priority === p
                  ? { background: 'var(--terra-soft)', border: '1px solid var(--terra)', color: 'var(--terra-deep)', cursor: 'pointer' }
                  : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg-muted)', cursor: 'pointer' }
                }>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={labelCls}>Note personnelle</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className={inputCls + ' resize-none'}
            placeholder="Pourquoi tu veux ça…" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2 text-sm transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--fg-muted)', background: 'transparent', borderRadius: 'var(--r-md)', cursor: 'pointer' }}>
            Annuler
          </button>
          <button type="submit"
            className="flex-1 py-2 text-sm font-medium transition-colors"
            style={{ background: 'var(--terra)', color: 'var(--paper-1)', borderRadius: 'var(--r-full)', border: 'none', cursor: 'pointer' }}>
            {initial ? 'Mettre à jour' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── ModalBuyItem ─────────────────────────────────────────────────────────────

interface ModalBuyItemProps {
  item:    ShoppingItem
  onBuy:   (pricePaid: number, boughtDate: string, verdict: ShoppingVerdict) => void
  onClose: () => void
}

function ModalBuyItem({ item, onBuy, onClose }: ModalBuyItemProps) {
  const [pricePaid,  setPricePaid]  = useState(item.price.toString())
  const [boughtDate, setBoughtDate] = useState(new Date().toISOString().split('T')[0])
  const [verdict,    setVerdict]    = useState<ShoppingVerdict>('Satisfait')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onBuy(parseFloat(pricePaid), boughtDate, verdict)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl flex flex-col gap-4"
      >
        <h2 className="text-base font-semibold text-zinc-100">Valider l'achat</h2>

        <div className="rounded-xl bg-zinc-800/60 p-3">
          <p className="text-sm font-medium text-zinc-200">{item.name}</p>
          {item.brand && <p className="text-xs text-zinc-500">{item.brand}</p>}
          <p className="mt-1 text-sm text-sky-400">{fmt(item.price)}</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-zinc-500">Prix payé (€)</label>
          <input type="number" min="0" step="0.01" value={pricePaid} onChange={(e) => setPricePaid(e.target.value)} required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-zinc-500">Date d'achat</label>
          <input type="date" value={boughtDate} onChange={(e) => setBoughtDate(e.target.value)} required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-zinc-500">Verdict</label>
          <div className="flex gap-2">
            {VERDICTS.map((v) => (
              <button key={v} type="button" onClick={() => setVerdict(v)}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                  verdict === v
                    ? v === 'Satisfait' ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
                    : v === 'Mitigé' ? 'border-amber-500/50 bg-amber-500/20 text-amber-400'
                    : 'border-red-500/50 bg-red-500/20 text-red-400'
                    : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                }`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            Annuler
          </button>
          <button type="submit"
            className="flex-1 rounded-lg bg-sky-500 py-2 text-sm font-medium text-white hover:bg-sky-400 transition-colors">
            Valider l'achat
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── ModalCategories ──────────────────────────────────────────────────────────

interface ModalCategoriesProps {
  categories:   ShoppingCategory[]
  wishlist:     ShoppingItem[]
  bought:       BoughtItem[]
  onAdd:        (name: string, color: string) => void
  onUpdate:     (id: string, updates: Partial<Omit<ShoppingCategory, 'id'>>) => void
  onDelete:     (id: string) => void
  onClose:      () => void
}

function ModalCategories({ categories, wishlist, bought, onAdd, onUpdate, onDelete, onClose }: ModalCategoriesProps) {
  const [newName,    setNewName]    = useState('')
  const [newColor,   setNewColor]   = useState('#0EA5E9')
  const [editId,     setEditId]     = useState<string | null>(null)
  const [editName,   setEditName]   = useState('')
  const [editColor,  setEditColor]  = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const countItems = (id: string) =>
    wishlist.filter((i) => i.categoryId === id).length + bought.filter((i) => i.categoryId === id).length

  const handleAdd = () => {
    if (!newName.trim()) return
    onAdd(newName.trim(), newColor)
    setNewName('')
    setNewColor('#0EA5E9')
  }

  const startEdit = (cat: ShoppingCategory) => {
    setEditId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color)
  }

  const saveEdit = () => {
    if (!editId || !editName.trim()) return
    onUpdate(editId, { name: editName.trim(), color: editColor })
    setEditId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-zinc-100">Gérer les catégories</h2>

        {/* Liste */}
        <div className="flex flex-col gap-2">
          {categories.length === 0 && (
            <p className="text-sm text-zinc-600 text-center py-4">Aucune catégorie</p>
          )}
          {categories.map((cat) => {
            const count = countItems(cat.id)
            return editId === cat.id ? (
              <div key={cat.id} className="flex gap-2 items-center">
                <input value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60" />
                <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800 p-1" />
                <button onClick={saveEdit}
                  className="rounded-lg bg-sky-500/15 px-3 py-2 text-xs text-sky-400 hover:bg-sky-500/25 transition-colors">
                  OK
                </button>
              </div>
            ) : confirmDel === cat.id ? (
              <div key={cat.id} className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
                <span className="flex-1 text-xs text-red-400">
                  Supprimer "{cat.name}" ? ({count} article{count > 1 ? 's' : ''})
                </span>
                <button onClick={() => { onDelete(cat.id); setConfirmDel(null) }}
                  className="rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-400 hover:bg-red-500/30 transition-colors">
                  Oui
                </button>
                <button onClick={() => setConfirmDel(null)}
                  className="rounded-lg bg-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-600 transition-colors">
                  Non
                </button>
              </div>
            ) : (
              <div key={cat.id} className="flex items-center gap-3 rounded-xl bg-zinc-800/60 px-3 py-2">
                <div className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="flex-1 text-sm text-zinc-200">{cat.name}</span>
                <span className="text-xs text-zinc-600">{count} article{count > 1 ? 's' : ''}</span>
                <button onClick={() => startEdit(cat)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button onClick={() => setConfirmDel(cat.id)} className="text-zinc-500 hover:text-red-400 transition-colors">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>

        {/* Nouvelle catégorie */}
        <div className="border-t border-zinc-800 pt-4">
          <p className="mb-2 text-xs text-zinc-500">Nouvelle catégorie</p>
          <div className="flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60"
              placeholder="Nom…" />
            <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800 p-1" />
            <button onClick={handleAdd}
              className="rounded-lg bg-sky-500/15 px-3 py-2 text-xs text-sky-400 hover:bg-sky-500/25 transition-colors">
              + Ajouter
            </button>
          </div>
        </div>

        <button onClick={onClose}
          className="mt-1 w-full rounded-lg border border-zinc-700 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          Fermer
        </button>
      </div>
    </div>
  )
}

// ─── ShoppingCard (wishlist) ──────────────────────────────────────────────────

interface ShoppingCardProps {
  item:       ShoppingItem
  categories: ShoppingCategory[]
  onEdit:     () => void
  onDelete:   () => void
  onBuy:      () => void
  onCatFilter:(id: string) => void
}

function ShoppingCard({ item, categories, onEdit, onDelete, onBuy, onCatFilter }: ShoppingCardProps) {
  const cat = categories.find((c) => c.id === item.categoryId)

  return (
    <div className="group flex flex-col overflow-hidden transition-colors"
      style={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', background: 'var(--bg-elev)' }}>
      <div className="aspect-square w-full">
        {item.imageUrl
          ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
          : <ImagePlaceholder />
        }
      </div>

      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" style={{ color: 'var(--fg)' }}>{item.name}</p>
            {item.brand && <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{item.brand}</p>}
          </div>
          {item.link && (
            <a href={item.link} target="_blank" rel="noopener noreferrer"
              className="shrink-0 transition-colors" style={{ color: 'var(--fg-muted)' }} title="Voir le lien">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>

        <p className="text-lg font-semibold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--terra)', fontVariantNumeric: 'tabular-nums' }}>
          {fmt(item.price)}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={priorityChipStyle[item.priority]}>
            {item.priority}
          </span>
          {cat && (
            <button onClick={() => onCatFilter(cat.id)}
              className="rounded-full px-2 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-70"
              style={{ backgroundColor: cat.color + '22', color: cat.color }}>
              {cat.name}
            </button>
          )}
        </div>

        {item.notes && (
          <p className="text-[11px] line-clamp-2" style={{ color: 'var(--fg-subtle)' }}>{item.notes}</p>
        )}

        <div className="mt-1 flex gap-2">
          <button onClick={onBuy}
            className="flex-1 py-1.5 text-xs font-medium transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--paper-1)', borderRadius: 'var(--r-full)', border: 'none', cursor: 'pointer' }}>
            Acheter
          </button>
          <button onClick={onEdit}
            className="rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-[var(--paper-2)]"
            style={{ color: 'var(--fg-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button onClick={onDelete}
            className="rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-[var(--paper-2)]"
            style={{ color: 'var(--fg-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── BoughtCard ───────────────────────────────────────────────────────────────

interface BoughtCardProps {
  item:       BoughtItem
  categories: ShoppingCategory[]
  onEdit:     () => void
  onDelete:   () => void
  onCatFilter:(id: string) => void
}

function BoughtCard({ item, categories, onEdit, onDelete, onCatFilter }: BoughtCardProps) {
  const cat = categories.find((c) => c.id === item.categoryId)

  return (
    <div className="flex flex-col overflow-hidden transition-colors"
      style={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', background: 'var(--bg-elev)' }}>
      <div className="aspect-square w-full">
        {item.imageUrl
          ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
          : <ImagePlaceholder />
        }
      </div>

      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" style={{ color: 'var(--fg)' }}>{item.name}</p>
            {item.brand && <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{item.brand}</p>}
          </div>
          {item.link && (
            <a href={item.link} target="_blank" rel="noopener noreferrer"
              className="shrink-0 transition-colors" style={{ color: 'var(--fg-muted)' }}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          <p className="text-lg font-semibold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--terra)', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(item.pricePaid)}
          </p>
          {item.pricePaid !== item.price && (
            <p className="text-xs line-through" style={{ color: 'var(--fg-subtle)' }}>{fmt(item.price)}</p>
          )}
        </div>

        <p className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>Acheté le {fmtDate(item.boughtDate)}</p>

        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={verdictChipStyle[item.verdict]}>
            {item.verdict}
          </span>
          {cat && (
            <button onClick={() => onCatFilter(cat.id)}
              className="rounded-full px-2 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-70"
              style={{ backgroundColor: cat.color + '22', color: cat.color }}>
              {cat.name}
            </button>
          )}
        </div>

        {item.notes && <p className="text-[11px] line-clamp-2" style={{ color: 'var(--fg-subtle)' }}>{item.notes}</p>}

        <div className="mt-1 flex gap-2">
          <button onClick={onEdit}
            className="flex-1 rounded-lg py-1.5 text-xs transition-colors hover:bg-[var(--paper-2)]"
            style={{ color: 'var(--fg-muted)', background: 'var(--paper-2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            Éditer verdict
          </button>
          <button onClick={onDelete}
            className="rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-[var(--paper-2)]"
            style={{ color: 'var(--fg-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ModalEditBought ──────────────────────────────────────────────────────────

interface ModalEditBoughtProps {
  item:    BoughtItem
  onSave:  (updates: Partial<Pick<BoughtItem, 'verdict' | 'pricePaid' | 'boughtDate' | 'notes'>>) => void
  onClose: () => void
}

function ModalEditBought({ item, onSave, onClose }: ModalEditBoughtProps) {
  const [pricePaid,  setPricePaid]  = useState(item.pricePaid.toString())
  const [boughtDate, setBoughtDate] = useState(item.boughtDate)
  const [verdict,    setVerdict]    = useState<ShoppingVerdict>(item.verdict)
  const [notes,      setNotes]      = useState(item.notes ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ pricePaid: parseFloat(pricePaid), boughtDate, verdict, notes: notes.trim() || undefined })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl flex flex-col gap-4">
        <h2 className="text-base font-semibold text-zinc-100">Éditer l'achat</h2>

        <div>
          <label className="mb-1.5 block text-xs text-zinc-500">Prix payé (€)</label>
          <input type="number" min="0" step="0.01" value={pricePaid} onChange={(e) => setPricePaid(e.target.value)} required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-zinc-500">Date d'achat</label>
          <input type="date" value={boughtDate} onChange={(e) => setBoughtDate(e.target.value)} required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-zinc-500">Verdict</label>
          <div className="flex gap-2">
            {VERDICTS.map((v) => (
              <button key={v} type="button" onClick={() => setVerdict(v)}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                  verdict === v
                    ? v === 'Satisfait' ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
                    : v === 'Mitigé' ? 'border-amber-500/50 bg-amber-500/20 text-amber-400'
                    : 'border-red-500/50 bg-red-500/20 text-red-400'
                    : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                }`}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-zinc-500">Note personnelle</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            Annuler
          </button>
          <button type="submit"
            className="flex-1 rounded-lg bg-sky-500 py-2 text-sm font-medium text-white hover:bg-sky-400 transition-colors">
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── SortSelect ───────────────────────────────────────────────────────────────

type SortKey = 'priority' | 'price_asc' | 'price_desc' | 'category' | 'date_desc'

function sortItems<T extends ShoppingItem>(items: T[], key: SortKey, categories: ShoppingCategory[]): T[] {
  const priorityOrder: Record<ShoppingPriority, number> = { Urgent: 0, Besoin: 1, Envie: 2 }
  return [...items].sort((a, b) => {
    switch (key) {
      case 'priority':   return priorityOrder[a.priority] - priorityOrder[b.priority]
      case 'price_asc':  return a.price - b.price
      case 'price_desc': return b.price - a.price
      case 'date_desc':  return b.createdAt.localeCompare(a.createdAt)
      case 'category': {
        const ca = categories.find((c) => c.id === a.categoryId)?.name ?? ''
        const cb = categories.find((c) => c.id === b.categoryId)?.name ?? ''
        return ca.localeCompare(cb)
      }
      default: return 0
    }
  })
}

// ─── ShoppingPage ─────────────────────────────────────────────────────────────

export function ShoppingPage() {
  const {
    wishlist, bought, categories,
    addWishlistItem, updateWishlistItem, removeWishlistItem,
    buyItem, updateBoughtItem, removeBoughtItem,
    addCategory, updateCategory, deleteCategory,
  } = useShoppingStore()

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showAddModal,  setShowAddModal]  = useState(false)
  const [editItem,      setEditItem]      = useState<ShoppingItem | undefined>()
  const [buyTarget,     setBuyTarget]     = useState<ShoppingItem | undefined>()
  const [editBought,    setEditBought]    = useState<BoughtItem | undefined>()
  const [showCatModal,  setShowCatModal]  = useState(false)

  // ── Filters & sort ────────────────────────────────────────────────────────
  const [sortKey,          setSortKey]          = useState<SortKey>('priority')
  const [filterCatIds,     setFilterCatIds]     = useState<string[]>([])
  const [filterPriorities, setFilterPriorities] = useState<ShoppingPriority[]>([])
  const [activeTab,        setActiveTab]        = useState<'wishlist' | 'bought'>('wishlist')

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalWishlistValue = useMemo(() => wishlist.reduce((s, i) => s + i.price, 0), [wishlist])
  const thisMonth = useMemo(() => {
    const m = new Date().toISOString().slice(0, 7)
    return bought.filter((i) => i.boughtDate.startsWith(m)).length
  }, [bought])
  const totalBoughtValue = useMemo(() => bought.reduce((s, i) => s + i.pricePaid, 0), [bought])

  // ── Filtered + sorted lists ───────────────────────────────────────────────
  const filteredWishlist = useMemo(() => {
    let list = wishlist
    if (filterCatIds.length)     list = list.filter((i) => i.categoryId && filterCatIds.includes(i.categoryId))
    if (filterPriorities.length) list = list.filter((i) => filterPriorities.includes(i.priority))
    return sortItems(list, sortKey, categories)
  }, [wishlist, filterCatIds, filterPriorities, sortKey, categories])

  const filteredBought = useMemo(() => {
    let list = bought
    if (filterCatIds.length) list = list.filter((i) => i.categoryId && filterCatIds.includes(i.categoryId))
    return sortItems(list, sortKey, categories)
  }, [bought, filterCatIds, sortKey, categories])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleCatFilter = (id: string) =>
    setFilterCatIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const togglePriorityFilter = (p: ShoppingPriority) =>
    setFilterPriorities((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])

  const handleSaveItem = (data: Omit<ShoppingItem, 'id' | 'createdAt'>) => {
    if (editItem) updateWishlistItem(editItem.id, data)
    else          addWishlistItem(data)
    setEditItem(undefined)
    setShowAddModal(false)
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, color: 'var(--fg)', margin: 0 }}>Achats</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>Wishlist & historique</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCatModal(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--fg-muted)', background: 'transparent' }}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Catégories
          </button>
          <button onClick={() => { setEditItem(undefined); setShowAddModal(true) }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors"
            style={{ background: 'var(--terra)', color: 'var(--paper-1)', borderRadius: 'var(--r-full)', border: 'none', cursor: 'pointer' }}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Ajouter
          </button>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Wishlist',        value: String(wishlist.length), sub: <span>Valeur totale <span style={{ color: 'var(--terra)', fontWeight: 500 }}>{fmt(totalWishlistValue)}</span></span> },
          { label: 'Achetés ce mois', value: String(thisMonth),       sub: `${bought.length} au total` },
          { label: 'Total dépensé',   value: fmt(totalBoughtValue),   sub: 'Tous les achats', mono: true },
        ].map(({ label, value, sub, mono }) => (
          <div key={label} className="p-4" style={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', background: 'var(--bg-elev)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 6 }}>{label}</p>
            <p style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-serif)', fontSize: 26, fontWeight: 500, color: 'var(--fg)', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 w-fit rounded-xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
        {(['wishlist', 'bought'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
            style={activeTab === tab
              ? { background: 'var(--paper-3)', color: 'var(--fg)', border: '1px solid var(--border-strong)' }
              : { background: 'transparent', color: 'var(--fg-muted)', border: '1px solid transparent' }
            }>
            {tab === 'wishlist' ? `Wishlist (${wishlist.length})` : `Achetés (${bought.length})`}
          </button>
        ))}
      </div>

      {/* ── Controls ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-lg px-3 py-1.5 text-xs outline-none transition-colors"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-elev)', color: 'var(--fg-muted)' }}>
          <option value="priority">Par priorité</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
          <option value="category">Par catégorie</option>
          <option value="date_desc">Plus récent</option>
        </select>

        {activeTab === 'wishlist' && (
          <div className="flex gap-1.5">
            {PRIORITIES.map((p) => (
              <button key={p} onClick={() => togglePriorityFilter(p)}
                className="rounded-full px-3 py-1 text-[11px] font-medium transition-colors"
                style={filterPriorities.includes(p)
                  ? priorityChipStyle[p]
                  : { background: 'var(--bg-elev)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }
                }>
                {p}
              </button>
            ))}
          </div>
        )}

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button key={c.id} onClick={() => toggleCatFilter(c.id)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-colors"
                style={filterCatIds.includes(c.id)
                  ? { color: c.color, borderColor: c.color + '60', backgroundColor: c.color + '15', border: `1px solid ${c.color}60` }
                  : { border: '1px solid var(--border)', color: 'var(--fg-muted)', background: 'var(--bg-elev)' }
                }>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: filterCatIds.includes(c.id) ? c.color : 'var(--fg-subtle)' }} />
                {c.name}
              </button>
            ))}
          </div>
        )}

        {(filterCatIds.length > 0 || filterPriorities.length > 0) && (
          <button onClick={() => { setFilterCatIds([]); setFilterPriorities([]) }}
            className="text-xs transition-colors" style={{ color: 'var(--fg-subtle)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            Effacer filtres
          </button>
        )}
      </div>

      {/* ── Grille Wishlist ──────────────────────────────────────────────────── */}
      {activeTab === 'wishlist' && (
        <>
          {filteredWishlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--fg-subtle)' }}>
              <span className="text-4xl mb-3">🛍️</span>
              <p className="text-sm" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
                {wishlist.length === 0 ? 'Ta wishlist est vide' : 'Aucun article pour ces filtres'}
              </p>
              {wishlist.length === 0 && (
                <button onClick={() => setShowAddModal(true)}
                  className="mt-4 px-4 py-2 text-xs transition-colors"
                  style={{ background: 'var(--terra-soft)', color: 'var(--terra-deep)', borderRadius: 'var(--r-full)', border: 'none', cursor: 'pointer' }}>
                  + Ajouter un article
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredWishlist.map((item) => (
                <ShoppingCard
                  key={item.id} item={item} categories={categories}
                  onEdit={() => { setEditItem(item); setShowAddModal(true) }}
                  onDelete={() => removeWishlistItem(item.id)}
                  onBuy={() => setBuyTarget(item)}
                  onCatFilter={toggleCatFilter}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Grille Achetés ───────────────────────────────────────────────────── */}
      {activeTab === 'bought' && (
        <>
          {filteredBought.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--fg-subtle)' }}>
              <span className="text-4xl mb-3">✓</span>
              <p className="text-sm" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
                {bought.length === 0 ? 'Aucun achat enregistré' : 'Aucun article pour ces filtres'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBought.map((item) => (
                <BoughtCard
                  key={item.id} item={item} categories={categories}
                  onEdit={() => setEditBought(item)}
                  onDelete={() => removeBoughtItem(item.id)}
                  onCatFilter={toggleCatFilter}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {(showAddModal || editItem) && (
        <ModalAddItem
          initial={editItem}
          categories={categories}
          onSave={handleSaveItem}
          onClose={() => { setShowAddModal(false); setEditItem(undefined) }}
          onNewCat={addCategory}
        />
      )}

      {buyTarget && (
        <ModalBuyItem
          item={buyTarget}
          onBuy={(pricePaid, boughtDate, verdict) => buyItem(buyTarget.id, pricePaid, boughtDate, verdict)}
          onClose={() => setBuyTarget(undefined)}
        />
      )}

      {editBought && (
        <ModalEditBought
          item={editBought}
          onSave={(updates) => updateBoughtItem(editBought.id, updates)}
          onClose={() => setEditBought(undefined)}
        />
      )}

      {showCatModal && (
        <ModalCategories
          categories={categories}
          wishlist={wishlist}
          bought={bought}
          onAdd={addCategory}
          onUpdate={updateCategory}
          onDelete={deleteCategory}
          onClose={() => setShowCatModal(false)}
        />
      )}
    </div>
  )
}
