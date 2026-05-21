import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Heart, X, Check, BookOpen, ShoppingBasket, ImageUp, Replace, Link, Utensils, Trash2 } from 'lucide-react'
import { useCuisineStore } from '../store/cuisineStore'
import type { Recette, Ingredient, RecetteCategorie } from '../types/cuisine'
import {
  RECIPE_TYPES,
  RAYONS,
  CATEGORIE_TO_DISPLAY,
  DISPLAY_TO_CATEGORIE,
  PLACEHOLDER_TINTS,
  DEFAULT_INGREDIENT_CATEGORIES,
  getCategorieLabel,
  getRayonForCategorie,
} from '../lib/cuisineConstants'

// ─── Image helpers ─────────────────────────────────────────────────────────────

const IMG_PREFIX = 'aetheris-recipe-img-'

// Reads from store (new) AND legacy separate localStorage key (pre-refactor)
function getRecipeImage(recette: Recette): string | null {
  if (recette.image) return recette.image
  try { return localStorage.getItem(IMG_PREFIX + recette.id) || null } catch { return null }
}

// Compress a base64 data URL to ~60-80KB (800px max, JPEG 0.72)
function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const MAX = 800
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }
    img.src = dataUrl
  })
}

// ─── Quantity helpers ──────────────────────────────────────────────────────────

function combineQuantites(q1?: string, q2?: string): string | undefined {
  if (!q1 && !q2) return undefined
  if (!q1) return q2
  if (!q2) return q1

  const parseQty = (s: string): { num: number; unit: string } | null => {
    const m = s.trim().match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-ZgGkKlLcCmM]+)?$/)
    if (!m) return null
    const num = parseFloat(m[1].replace(',', '.'))
    const unit = (m[2] ?? '').toLowerCase()
    return isNaN(num) ? null : { num, unit }
  }

  const p1 = parseQty(q1)
  const p2 = parseQty(q2)

  if (p1 && p2 && p1.unit === p2.unit) {
    const total = p1.num + p2.num
    const str = Number.isInteger(total) ? String(total) : total.toFixed(1).replace(/\.0$/, '')
    return p1.unit ? `${str}${p1.unit}` : str
  }

  return `${q1} + ${q2}`
}

// ─── Primitives ────────────────────────────────────────────────────────────────

function CheckBox({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        border: checked ? '1.5px solid var(--terra)' : '1.5px solid var(--ink-4)',
        background: checked ? 'var(--terra)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        cursor: 'pointer',
        transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)',
      }}
    >
      {checked && <Check size={11} color="var(--paper-1)" strokeWidth={3} />}
    </button>
  )
}

// ─── ImageImport ───────────────────────────────────────────────────────────────

function ImageImport({
  currentImage,
  onPick,
  onRemove,
  onClose,
}: {
  currentImage: string | null
  onPick: (src: string) => void
  onRemove: () => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<'url' | 'file'>('url')
  const [urlVal, setUrlVal] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        const compressed = await compressImage(result)
        onPick(compressed)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        right: 8,
        background: 'var(--paper-1)',
        border: '1px solid var(--paper-2)',
        borderRadius: 'var(--r-lg)',
        padding: 12,
        zIndex: 20,
        boxShadow: 'var(--shadow-2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['url', 'file'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: 4,
                background: tab === t ? 'var(--paper-3)' : 'transparent',
                color: tab === t ? 'var(--ink)' : 'var(--ink-3)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t === 'url' ? 'URL' : 'Fichier'}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex' }}
        >
          <X size={14} />
        </button>
      </div>

      {tab === 'url' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            autoFocus
            value={urlVal}
            onChange={(e) => setUrlVal(e.target.value)}
            placeholder="https://..."
            style={{
              flex: 1,
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--paper-2)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              outline: 'none',
            }}
          />
          <button
            onClick={() => { if (urlVal.trim()) { onPick(urlVal.trim()); onClose() } }}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 500,
              padding: '6px 12px',
              borderRadius: 6,
              background: 'var(--terra)',
              color: 'var(--paper-1)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Valider
          </button>
        </div>
      )}

      {tab === 'file' && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) { handleFile(f); onClose() }
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files?.[0]
              if (f) { handleFile(f); onClose() }
            }}
            style={{
              border: '1.5px dashed var(--ink-4)',
              borderRadius: 8,
              padding: '14px 0',
              background: 'transparent',
              color: 'var(--ink-3)',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ImageUp size={18} />
            Cliquer ou glisser une image
          </button>
        </>
      )}

      {currentImage && (
        <button
          onClick={() => { onRemove(); onClose() }}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            color: 'var(--ink-3)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            padding: '2px 0',
          }}
        >
          Retirer l'image
        </button>
      )}
    </div>
  )
}

