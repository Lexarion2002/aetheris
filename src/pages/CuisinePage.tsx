import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Heart, X, Check, BookOpen, ShoppingBasket, ImageUp, Replace, Trash2, Link } from 'lucide-react'
import { useCuisineStore } from '../store/cuisineStore'
import type { Recette, Ingredient, RecetteCategorie } from '../types/cuisine'
import {
  RECIPE_TYPES,
  RAYONS,
  CATEGORIE_TO_DISPLAY,
  DISPLAY_TO_CATEGORIE,
  INGREDIENT_TO_RAYON,
  PLACEHOLDER_TINTS,
} from '../lib/cuisineConstants'

// ─── Local shopping list ───────────────────────────────────────────────────────

interface CourseItem {
  id: string
  name: string
  qty: string
  rayon: string
  checked: boolean
  fromRecipe: string | null
}

const COURSES_LS_KEY = 'aetheris-courses-v1'

function loadCourses(): CourseItem[] {
  try {
    const raw = localStorage.getItem(COURSES_LS_KEY)
    return raw ? (JSON.parse(raw) as CourseItem[]) : []
  } catch {
    return []
  }
}

// ─── Image helpers ─────────────────────────────────────────────────────────────

const IMG_PREFIX = 'aetheris-recipe-img-'

function getRecipeImage(recette: Recette): string | null {
  if (recette.image?.startsWith('https://')) return recette.image
  try { return localStorage.getItem(IMG_PREFIX + recette.id) || null } catch { return null }
}

function setRecipeImage(
  id: string,
  src: string,
  updateRecette: (id: string, u: Partial<Omit<Recette, 'id'>>) => void,
) {
  if (src.startsWith('https://') || src.startsWith('http://')) {
    updateRecette(id, { image: src })
    try { localStorage.removeItem(IMG_PREFIX + id) } catch {}
  } else {
    try { localStorage.setItem(IMG_PREFIX + id, src) } catch {}
  }
}

function removeRecipeImage(
  id: string,
  updateRecette: (id: string, u: Partial<Omit<Recette, 'id'>>) => void,
) {
  try { localStorage.removeItem(IMG_PREFIX + id) } catch {}
  updateRecette(id, { image: undefined })
}

// ─── Primitives ────────────────────────────────────────────────────────────────