// ─── RecipeCard ────────────────────────────────────────────────────────────────

function RecipeCard({
  recette,
  index,
  canMake,
  onOpen,
  onToggleFavorite,
  onSetImage,
  onRemoveImage,
}: {
  recette: Recette
  index: number
  canMake: boolean
  onOpen: () => void
  onToggleFavorite: () => void
  onSetImage: (src: string) => void
  onRemoveImage: () => void
}) {
  const [showImgImport, setShowImgImport] = useState(false)
  const [hovered, setHovered] = useState(false)

  // Read from store (new) or legacy localStorage key (pre-refactor)
  const imgSrc = getRecipeImage(recette)
  const tint = PLACEHOLDER_TINTS[index % PLACEHOLDER_TINTS.length]

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--paper-1)',
        border: '1px solid var(--paper-2)',
        borderRadius: 'var(--r-xl)',
        overflow: 'hidden',
        cursor: 'pointer',
        opacity: 0,
        transform: 'translateY(8px)',
        animation: `cuisine-section-in 300ms var(--ease) both`,
        animationDelay: `${30 + index * 40}ms`,
        transition: 'border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)',
        boxShadow: hovered ? 'var(--shadow-2)' : 'var(--shadow-1)',
        borderColor: hovered ? 'var(--ink-4)' : 'var(--paper-2)',
      }}
    >
      {/* Image zone */}
      <div
        style={{
          position: 'relative',
          aspectRatio: '4/3',
          background: imgSrc ? 'transparent' : tint.bg,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={recette.nom}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: tint.ink, opacity: 0.35 }}>
            {CATEGORIE_TO_DISPLAY[recette.categorie]?.[0] ?? '?'}
          </span>
        )}

        {/* Heart button */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'var(--paper-1)',
            border: '1px solid var(--paper-2)',
            borderRadius: 'var(--r-full)',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: hovered || recette.favori ? 1 : 0,
            transition: 'opacity var(--dur) var(--ease)',
          }}
        >
          <Heart
            size={15}
            strokeWidth={2}
            fill={recette.favori ? 'var(--terra)' : 'none'}
            color={recette.favori ? 'var(--terra)' : 'var(--ink-3)'}
          />
        </button>

        {/* Image import trigger */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowImgImport((v) => !v) }}
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            background: 'var(--paper-1)',
            border: '1px solid var(--paper-2)',
            borderRadius: 'var(--r-full)',
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            cursor: 'pointer',
            opacity: hovered || showImgImport ? 1 : 0,
            transition: 'opacity var(--dur) var(--ease)',
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            color: 'var(--ink-2)',
            whiteSpace: 'nowrap',
          }}
        >
          {imgSrc ? <Replace size={12} /> : <ImageUp size={12} />}
          {imgSrc ? 'Changer' : 'Ajouter une image'}
        </button>

        {/* Réalisable badge */}
        {recette.ingredientIds.length > 0 && canMake && (
          <div style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: '#3F5A3C',
            color: 'white',
            padding: '3px 9px',
            borderRadius: 'var(--r-full)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.06em',
            opacity: showImgImport ? 0 : 1,
            transition: 'opacity var(--dur) var(--ease)',
          }}>
            <Check size={10} strokeWidth={3} />
            Réalisable
          </div>
        )}

        {showImgImport && (
          <ImageImport
            currentImage={imgSrc}
            onPick={(src) => { onSetImage(src); setShowImgImport(false) }}
            onRemove={() => { onRemoveImage(); setShowImgImport(false) }}
            onClose={() => setShowImgImport(false)}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '2px 7px',
            borderRadius: 4,
            border: '1px solid var(--ink-4)',
            color: 'var(--ink-3)',
          }}>
            {CATEGORIE_TO_DISPLAY[recette.categorie] ?? 'Autre'}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', marginLeft: 'auto' }}>
            {recette.tempsPreparation} min
          </span>
        </div>

        <h3 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 17,
          fontWeight: 400,
          color: 'var(--ink)',
          margin: 0,
          lineHeight: 1.3,
          marginBottom: 8,
        }}>
          {recette.nom}
        </h3>
      </div>
    </div>
  )
}

// ─── AddIngredientForm ─────────────────────────────────────────────────────────

function AddIngredientForm({
  allCategories,
  onAdd,
}: {
  allCategories: Array<{ value: string; label: string }>
  onAdd: (nom: string, categorie: string, quantite: string) => void
}) {
  const addIngredientCategory = useCuisineStore((s) => s.addIngredientCategory)
  const [nom, setNom] = useState('')
  const [categorie, setCategorie] = useState('autre')
  const [quantite, setQuantite] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const nomRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim()) return
    onAdd(nom.trim(), categorie, quantite.trim())
    setNom('')
    setQuantite('')
    nomRef.current?.focus()
  }

  const handleCategorySelect = (val: string) => {
    if (val === '__new__') setCreatingCategory(true)
    else setCategorie(val)
  }

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return
    addIngredientCategory(newCategoryName.trim())
    setCategorie(newCategoryName.trim())
    setCreatingCategory(false)
    setNewCategoryName('')
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    padding: '8px 12px',
    borderRadius: 'var(--r-lg)',
    border: '1px solid var(--paper-2)',
    background: 'var(--paper)',
    color: 'var(--ink)',
    outline: 'none',
  }

  return (
    <div style={{ borderTop: '1px solid var(--paper-2)', paddingTop: 16, marginTop: 4 }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--ink-3)',
        display: 'block',
        marginBottom: 10,
      }}>
        Ajouter un ingrédient
      </span>

      {creatingCategory && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            autoFocus
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nom de la catégorie…"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory() } }}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            type="button"
            onClick={handleCreateCategory}
            disabled={!newCategoryName.trim()}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 500,
              padding: '8px 14px',
              borderRadius: 'var(--r-lg)',
              background: 'var(--terra)',
              color: 'var(--paper-1)',
              border: 'none',
              cursor: 'pointer',
              opacity: newCategoryName.trim() ? 1 : 0.4,
            }}
          >
            Créer
          </button>
          <button
            type="button"
            onClick={() => setCreatingCategory(false)}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              padding: '8px 14px',
              borderRadius: 'var(--r-lg)',
              background: 'transparent',
              color: 'var(--ink-3)',
              border: '1px solid var(--ink-4)',
              cursor: 'pointer',
            }}
          >
            Annuler
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          ref={nomRef}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Nom de l'ingrédient…"
          style={{ ...inputStyle, flex: '2 1 160px' }}
        />
        <select
          value={categorie}
          onChange={(e) => handleCategorySelect(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 140px' }}
        >
          {allCategories.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
          <option value="__new__">+ Nouvelle catégorie…</option>
        </select>
        <input
          value={quantite}
          onChange={(e) => setQuantite(e.target.value)}
          placeholder="Quantité"
          style={{ ...inputStyle, flex: '1 1 90px' }}
        />
        <button
          type="submit"
          disabled={!nom.trim()}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 500,
            padding: '8px 16px',
            borderRadius: 'var(--r-lg)',
            background: 'var(--terra)',
            color: 'var(--paper-1)',
            border: 'none',
            cursor: nom.trim() ? 'pointer' : 'not-allowed',
            opacity: nom.trim() ? 1 : 0.4,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={14} />
          Ajouter
        </button>
      </form>
    </div>
  )
}

// ─── RecipeDetailPanel ─────────────────────────────────────────────────────────

function RecipeDetailPanel({
  recette,
  allIngredients,
  allCategories,
  onClose,
  onToggleFavorite,
  onSetImage,
  onRemoveImage,
  onToggleDisponible,
  onDelete,
}: {
  recette: Recette
  allIngredients: Ingredient[]
  allCategories: Array<{ value: string; label: string }>
  onClose: () => void
  onToggleFavorite: () => void
  onSetImage: (src: string) => void
  onRemoveImage: () => void
  onToggleDisponible: (id: string) => void
  onDelete: () => void
}) {
  const addIngredient    = useCuisineStore((s) => s.addIngredient)
  const updateIngredient = useCuisineStore((s) => s.updateIngredient)
  const deleteIngredient = useCuisineStore((s) => s.deleteIngredient)
  const updateRecette    = useCuisineStore((s) => s.updateRecette)

  const [showImgImport, setShowImgImport] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Read from store (new) or legacy localStorage key (pre-refactor)
  const imgSrc = getRecipeImage(recette)

  const recetteIngredients = allIngredients.filter((i) => recette.ingredientIds.includes(i.id))

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleAddIngredient = (nom: string, categorie: string, quantite: string) => {
    const normalizedNom = nom.toLowerCase().trim()
    const existing = allIngredients.find((i) => i.nom.toLowerCase().trim() === normalizedNom)

    if (existing && !recette.ingredientIds.includes(existing.id)) {
      // Reuse existing ingredient — link to this recipe and combine quantities
      updateIngredient(existing.id, {
        recetteIds: [...existing.recetteIds, recette.id],
        quantite: combineQuantites(existing.quantite, quantite || undefined),
      })
      updateRecette(recette.id, {
        ingredientIds: [...recette.ingredientIds, existing.id],
      })
    } else if (!existing) {
      const newIng = addIngredient({
        nom: nom.trim(),
        categorie,
        quantite: quantite || undefined,
        disponible: false,
        recetteIds: [recette.id],
      })
      updateRecette(recette.id, {
        ingredientIds: [...recette.ingredientIds, newIng.id],
      })
    }
    // If already linked: no-op
  }

  const handleRemoveIngredient = (ingredientId: string) => {
    const ing = allIngredients.find((i) => i.id === ingredientId)
    if (!ing) return

    updateRecette(recette.id, {
      ingredientIds: recette.ingredientIds.filter((id) => id !== ingredientId),
    })

    const newRecetteIds = ing.recetteIds.filter((id) => id !== recette.id)
    if (newRecetteIds.length === 0) {
      deleteIngredient(ingredientId)
    } else {
      updateIngredient(ingredientId, { recetteIds: newRecetteIds })
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'color-mix(in srgb, var(--ink) 18%, transparent)',
          zIndex: 40,
          animation: 'cuisine-fade-in 240ms var(--ease)',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(720px, 80%)',
          background: 'var(--paper)',
          borderLeft: '1px solid var(--paper-2)',
          zIndex: 41,
          animation: 'cuisine-slide-in 320ms var(--ease)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Header bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 24px',
          borderBottom: '1px solid var(--paper-2)',
          position: 'sticky',
          top: 0,
          background: 'var(--paper)',
          zIndex: 1,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            cuisine
          </span>
          <span style={{ color: 'var(--ink-4)', fontSize: 12 }}>·</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)' }}>
            {recette.nom}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            {confirmDelete ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)' }}>
                  Supprimer ?
                </span>
                <button
                  onClick={() => { onDelete(); onClose() }}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    fontWeight: 500,
                    padding: '4px 12px',
                    borderRadius: 'var(--r-lg)',
                    background: '#C0392B',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    padding: '4px 10px',
                    borderRadius: 'var(--r-lg)',
                    background: 'transparent',
                    color: 'var(--ink-3)',
                    border: '1px solid var(--ink-4)',
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Supprimer la recette"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 6,
                  borderRadius: 'var(--r-full)',
                  color: 'var(--ink-4)',
                }}
              >
                <Trash2 size={15} />
              </button>
            )}
            <button
              onClick={() => setShowImgImport((v) => !v)}
              title={imgSrc ? 'Changer l\'image' : 'Ajouter une image'}
              style={{
                background: showImgImport ? 'var(--paper-2)' : 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
                borderRadius: 'var(--r-full)',
                color: 'var(--ink-3)',
                transition: 'background var(--dur) var(--ease)',
              }}
            >
              {imgSrc ? <Replace size={16} /> : <ImageUp size={16} />}
            </button>
            <button
              onClick={onToggleFavorite}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
                borderRadius: 'var(--r-full)',
              }}
            >
              <Heart
                size={17}
                fill={recette.favori ? 'var(--terra)' : 'none'}
                color={recette.favori ? 'var(--terra)' : 'var(--ink-3)'}
                strokeWidth={2}
              />
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
                borderRadius: 'var(--r-full)',
                color: 'var(--ink-3)',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Image import popover */}
        {showImgImport && (
          <div style={{ position: 'relative', zIndex: 2 }}>
            <ImageImport
              currentImage={imgSrc}
              onPick={(src) => { onSetImage(src); setShowImgImport(false) }}
              onRemove={() => { onRemoveImage(); setShowImgImport(false) }}
              onClose={() => setShowImgImport(false)}
            />
          </div>
        )}

        {/* Image or terra bar */}
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={recette.nom}
            style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block', flexShrink: 0 }}
          />
        ) : (
          <div style={{ height: 8, background: 'var(--terra)', flexShrink: 0 }} />
        )}

        {/* Content */}
        <div style={{ padding: '28px 32px 40px', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Badge + title + meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: 4,
              background: 'var(--terra-soft)',
              color: '#6B2F14',
              width: 'fit-content',
            }}>
              {CATEGORIE_TO_DISPLAY[recette.categorie] ?? 'Autre'}
            </span>

            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 28,
              fontWeight: 400,
              color: 'var(--ink)',
              margin: 0,
              lineHeight: 1.25,
            }}>
              {recette.nom}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                {recette.tempsPreparation}min
              </span>
              {recette.lien && (
                <a
                  href={recette.lien}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    color: 'var(--terra)',
                    textDecoration: 'none',
                  }}
                >
                  <Link size={12} />
                  Voir la recette
                </a>
              )}
            </div>
          </div>

          {/* Ingrédients */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10.5,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
              }}>
                Ingrédients
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                {recetteIngredients.length > 0
                  ? `${recetteIngredients.filter((i) => i.disponible).length}/${recetteIngredients.length} en stock`
                  : '—'}
              </span>
            </div>

            {recetteIngredients.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {recetteIngredients.map((ing) => (
                  <IngredientPanelRow
                    key={ing.id}
                    ingredient={ing}
                    onToggleDisponible={() => onToggleDisponible(ing.id)}
                    onRemove={() => handleRemoveIngredient(ing.id)}
                  />
                ))}
              </div>
            )}

            {recetteIngredients.length === 0 && (
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic', margin: 0 }}>
                Aucun ingrédient pour l'instant.
              </p>
            )}

            <AddIngredientForm
              allCategories={allCategories}
              onAdd={handleAddIngredient}
            />
          </div>
        </div>
      </div>
    </>
  )
}