function CheckBox({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
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
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') onPick(result)
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
      {/* Header */}
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
  onOpen,
  onToggleFavorite,
  onSetImage,
  onRemoveImage,
}: {
  recette: Recette
  index: number
  onOpen: () => void
  onToggleFavorite: () => void
  onSetImage: (src: string) => void
  onRemoveImage: () => void
}) {
  const [imgSrc, setImgSrc] = useState<string | null>(() => getRecipeImage(recette))
  const [showImgImport, setShowImgImport] = useState(false)
  const [hovered, setHovered] = useState(false)

  // Listen for cross-component image sync
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string | null>).detail
      setImgSrc(detail)
    }
    window.addEventListener(`aetheris-cuisine-img-${recette.id}`, handler)
    return () => window.removeEventListener(`aetheris-cuisine-img-${recette.id}`, handler)
  }, [recette.id])

  // Refresh imgSrc when recette.image changes (e.g. https:// URL stored in store)
  useEffect(() => {
    setImgSrc(getRecipeImage(recette))
  }, [recette.image, recette.id])

  const tint = PLACEHOLDER_TINTS[index % PLACEHOLDER_TINTS.length]

  const handlePick = (src: string) => {
    onSetImage(src)
    setImgSrc(src)
    window.dispatchEvent(new CustomEvent(`aetheris-cuisine-img-${recette.id}`, { detail: src }))
  }

  const handleRemove = () => {
    onRemoveImage()
    setImgSrc(null)
    window.dispatchEvent(new CustomEvent(`aetheris-cuisine-img-${recette.id}`, { detail: null }))
  }

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

        {showImgImport && (
          <ImageImport
            currentImage={imgSrc}
            onPick={handlePick}
            onRemove={handleRemove}
            onClose={() => setShowImgImport(false)}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Badge + time */}
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

        {/* Title */}
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

// ─── RecipeDetailPanel ─────────────────────────────────────────────────────────

function RecipeDetailPanel({
  recette,
  allIngredients,
  courses,
  onClose,
  onToggleFavorite,
  onAddToCourses,
}: {
  recette: Recette
  allIngredients: Ingredient[]
  courses: CourseItem[]
  onClose: () => void
  onToggleFavorite: () => void
  onAddToCourses: (recetteNom: string, items: CourseItem[]) => void
}) {
  const [imgSrc, setImgSrc] = useState<string | null>(() => getRecipeImage(recette))
  const updateRecette = useCuisineStore((s) => s.updateRecette)

  // selected ingredient ids for adding to courses
  const recetteIngredients = allIngredients.filter((i) => recette.ingredientIds.includes(i.id))
  const [selected, setSelected] = useState<Set<string>>(new Set(recetteIngredients.map((i) => i.id)))

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string | null>).detail
      setImgSrc(detail)
    }
    window.addEventListener(`aetheris-cuisine-img-${recette.id}`, handler)
    return () => window.removeEventListener(`aetheris-cuisine-img-${recette.id}`, handler)
  }, [recette.id])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const courseNameSet = new Set(courses.map((c) => c.name.trim().toLowerCase()))

  const handleAddToCourses = () => {
    const items: CourseItem[] = recetteIngredients
      .filter((i) => selected.has(i.id))
      .map((i) => ({
        id: crypto.randomUUID(),
        name: i.nom,
        qty: i.quantite || '—',
        rayon: INGREDIENT_TO_RAYON[i.categorie] || 'Autre',
        checked: false,
        fromRecipe: recette.nom,
      }))
    onAddToCourses(recette.nom, items)
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
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
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
          {recetteIngredients.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10.5,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
              }}>
                Ingrédients
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {recetteIngredients.map((ing) => {
                  const alreadyInCourses = courseNameSet.has(ing.nom.trim().toLowerCase())
                  const isSelected = selected.has(ing.id)
                  return (
                    <div
                      key={ing.id}
                      onClick={() => toggleSelected(ing.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 14px',
                        borderRadius: 'var(--r-lg)',
                        background: isSelected ? 'var(--paper-1)' : 'transparent',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--paper-2)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background var(--dur) var(--ease)',
                      }}
                    >
                      <CheckBox checked={isSelected} onClick={() => toggleSelected(ing.id)} />
                      <span style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 14,
                        color: 'var(--ink)',
                        flex: 1,
                      }}>
                        {ing.nom}
                      </span>
                      {ing.quantite && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                          {ing.quantite}
                        </span>
                      )}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', letterSpacing: '0.04em' }}>
                        {INGREDIENT_TO_RAYON[ing.categorie] || 'Autre'}
                      </span>
                      {alreadyInCourses && (
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          color: 'var(--sage)',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                        }}>
                          ✓ liste
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Footer action */}
              <button
                onClick={handleAddToCourses}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: 500,
                  padding: '10px 20px',
                  borderRadius: 'var(--r-lg)',
                  background: 'var(--terra)',
                  color: 'var(--paper-1)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  width: 'fit-content',
                }}
              >
                <ShoppingBasket size={15} />
                Ajouter à la liste
              </button>
            </div>
          )}

          {recetteIngredients.length === 0 && (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>
              Aucun ingrédient enregistré pour cette recette.
            </p>
          )}
        </div>
      </div>
    </>
  )
}

// ─── SectionTabs ───────────────────────────────────────────────────────────────