// ─── IngredientPanelRow ────────────────────────────────────────────────────────

function IngredientPanelRow({
  ingredient,
  onToggleDisponible,
  onRemove,
}: {
  ingredient: Ingredient
  onToggleDisponible: () => void
  onRemove: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '9px 14px',
        borderRadius: 'var(--r-lg)',
        background: 'var(--paper-1)',
        border: '1px solid var(--paper-2)',
      }}
    >
      <div
        onClick={onToggleDisponible}
        title={ingredient.disponible ? 'En stock — cliquer pour retirer' : 'Manquant — cliquer pour marquer en stock'}
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: ingredient.disponible ? '#3F5A3C' : 'var(--ink-4)',
          flexShrink: 0,
          cursor: 'pointer',
          transition: 'background var(--dur) var(--ease)',
        }}
      />
      <span style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        color: ingredient.disponible ? 'var(--ink-3)' : 'var(--ink)',
        flex: 1,
        textDecoration: ingredient.disponible ? 'line-through' : 'none',
        textDecorationColor: 'var(--ink-4)',
        transition: 'color var(--dur) var(--ease)',
      }}>
        {ingredient.nom}
      </span>
      {ingredient.quantite && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
          {ingredient.quantite}
        </span>
      )}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', letterSpacing: '0.04em' }}>
        {getCategorieLabel(ingredient.categorie)}
      </span>
      <button
        onClick={onRemove}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          color: 'var(--ink-4)',
          padding: 2,
          opacity: hovered ? 1 : 0,
          transition: 'opacity var(--dur) var(--ease)',
        }}
      >
        <X size={13} />
      </button>
    </div>
  )
}

// ─── SectionTabs ───────────────────────────────────────────────────────────────

function SectionTabs({
  section,
  recettesCount,
  manquantsCount,
  onChange,
}: {
  section: 'recettes' | 'courses'
  recettesCount: number
  manquantsCount: number
  onChange: (s: 'recettes' | 'courses') => void
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--paper-2)', display: 'flex', gap: 0 }}>
      {([
        { id: 'recettes', label: 'Recettes',   Icon: BookOpen,       count: String(recettesCount) },
        { id: 'courses',  label: 'Mes stocks', Icon: ShoppingBasket, count: manquantsCount > 0 ? `${manquantsCount} manquant${manquantsCount > 1 ? 's' : ''}` : '✓ complet' },
      ] as const).map(({ id, label, Icon, count }) => {
        const active = section === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: active ? '2px solid var(--terra)' : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: active ? 500 : 400,
              color: active ? 'var(--ink)' : 'var(--ink-3)',
              transition: 'color var(--dur) var(--ease)',
              marginBottom: -1,
            }}
          >
            <Icon size={15} strokeWidth={1.8} />
            {label}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              background: active ? 'var(--terra-soft)' : 'var(--paper-2)',
              color: active ? '#8E3D1C' : 'var(--ink-3)',
              padding: '1px 7px',
              borderRadius: 'var(--r-full)',
              transition: 'background var(--dur) var(--ease)',
            }}>
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── RecettesView ──────────────────────────────────────────────────────────────