function SectionTabs({
  section,
  recettesCount,
  coursesChecked,
  coursesTotal,
  onChange,
}: {
  section: 'recettes' | 'courses'
  recettesCount: number
  coursesChecked: number
  coursesTotal: number
  onChange: (s: 'recettes' | 'courses') => void
}) {
  return (
    <div style={{
      borderBottom: '1px solid var(--paper-2)',
      display: 'flex',
      gap: 0,
    }}>
      {([
        { id: 'recettes', label: 'Recettes', Icon: BookOpen, count: String(recettesCount) },
        { id: 'courses', label: 'Liste de courses', Icon: ShoppingBasket, count: `${coursesChecked}/${coursesTotal}` },
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
  onOpen,
  onToggleFavorite,
  onSetImage,
  onRemoveImage,
  onNewRecette,
}: {
  recettes: Recette[]
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
      {/* Editorial header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
        }}>
          cuisine · {recettes.length} recette{recettes.length !== 1 ? 's' : ''}
        </span>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 32,
          fontWeight: 400,
          color: 'var(--ink)',
          margin: 0,
          lineHeight: 1.2,
        }}>
          Ton carnet de cuisine.
        </h1>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 15,
          color: 'var(--ink-3)',
          fontStyle: 'italic',
          margin: 0,
        }}>
          Recettes, ingrédients et liste de courses.
        </p>
      </div>

      {/* New recipe button */}
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
              {i > 0 && (
                <span style={{ color: 'var(--ink-4)', fontSize: 12, userSelect: 'none' }}>·</span>
              )}
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
          <button
            onClick={onNewRecette}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--terra)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Créer la première →
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 24,
        }}>
          {filtered.map((r, i) => (
            <RecipeCard
              key={r.id}
              recette={r}
              index={i}
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

// ─── ShoppingItemRow ───────────────────────────────────────────────────────────

function ShoppingItemRow({
  item,
  onToggle,
  onRemove,
}: {
  item: CourseItem
  onToggle: () => void
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
        padding: '10px 14px',
        borderRadius: 'var(--r-lg)',
        background: item.checked ? 'transparent' : 'var(--paper-1)',
        border: '1px solid',
        borderColor: item.checked ? 'transparent' : 'var(--paper-2)',
        transition: 'background var(--dur) var(--ease)',
        opacity: item.checked ? 0.5 : 1,
      }}
    >
      <CheckBox checked={item.checked} onClick={onToggle} />
      <span style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        color: 'var(--ink)',
        flex: 1,
        textDecoration: item.checked ? 'line-through' : 'none',
        textDecorationColor: 'var(--ink-3)',
      }}>
        {item.name}
      </span>
      {item.qty && item.qty !== '—' && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
          {item.qty}
        </span>
      )}
      {item.fromRecipe && (
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          letterSpacing: '0.04em',
        }}>
          <Link size={9} />
          {item.fromRecipe}
        </span>
      )}
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

// ─── RayonGroup ────────────────────────────────────────────────────────────────