function RecettesView({
  recettes,
  canMakeSet,
  onOpen,
  onToggleFavorite,
  onSetImage,
  onRemoveImage,
  onNewRecette,
}: {
  recettes: Recette[]
  canMakeSet: Set<string>
  onOpen: (id: string) => void
  onToggleFavorite: (id: string) => void
  onSetImage: (id: string, src: string) => void
  onRemoveImage: (id: string) => void
  onNewRecette: () => void
}) {
  const [activeType, setActiveType] = useState<string>('Toutes')
  const [favoriOnly, setFavoriOnly] = useState(false)

  const filtered = recettes.filter((r) => {
    if (activeType !== 'Toutes') {
      const cat = DISPLAY_TO_CATEGORIE[activeType]
      if (cat && r.categorie !== cat) return false
    }
    if (favoriOnly && !r.favori) return false
    return true
  })

  return (
    <div className="cuisine-section-anim" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          cuisine · {recettes.length} recette{recettes.length !== 1 ? 's' : ''}
        </span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 400, color: 'var(--ink)', margin: 0, lineHeight: 1.2 }}>
          Ton carnet de cuisine.
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--ink-3)', fontStyle: 'italic', margin: 0 }}>
          Recettes, ingrédients et liste de courses.
        </p>
      </div>

      <button
        onClick={onNewRecette}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          background: 'var(--terra)',
          color: 'var(--paper-1)',
          border: 'none',
          borderRadius: 'var(--r-lg)',
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          width: 'fit-content',
        }}
      >
        <Plus size={15} />
        Nouvelle recette
      </button>

      {/* Filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        {RECIPE_TYPES.map((type, i) => {
          const active = activeType === type
          return (
            <span key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <span style={{ color: 'var(--ink-4)', fontSize: 12, userSelect: 'none' }}>·</span>}
              <button
                onClick={() => setActiveType(type)}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  padding: '5px 12px',
                  borderRadius: 'var(--r-full)',
                  background: active ? 'var(--paper-3)' : 'transparent',
                  color: active ? 'var(--ink)' : 'var(--ink-3)',
                  border: active ? '1px solid var(--ink-4)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
                }}
              >
                {type}
              </button>
            </span>
          )
        })}
        <button
          onClick={() => setFavoriOnly((v) => !v)}
          style={{
            marginLeft: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            padding: '5px 12px',
            borderRadius: 'var(--r-full)',
            background: favoriOnly ? 'var(--terra-soft)' : 'transparent',
            color: favoriOnly ? 'var(--terra-deep)' : 'var(--ink-3)',
            border: favoriOnly ? '1px solid var(--terra-soft)' : '1px solid transparent',
            cursor: 'pointer',
            transition: 'background var(--dur) var(--ease)',
          }}
        >
          <Heart size={13} fill={favoriOnly ? 'var(--terra)' : 'none'} color={favoriOnly ? 'var(--terra)' : 'var(--ink-3)'} strokeWidth={2} />
          Favoris
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 0', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink-3)', fontStyle: 'italic', margin: 0 }}>
            Aucune recette pour l'instant.
          </p>
          <button onClick={onNewRecette} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--terra)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Créer la première →
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {filtered.map((r, i) => (
            <RecipeCard
              key={r.id}
              recette={r}
              index={i}
              canMake={canMakeSet.has(r.id)}
              onOpen={() => onOpen(r.id)}
              onToggleFavorite={() => onToggleFavorite(r.id)}
              onSetImage={(src) => onSetImage(r.id, src)}
              onRemoveImage={() => onRemoveImage(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── IngredientStockRow ────────────────────────────────────────────────────────

function IngredientStockRow({
  ingredient,
  linkedRecettes,
  onToggle,
}: {
  ingredient: Ingredient
  linkedRecettes: Recette[]
  onToggle: () => void
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 'var(--r-lg)',
        background: ingredient.disponible ? 'transparent' : 'var(--paper-1)',
        border: '1px solid',
        borderColor: ingredient.disponible ? 'transparent' : 'var(--paper-2)',
        opacity: ingredient.disponible ? 0.5 : 1,
        transition: 'background var(--dur) var(--ease), opacity var(--dur) var(--ease)',
        cursor: 'pointer',
      }}
    >
      <CheckBox checked={ingredient.disponible} onClick={onToggle} />
      <span style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        color: 'var(--ink)',
        flex: 1,
        textDecoration: ingredient.disponible ? 'line-through' : 'none',
        textDecorationColor: 'var(--ink-3)',
      }}>
        {ingredient.nom}
      </span>
      {ingredient.quantite && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
          {ingredient.quantite}
        </span>
      )}
      {linkedRecettes.length > 0 && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {linkedRecettes.map((r) => (
            <span key={r.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--ink-4)',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
            }}>
              <Utensils size={9} />
              {r.nom}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── StockRayonGroup ───────────────────────────────────────────────────────────

function StockRayonGroup({
  rayon,
  ingredients,
  recetteMap,
  onToggle,
}: {
  rayon: string
  ingredients: Ingredient[]
  recetteMap: Map<string, Recette>
  onToggle: (id: string) => void
}) {
  const sorted = [...ingredients].sort((a, b) => {
    if (a.disponible === b.disponible) return a.nom.localeCompare(b.nom, 'fr')
    return a.disponible ? 1 : -1
  })

  const manquants = ingredients.filter((i) => !i.disponible).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 400, color: 'var(--ink-2)', margin: 0 }}>
          {rayon}
        </h2>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
          {manquants > 0 ? `${manquants} manquant${manquants > 1 ? 's' : ''}` : '✓'}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sorted.map((ing) => {
          const linked = ing.recetteIds.map((id) => recetteMap.get(id)).filter(Boolean) as Recette[]
          return (
            <IngredientStockRow
              key={ing.id}
              ingredient={ing}
              linkedRecettes={linked}
              onToggle={() => onToggle(ing.id)}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─── ListeDeCoursesView ────────────────────────────────────────────────────────

function ListeDeCoursesView({
  recettes,
  ingredients,
  onToggleDisponible,
}: {
  recettes: Recette[]
  ingredients: Ingredient[]
  onToggleDisponible: (id: string) => void
}) {
  const recetteIngredientIdSet = new Set(recettes.flatMap((r) => r.ingredientIds))
  const recetteIngredients = ingredients.filter((i) => recetteIngredientIdSet.has(i.id))

  const manquants = recetteIngredients.filter((i) => !i.disponible)
  const realisables = recettes.filter(
    (r) =>
      r.ingredientIds.length > 0 &&
      r.ingredientIds.every((id) => ingredients.find((i) => i.id === id)?.disponible === true),
  )

  const grouped = new Map<string, Ingredient[]>()
  for (const rayon of RAYONS) grouped.set(rayon, [])

  for (const ing of recetteIngredients) {
    const rayon = getRayonForCategorie(ing.categorie)
    const key = grouped.has(rayon) ? rayon : 'Autre'
    grouped.get(key)!.push(ing)
  }

  const recetteMap = new Map(recettes.map((r) => [r.id, r]))

  return (
    <div className="cuisine-section-anim" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          stocks · {manquants.length} manquant{manquants.length !== 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 400, color: 'var(--ink)', margin: 0, lineHeight: 1.2 }}>
            Tes ingrédients.
          </h1>
          {realisables.length > 0 && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: '#E8F0E8',
              color: '#3F5A3C',
              padding: '4px 12px',
              borderRadius: 'var(--r-full)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.04em',
              flexShrink: 0,
            }}>
              <Check size={11} strokeWidth={2.5} />
              {realisables.length} réalisable{realisables.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--ink-3)', fontStyle: 'italic', margin: 0 }}>
          Coche ce que tu as. La liste se met à jour automatiquement.
        </p>
      </div>

      {recetteIngredients.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 0', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink-3)', fontStyle: 'italic', margin: 0 }}>
            Ajoute des ingrédients à tes recettes pour les voir ici.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {[...grouped.entries()].map(([rayon, ings]) => {
            if (ings.length === 0) return null
            return (
              <StockRayonGroup
                key={rayon}
                rayon={rayon}
                ingredients={ings}
                recetteMap={recetteMap}
                onToggle={onToggleDisponible}
              />
            )
          })}
        </div>
      )}

      {recetteIngredients.length > 0 && (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-4)', margin: 0, fontStyle: 'italic' }}>
          Pour ajouter des ingrédients, ouvre une recette et complète sa liste.
        </p>
      )}
    </div>
  )
}

// ─── NewRecipeModal ────────────────────────────────────────────────────────────

function NewRecipeModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (id: string) => void
}) {
  const addRecette = useCuisineStore((s) => s.addRecette)
  const [nom, setNom] = useState('')
  const [categorie, setCategorie] = useState<RecetteCategorie>('plat')
  const [tempsPreparation, setTempsPreparation] = useState(30)

  const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: 14,
    padding: '10px 14px',
    borderRadius: 'var(--r-lg)',
    border: '1px solid var(--paper-2)',
    background: 'var(--paper)',
    color: 'var(--ink)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim()) return
    const newRecette = addRecette({ nom: nom.trim(), categorie, tempsPreparation, favori: false, ingredientIds: [] })
    onCreate(newRecette.id)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'color-mix(in srgb, var(--ink) 40%, transparent)',
        animation: 'cuisine-fade-in 180ms var(--ease)',
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          background: 'var(--paper-1)',
          border: '1px solid var(--paper-2)',
          borderRadius: 'var(--r-xl)',
          padding: '28px 32px',
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          boxShadow: 'var(--shadow-3)',
          animation: 'cuisine-section-in 220ms var(--ease)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--ink)', margin: 0 }}>
            Nouvelle recette
          </h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            Nom *
          </label>
          <input autoFocus value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex. Risotto aux champignons" style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Type</label>
            <select value={categorie} onChange={(e) => setCategorie(e.target.value as RecetteCategorie)} style={inputStyle}>
              {RECIPE_TYPES.filter((t) => t !== 'Toutes').map((t) => (
                <option key={t} value={DISPLAY_TO_CATEGORIE[t] ?? t.toLowerCase()}>{t}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Temps (min)</label>
            <input type="number" min={1} value={tempsPreparation} onChange={(e) => setTempsPreparation(Math.max(1, parseInt(e.target.value) || 1))} style={inputStyle} />
          </div>
        </div>

        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-4)', margin: 0, fontStyle: 'italic' }}>
          Tu pourras ajouter une image et des ingrédients après la création.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onClose} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, padding: '9px 18px', borderRadius: 'var(--r-lg)', background: 'transparent', color: 'var(--ink-3)', border: '1px solid var(--ink-4)', cursor: 'pointer' }}>
            Annuler
          </button>
          <button type="submit" disabled={!nom.trim()} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, padding: '9px 18px', borderRadius: 'var(--r-lg)', background: 'var(--terra)', color: 'var(--paper-1)', border: 'none', cursor: nom.trim() ? 'pointer' : 'not-allowed', opacity: nom.trim() ? 1 : 0.4 }}>
            Créer la recette
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2600)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div style={{
      position: 'fixed',
      bottom: 28,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 60,
      background: 'var(--ink)',
      color: 'var(--paper-1)',
      borderRadius: 'var(--r-lg)',
      padding: '10px 18px',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      boxShadow: 'var(--shadow-3)',
      animation: 'cuisine-fade-in 200ms var(--ease)',
      whiteSpace: 'nowrap',
    }}>
      <Check size={14} color="var(--sage)" strokeWidth={2.5} />
      {message}
    </div>
  )
}

// ─── CuisinePage ───────────────────────────────────────────────────────────────

export function CuisinePage() {
  const recettes         = useCuisineStore((s) => s.recettes)
  const ingredients      = useCuisineStore((s) => s.ingredients)
  const customCategories = useCuisineStore((s) => s.customIngredientCategories)
  const updateRecette    = useCuisineStore((s) => s.updateRecette)
  const deleteRecette    = useCuisineStore((s) => s.deleteRecette)
  const toggleDisponible = useCuisineStore((s) => s.toggleDisponible)

  const [section, setSection]             = useState<'recettes' | 'courses'>('recettes')
  const [openRecetteId, setOpenRecetteId] = useState<string | null>(null)
  const [toast, setToast]                 = useState<string | null>(null)
  const [showNewModal, setShowNewModal]   = useState(false)

  const openRecette = recettes.find((r) => r.id === openRecetteId) ?? null

  const allCategories = [
    ...DEFAULT_INGREDIENT_CATEGORIES,
    ...customCategories.map((name) => ({ value: name, label: name })),
  ]

  const canMakeSet = new Set<string>(
    recettes
      .filter(
        (r) =>
          r.ingredientIds.length > 0 &&
          r.ingredientIds.every((id) => ingredients.find((i) => i.id === id)?.disponible === true),
      )
      .map((r) => r.id),
  )

  const recetteIngredientIdSet = new Set(recettes.flatMap((r) => r.ingredientIds))
  const manquantsCount = ingredients.filter(
    (i) => recetteIngredientIdSet.has(i.id) && !i.disponible,
  ).length

  const toggleFavorite = useCallback(
    (id: string) => updateRecette(id, { favori: !recettes.find((r) => r.id === id)?.favori }),
    [recettes, updateRecette],
  )

  // Images stored directly in the store via recette.image
  const handleSetImage = useCallback(
    (id: string, src: string) => updateRecette(id, { image: src }),
    [updateRecette],
  )

  const handleRemoveImage = useCallback(
    (id: string) => updateRecette(id, { image: undefined }),
    [updateRecette],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <SectionTabs
        section={section}
        recettesCount={recettes.length}
        manquantsCount={manquantsCount}
        onChange={setSection}
      />

      <div style={{ padding: '40px 0' }}>
        {section === 'recettes' ? (
          <RecettesView
            recettes={recettes}
            canMakeSet={canMakeSet}
            onOpen={setOpenRecetteId}
            onToggleFavorite={toggleFavorite}
            onSetImage={handleSetImage}
            onRemoveImage={handleRemoveImage}
            onNewRecette={() => setShowNewModal(true)}
          />
        ) : (
          <ListeDeCoursesView
            recettes={recettes}
            ingredients={ingredients}
            onToggleDisponible={toggleDisponible}
          />
        )}
      </div>

      {openRecette && (
        <RecipeDetailPanel
          recette={openRecette}
          allIngredients={ingredients}
          allCategories={allCategories}
          onClose={() => setOpenRecetteId(null)}
          onToggleFavorite={() => toggleFavorite(openRecette.id)}
          onSetImage={(src) => handleSetImage(openRecette.id, src)}
          onRemoveImage={() => handleRemoveImage(openRecette.id)}
          onToggleDisponible={toggleDisponible}
          onDelete={() => deleteRecette(openRecette.id)}
        />
      )}

      {showNewModal && (
        <NewRecipeModal
          onClose={() => setShowNewModal(false)}
          onCreate={(id) => { setShowNewModal(false); setOpenRecetteId(id) }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