function RayonGroup({
  rayon,
  items,
  onToggle,
  onRemove,
}: {
  rayon: string
  items: CourseItem[]
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}) {
  const sorted = [...items].sort((a, b) => {
    if (a.checked === b.checked) return 0
    return a.checked ? 1 : -1
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 16,
          fontWeight: 400,
          color: 'var(--ink-2)',
          margin: 0,
        }}>
          {rayon}
        </h2>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
          {items.length === 0 ? '—' : `${items.length}`}
        </span>
      </div>

      {items.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic', margin: 0 }}>
          —
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sorted.map((item) => (
            <ShoppingItemRow
              key={item.id}
              item={item}
              onToggle={() => onToggle(item.id)}
              onRemove={() => onRemove(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── QuickAddForm ──────────────────────────────────────────────────────────────

function QuickAddForm({ onAdd }: { onAdd: (data: { name: string; qty: string; rayon: string }) => void }) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [rayon, setRayon] = useState<string>(RAYONS[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({ name: name.trim(), qty, rayon })
    setName('')
    setQty('')
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    padding: '8px 12px',
    borderRadius: 'var(--r-lg)',
    border: '1px solid var(--paper-2)',
    background: 'var(--paper-1)',
    color: 'var(--ink)',
    outline: 'none',
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        padding: '16px 0',
        borderTop: '1px solid var(--paper-2)',
        marginTop: 8,
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom de l'article…"
        style={{ ...inputStyle, flex: '2 1 160px' }}
      />
      <input
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        placeholder="Quantité"
        style={{ ...inputStyle, flex: '1 1 80px' }}
      />
      <select
        value={rayon}
        onChange={(e) => setRayon(e.target.value)}
        style={{ ...inputStyle, flex: '1 1 120px' }}
      >
        {RAYONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <button
        type="submit"
        disabled={!name.trim()}
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 500,
          padding: '8px 16px',
          borderRadius: 'var(--r-lg)',
          background: 'var(--terra)',
          color: 'var(--paper-1)',
          border: 'none',
          cursor: 'pointer',
          opacity: name.trim() ? 1 : 0.4,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Plus size={14} />
        Ajouter
      </button>
    </form>
  )
}

// ─── ListeDeCoursesView ────────────────────────────────────────────────────────

function ListeDeCoursesView({
  items,
  onToggle,
  onClearChecked,
  onAdd,
  onRemove,
}: {
  items: CourseItem[]
  onToggle: (id: string) => void
  onClearChecked: () => void
  onAdd: (data: { name: string; qty: string; rayon: string }) => void
  onRemove: (id: string) => void
}) {
  const checkedCount = items.filter((i) => i.checked).length
  const total = items.length

  const byRayon = (rayon: string) => items.filter((i) => i.rayon === rayon)

  return (
    <div className="cuisine-section-anim" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Editorial header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
        }}>
          liste de courses · {checkedCount}/{total} cochés
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 32,
            fontWeight: 400,
            color: 'var(--ink)',
            margin: 0,
            lineHeight: 1.2,
          }}>
            À rapporter.
          </h1>
          {checkedCount > 0 && (
            <button
              onClick={onClearChecked}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: 'var(--r-lg)',
                background: 'transparent',
                color: 'var(--ink-3)',
                border: '1px solid var(--ink-4)',
                cursor: 'pointer',
                marginLeft: 'auto',
              }}
            >
              <Trash2 size={13} />
              Vider les cochés
            </button>
          )}
        </div>
      </div>

      {/* Rayon groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {RAYONS.map((rayon) => (
          <RayonGroup
            key={rayon}
            rayon={rayon}
            items={byRayon(rayon)}
            onToggle={onToggle}
            onRemove={onRemove}
          />
        ))}
      </div>

      {/* Quick add */}
      <QuickAddForm onAdd={onAdd} />
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
    const newRecette = addRecette({
      nom: nom.trim(),
      categorie,
      tempsPreparation,
      favori: false,
      ingredientIds: [],
    })
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
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            fontWeight: 400,
            color: 'var(--ink)',
            margin: 0,
          }}>
            Nouvelle recette
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-3)',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nom */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            Nom *
          </label>
          <input
            autoFocus
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="ex. Risotto aux champignons"
            style={inputStyle}
          />
        </div>

        {/* Categorie + Temps */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
              Type
            </label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value as RecetteCategorie)}
              style={inputStyle}
            >
              {RECIPE_TYPES.filter((t) => t !== 'Toutes').map((t) => (
                <option key={t} value={DISPLAY_TO_CATEGORIE[t] ?? t.toLowerCase()}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
              Temps (min)
            </label>
            <input
              type="number"
              min={1}
              value={tempsPreparation}
              onChange={(e) => setTempsPreparation(Math.max(1, parseInt(e.target.value) || 1))}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              padding: '9px 18px',
              borderRadius: 'var(--r-lg)',
              background: 'transparent',
              color: 'var(--ink-3)',
              border: '1px solid var(--ink-4)',
              cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!nom.trim()}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 500,
              padding: '9px 18px',
              borderRadius: 'var(--r-lg)',
              background: 'var(--terra)',
              color: 'var(--paper-1)',
              border: 'none',
              cursor: nom.trim() ? 'pointer' : 'not-allowed',
              opacity: nom.trim() ? 1 : 0.4,
            }}
          >
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
  const recettes = useCuisineStore((s) => s.recettes)
  const ingredients = useCuisineStore((s) => s.ingredients)
  const updateRecette = useCuisineStore((s) => s.updateRecette)

  const [section, setSection] = useState<'recettes' | 'courses'>('recettes')
  const [openRecetteId, setOpenRecetteId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [courses, setCourses] = useState<CourseItem[]>(() => loadCourses())

  // Persist courses to localStorage
  useEffect(() => {
    try { localStorage.setItem(COURSES_LS_KEY, JSON.stringify(courses)) } catch {}
  }, [courses])

  const openRecette = recettes.find((r) => r.id === openRecetteId) ?? null

  const toggleFavorite = useCallback(
    (id: string) => updateRecette(id, { favori: !recettes.find((r) => r.id === id)?.favori }),
    [recettes, updateRecette],
  )

  const handleSetImage = useCallback(
    (id: string, src: string) => setRecipeImage(id, src, updateRecette),
    [updateRecette],
  )

  const handleRemoveImage = useCallback(
    (id: string) => removeRecipeImage(id, updateRecette),
    [updateRecette],
  )

  const addToCourses = useCallback(
    (recetteNom: string, newItems: CourseItem[]) => {
      const existingNames = new Set(courses.map((i) => i.name.trim().toLowerCase()))
      const fresh = newItems.filter((i) => !existingNames.has(i.name.trim().toLowerCase()))
      if (fresh.length === 0) {
        setToast('Tout est déjà dans la liste.')
        return
      }
      setCourses((prev) => [...prev, ...fresh])
      setToast(`${fresh.length} ingrédient${fresh.length > 1 ? 's' : ''} ajouté${fresh.length > 1 ? 's' : ''} à la liste.`)
    },
    [courses],
  )

  const toggleCourse = useCallback(
    (id: string) => setCourses((prev) => prev.map((i) => i.id === id ? { ...i, checked: !i.checked } : i)),
    [],
  )

  const clearChecked = useCallback(
    () => setCourses((prev) => prev.filter((i) => !i.checked)),
    [],
  )

  const addCourse = useCallback(
    (data: { name: string; qty: string; rayon: string }) => {
      const item: CourseItem = {
        id: crypto.randomUUID(),
        name: data.name,
        qty: data.qty || '—',
        rayon: data.rayon || 'Autre',
        checked: false,
        fromRecipe: null,
      }
      setCourses((prev) => [...prev, item])
    },
    [],
  )

  const removeCourse = useCallback(
    (id: string) => setCourses((prev) => prev.filter((i) => i.id !== id)),
    [],
  )

  const checkedCount = courses.filter((i) => i.checked).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Section tabs */}
      <SectionTabs
        section={section}
        recettesCount={recettes.length}
        coursesChecked={checkedCount}
        coursesTotal={courses.length}
        onChange={setSection}
      />

      {/* Content */}
      <div style={{ padding: '40px 0' }}>
        {section === 'recettes' ? (
          <RecettesView
            recettes={recettes}
            onOpen={setOpenRecetteId}
            onToggleFavorite={toggleFavorite}
            onSetImage={handleSetImage}
            onRemoveImage={handleRemoveImage}
            onNewRecette={() => setShowNewModal(true)}
          />
        ) : (
          <ListeDeCoursesView
            items={courses}
            onToggle={toggleCourse}
            onClearChecked={clearChecked}
            onAdd={addCourse}
            onRemove={removeCourse}
          />
        )}
      </div>

      {/* Recipe detail panel */}
      {openRecette && (
        <RecipeDetailPanel
          recette={openRecette}
          allIngredients={ingredients}
          courses={courses}
          onClose={() => setOpenRecetteId(null)}
          onToggleFavorite={() => toggleFavorite(openRecette.id)}
          onAddToCourses={addToCourses}
        />
      )}

      {/* New recipe modal */}
      {showNewModal && (
        <NewRecipeModal
          onClose={() => setShowNewModal(false)}
          onCreate={(id) => {
            setShowNewModal(false)
            setOpenRecetteId(id)
          }}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
