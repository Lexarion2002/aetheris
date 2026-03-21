import { useState, useMemo, useRef } from 'react'
import { useCuisineStore } from '../store/cuisineStore'
import type { Recette, Ingredient, RecetteCategorie, IngredientCategorie } from '../types/cuisine'

// ─── Constants ────────────────────────────────────────────────────────────────

const RECETTE_CATEGORIES: { value: RecetteCategorie; label: string; icon: string }[] = [
  { value: 'entree',  label: 'Entrée',   icon: '🥗' },
  { value: 'plat',    label: 'Plat',     icon: '🍽️' },
  { value: 'dessert', label: 'Dessert',  icon: '🍰' },
  { value: 'snack',   label: 'Snack',    icon: '🥨' },
  { value: 'boisson', label: 'Boisson',  icon: '🥤' },
  { value: 'sauce',   label: 'Sauce',    icon: '🫙' },
  { value: 'autre',   label: 'Autre',    icon: '🍴' },
]

const INGREDIENT_CATEGORIES: { value: IngredientCategorie; label: string; icon: string }[] = [
  { value: 'legume',          label: 'Légume',         icon: '🥦' },
  { value: 'fruit',           label: 'Fruit',          icon: '🍎' },
  { value: 'viande',          label: 'Viande',         icon: '🥩' },
  { value: 'poisson',         label: 'Poisson',        icon: '🐟' },
  { value: 'produit_laitier', label: 'Produit laitier',icon: '🧀' },
  { value: 'cereale',         label: 'Céréale',        icon: '🌾' },
  { value: 'legumineuse',     label: 'Légumineuse',    icon: '🫘' },
  { value: 'oeuf',            label: 'Œuf',            icon: '🥚' },
  { value: 'herbe',           label: 'Herbe',          icon: '🌿' },
  { value: 'epice',           label: 'Épice',          icon: '🌶️' },
  { value: 'huile',           label: 'Huile',          icon: '🫒' },
  { value: 'condiment',       label: 'Condiment',      icon: '🧂' },
  { value: 'conserve',        label: 'Conserve',       icon: '🥫' },
  { value: 'boisson',         label: 'Boisson',        icon: '🧃' },
  { value: 'autre',           label: 'Autre',          icon: '📦' },
]

function catRecette(value: RecetteCategorie) {
  return RECETTE_CATEGORIES.find((c) => c.value === value) ?? { label: value, icon: '🍴' }
}

function catIngredient(value: IngredientCategorie) {
  return INGREDIENT_CATEGORIES.find((c) => c.value === value) ?? { label: value, icon: '📦' }
}

function fmtTemps(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: 'recettes' | 'courses'; onChange: (t: 'recettes' | 'courses') => void }) {
  return (
    <div className="flex gap-1 rounded-xl bg-zinc-900 p-1 w-fit">
      {(['recettes', 'courses'] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={[
            'rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150 outline-none',
            'focus-visible:ring-1 focus-visible:ring-teal-500/50',
            active === tab
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300',
          ].join(' ')}
        >
          {tab === 'recettes' ? '🍽️ Recettes' : '🛒 Liste de courses'}
        </button>
      ))}
    </div>
  )
}

// ─── Modal Recette ────────────────────────────────────────────────────────────

function ModalRecette({
  initial,
  allIngredients,
  onSave,
  onClose,
}: {
  initial?: Recette
  allIngredients: Ingredient[]
  onSave: (data: Omit<Recette, 'id'>) => void
  onClose: () => void
}) {
  const [nom,              setNom]              = useState(initial?.nom              ?? '')
  const [categorie,        setCategorie]        = useState<RecetteCategorie>(initial?.categorie ?? 'plat')
  const [tempsPreparation, setTempsPreparation] = useState(initial?.tempsPreparation ?? 30)
  const [lien,             setLien]             = useState(initial?.lien             ?? '')
  const [favori,           setFavori]           = useState(initial?.favori           ?? false)
  const [ingredientIds,    setIngredientIds]    = useState<string[]>(initial?.ingredientIds ?? [])

  const [image,        setImage]        = useState<string | undefined>(initial?.image)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => setImage(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const addIngredient  = useCuisineStore((s) => s.addIngredient)
  const [ingQuery,     setIngQuery]     = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const ingInputRef = useRef<HTMLInputElement>(null)

  // Ingrédients non encore sélectionnés qui matchent la query
  const suggestions = useMemo(() => {
    if (!ingQuery.trim()) return []
    const q = ingQuery.trim().toLowerCase()
    return allIngredients.filter(
      (i) => !ingredientIds.includes(i.id) && i.nom.toLowerCase().includes(q),
    )
  }, [ingQuery, allIngredients, ingredientIds])

  // Vrai si la query correspond exactement à un ingrédient existant (sélectionné ou non)
  const hasExactMatch = useMemo(() => {
    const q = ingQuery.trim().toLowerCase()
    return q.length > 0 && allIngredients.some((i) => i.nom.toLowerCase() === q)
  }, [ingQuery, allIngredients])

  const addToSelection = (id: string) => {
    setIngredientIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setIngQuery('')
    setShowDropdown(false)
    ingInputRef.current?.focus()
  }

  const removeFromSelection = (id: string) =>
    setIngredientIds((prev) => prev.filter((i) => i !== id))

  const createAndAdd = () => {
    const trimmed = ingQuery.trim()
    if (!trimmed) return
    const existing = allIngredients.find((i) => i.nom.toLowerCase() === trimmed.toLowerCase())
    if (existing) {
      addToSelection(existing.id)
    } else {
      const newIng = addIngredient({ nom: trimmed, categorie: 'autre', disponible: false, recetteIds: [] })
      setIngredientIds((prev) => [...prev, newIng.id])
      setIngQuery('')
      setShowDropdown(false)
      ingInputRef.current?.focus()
    }
  }

  const handleIngKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions.length > 0) addToSelection(suggestions[0].id)
      else if (ingQuery.trim()) createAndAdd()
    } else if (e.key === 'Escape') {
      setIngQuery('')
      setShowDropdown(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim()) return
    onSave({ nom: nom.trim(), categorie, tempsPreparation, favori, lien: lien.trim() || undefined, image, ingredientIds })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl flex flex-col gap-4"
      >
        <h2 className="text-base font-semibold text-zinc-100">
          {initial ? 'Modifier la recette' : 'Nouvelle recette'}
        </h2>

        {/* Nom */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-500">Nom</label>
          <input
            autoFocus
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="ex. Risotto aux champignons"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-colors"
          />
        </div>

        {/* Catégorie + Temps */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-500">Catégorie</label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value as RecetteCategorie)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-colors"
            >
              {RECETTE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-500">Temps de préparation (min)</label>
            <input
              type="number"
              min={1}
              value={tempsPreparation}
              onChange={(e) => setTempsPreparation(Math.max(1, parseInt(e.target.value) || 1))}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-colors"
            />
          </div>
        </div>

        {/* Lien */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-500">Lien (optionnel)</label>
          <input
            value={lien}
            onChange={(e) => setLien(e.target.value)}
            placeholder="https://..."
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-colors"
          />
        </div>

        {/* Favori */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={favori}
            onChange={(e) => setFavori(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-teal-500"
          />
          <span className="text-sm text-zinc-400">Marquer comme favori ⭐</span>
        </label>

        {/* Image */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-500">Image (optionnel)</label>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }}
          />
          {image ? (
            <div className="relative rounded-xl overflow-hidden">
              <img src={image} alt="aperçu" className="w-full h-32 object-cover" />
              <button
                type="button"
                onClick={() => setImage(undefined)}
                className="absolute top-2 right-2 rounded-lg bg-zinc-950/70 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-950 transition-colors"
              >
                Supprimer
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleImageFile(f) }}
              className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-800/40 py-6 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              <span className="text-2xl">📷</span>
              <span className="text-xs">Cliquer ou glisser une image</span>
            </button>
          )}
        </div>

        {/* Ingrédients */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-zinc-500">
            Ingrédients{ingredientIds.length > 0 ? ` (${ingredientIds.length})` : ''}
          </label>

          {/* Chips sélectionnés */}
          {ingredientIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {ingredientIds.map((id) => {
                const ing = allIngredients.find((i) => i.id === id)
                if (!ing) return null
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-md bg-teal-500/15 border border-teal-500/30 px-2 py-0.5 text-xs text-teal-400"
                  >
                    {catIngredient(ing.categorie).icon} {ing.nom}
                    <button
                      type="button"
                      onClick={() => removeFromSelection(id)}
                      className="ml-0.5 text-teal-600 hover:text-teal-300 transition-colors leading-none"
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          )}

          {/* Input autocomplete */}
          <div className="relative">
            <input
              ref={ingInputRef}
              value={ingQuery}
              onChange={(e) => { setIngQuery(e.target.value); setShowDropdown(true) }}
              onKeyDown={handleIngKeyDown}
              onFocus={() => { if (ingQuery.trim()) setShowDropdown(true) }}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Rechercher ou créer un ingrédient…"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-colors"
            />
            {showDropdown && ingQuery.trim() && (suggestions.length > 0 || !hasExactMatch) && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden">
                {/* Ingrédients existants matchant la query */}
                {suggestions.slice(0, 6).map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onMouseDown={() => addToSelection(i.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <span className="text-base">{catIngredient(i.categorie).icon}</span>
                    <span className="flex-1 text-left">{i.nom}</span>
                    <span className="text-[11px] text-zinc-600">{catIngredient(i.categorie).label}</span>
                  </button>
                ))}
                {/* Option créer — toujours présente sauf si exact match */}
                {!hasExactMatch && (
                  <button
                    type="button"
                    onMouseDown={createAndAdd}
                    className={[
                      'flex w-full items-center gap-2 px-3 py-2 text-sm text-teal-400 hover:bg-zinc-800 transition-colors',
                      suggestions.length > 0 ? 'border-t border-zinc-700/50' : '',
                    ].join(' ')}
                  >
                    <span className="text-base">+</span>
                    <span>Créer « {ingQuery.trim()} »</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!nom.trim()}
            className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-teal-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {initial ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Modal Ingredient ─────────────────────────────────────────────────────────

function ModalIngredient({
  initial,
  onSave,
  onClose,
}: {
  initial?: Ingredient
  onSave: (data: Omit<Ingredient, 'id'>) => void
  onClose: () => void
}) {
  const [nom,       setNom]       = useState(initial?.nom       ?? '')
  const [categorie, setCategorie] = useState<IngredientCategorie>(initial?.categorie ?? 'autre')
  const [quantite,  setQuantite]  = useState(initial?.quantite  ?? '')
  const [disponible, setDisponible] = useState(initial?.disponible ?? true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim()) return
    onSave({
      nom:        nom.trim(),
      categorie,
      quantite:   quantite.trim() || undefined,
      disponible,
      recetteIds: initial?.recetteIds ?? [],
    })
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
        <h2 className="text-base font-semibold text-zinc-100">
          {initial ? 'Modifier l\'ingrédient' : 'Nouvel ingrédient'}
        </h2>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-500">Nom</label>
          <input
            autoFocus
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="ex. Tomates cerises"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-500">Catégorie</label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value as IngredientCategorie)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-teal-500/50 transition-colors"
            >
              {INGREDIENT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-500">Quantité (optionnel)</label>
            <input
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              placeholder="ex. 200g"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-teal-500/50 transition-colors"
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={disponible}
            onChange={(e) => setDisponible(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-teal-500"
          />
          <span className="text-sm text-zinc-400">Disponible à la maison</span>
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!nom.trim()}
            className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-teal-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {initial ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Vue Recettes ─────────────────────────────────────────────────────────────

function VueRecettes() {
  const recettes          = useCuisineStore((s) => s.recettes)
  const ingredients       = useCuisineStore((s) => s.ingredients)
  const addRecette        = useCuisineStore((s) => s.addRecette)
  const updateRecette     = useCuisineStore((s) => s.updateRecette)
  const deleteRecette     = useCuisineStore((s) => s.deleteRecette)
  const addIngredient     = useCuisineStore((s) => s.addIngredient)
  const updateIngredient  = useCuisineStore((s) => s.updateIngredient)
  const deleteIngredient  = useCuisineStore((s) => s.deleteIngredient)
  const toggleDisponible  = useCuisineStore((s) => s.toggleDisponible)
  const listeCourses      = useCuisineStore((s) => s.listeCourses)
  const addToListeCourses = useCuisineStore((s) => s.addToListeCourses)
  const removeFromLC      = useCuisineStore((s) => s.removeFromListeCourses)

  const [filterCat,   setFilterCat]   = useState<RecetteCategorie | 'all'>('all')
  const [favoriOnly,  setFavoriOnly]  = useState(false)
  const [showModal,   setShowModal]   = useState(false)
  const [editRecette, setEditRecette] = useState<Recette | undefined>()
  const [showIngModal, setShowIngModal] = useState(false)
  const [editIngr,    setEditIngr]    = useState<Ingredient | undefined>()
  const [activePanel, setActivePanel] = useState<'recettes' | 'ingredients'>('recettes')

  const filtered = useMemo(() => {
    return recettes.filter((r) => {
      if (filterCat !== 'all' && r.categorie !== filterCat) return false
      if (favoriOnly && !r.favori) return false
      return true
    })
  }, [recettes, filterCat, favoriOnly])

  const openNew    = () => { setEditRecette(undefined); setShowModal(true) }
  const openEdit   = (r: Recette) => { setEditRecette(r); setShowModal(true) }
  const closeModal = () => { setEditRecette(undefined); setShowModal(false) }

  const handleSaveRecette = (data: Omit<Recette, 'id'>) => {
    if (editRecette) updateRecette(editRecette.id, data)
    else             addRecette(data)
    setEditRecette(undefined)
    setShowModal(false)
  }

  const openNewIng    = () => { setEditIngr(undefined); setShowIngModal(true) }
  const openEditIng   = (i: Ingredient) => { setEditIngr(i); setShowIngModal(true) }
  const closeIngModal = () => { setEditIngr(undefined); setShowIngModal(false) }

  const handleSaveIngredient = (data: Omit<Ingredient, 'id'>) => {
    if (editIngr) updateIngredient(editIngr.id, data)
    else          addIngredient(data)
    setEditIngr(undefined)
    setShowIngModal(false)
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Sous-onglets ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-zinc-900 p-0.5">
          {(['recettes', 'ingredients'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setActivePanel(p)}
              className={[
                'rounded-md px-3 py-1 text-xs font-medium transition-all outline-none',
                activePanel === p ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400',
              ].join(' ')}
            >
              {p === 'recettes' ? 'Recettes' : 'Ingrédients'}
            </button>
          ))}
        </div>
        <button
          onClick={activePanel === 'recettes' ? openNew : openNewIng}
          className="flex items-center gap-1.5 rounded-lg bg-teal-500/15 border border-teal-500/25 px-3 py-1.5 text-xs font-medium text-teal-400 hover:bg-teal-500/25 transition-colors"
        >
          <span>+</span>
          {activePanel === 'recettes' ? 'Recette' : 'Ingrédient'}
        </button>
      </div>

      {/* ── Panel Recettes ───────────────────────────────────────────────────── */}
      {activePanel === 'recettes' && (
        <div className="flex flex-col gap-4">
          {/* Filtres */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterCat('all')}
              className={[
                'rounded-lg px-3 py-1 text-xs font-medium border transition-colors',
                filterCat === 'all'
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                  : 'bg-transparent border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400',
              ].join(' ')}
            >
              Toutes
            </button>
            {RECETTE_CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setFilterCat(c.value)}
                className={[
                  'rounded-lg px-3 py-1 text-xs font-medium border transition-colors',
                  filterCat === c.value
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                    : 'bg-transparent border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400',
                ].join(' ')}
              >
                {c.icon} {c.label}
              </button>
            ))}
            <button
              onClick={() => setFavoriOnly((v) => !v)}
              className={[
                'rounded-lg px-3 py-1 text-xs font-medium border transition-colors ml-auto',
                favoriOnly
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-transparent border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400',
              ].join(' ')}
            >
              ⭐ Favoris
            </button>
          </div>

          {/* Liste */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="text-3xl">🍽️</span>
              <p className="text-sm text-zinc-500">Aucune recette{filterCat !== 'all' ? ' dans cette catégorie' : ''}.</p>
              <button onClick={openNew} className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
                Ajouter la première →
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((r) => {
                const cat   = catRecette(r.categorie)
                const inLC  = listeCourses.includes(r.id)
                const ingCount = r.ingredientIds.length
                return (
                  <div
                    key={r.id}
                    className="group relative rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-colors flex flex-col overflow-hidden"
                  >
                    {/* Image cover */}
                    {r.image && (
                      <img
                        src={r.image}
                        alt={r.nom}
                        className="w-full h-[120px] object-cover"
                      />
                    )}
                    {/* Content */}
                    <div className="flex flex-col gap-3 p-4">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0 mt-0.5">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-medium text-zinc-100 truncate">{r.nom}</h3>
                          {r.favori && <span className="text-xs text-amber-400">⭐</span>}
                        </div>
                        <p className="text-xs text-zinc-600 mt-0.5">{cat.label}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Favori toggle */}
                        <button
                          onClick={() => updateRecette(r.id, { favori: !r.favori })}
                          className="rounded p-1 text-zinc-600 hover:text-amber-400 transition-colors opacity-0 group-hover:opacity-100"
                          title={r.favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        >
                          {r.favori ? '★' : '☆'}
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => openEdit(r)}
                          className="rounded p-1 text-zinc-600 hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          ✎
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => { if (confirm(`Supprimer « ${r.nom} » ?`)) deleteRecette(r.id) }}
                          className="rounded p-1 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400 border border-zinc-700/50">
                        ⏱ {fmtTemps(r.tempsPreparation)}
                      </span>
                      {ingCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400 border border-zinc-700/50">
                          🧂 {ingCount} ingrédient{ingCount > 1 ? 's' : ''}
                        </span>
                      )}
                      {r.lien && (
                        <a
                          href={r.lien}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-teal-500 border border-zinc-700/50 hover:text-teal-400 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ↗ Recette
                        </a>
                      )}
                    </div>

                    {/* Ajouter à la liste de courses */}
                    <button
                      onClick={() => inLC ? removeFromLC(r.id) : addToListeCourses(r.id)}
                      className={[
                        'w-full rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                        inLC
                          ? 'border-teal-500/30 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20'
                          : 'border-zinc-700 bg-zinc-800/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300',
                      ].join(' ')}
                    >
                      {inLC ? '✓ Dans la liste de courses' : '+ Ajouter à la liste de courses'}
                    </button>
                    </div>{/* /Content */}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Panel Ingrédients ────────────────────────────────────────────────── */}
      {activePanel === 'ingredients' && (
        <div className="flex flex-col gap-3">
          {ingredients.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="text-3xl">🧂</span>
              <p className="text-sm text-zinc-500">Aucun ingrédient enregistré.</p>
              <button onClick={openNewIng} className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
                Ajouter le premier →
              </button>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {ingredients.map((i) => {
                const cat = catIngredient(i.categorie)
                return (
                  <div
                    key={i.id}
                    className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 hover:border-zinc-700 transition-colors"
                  >
                    <span className="text-lg shrink-0">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{i.nom}</p>
                      <p className="text-[11px] text-zinc-600">
                        {cat.label}{i.quantite ? ` · ${i.quantite}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleDisponible(i.id)}
                      className={[
                        'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium border cursor-pointer transition-colors',
                        i.disponible
                          ? 'bg-teal-500/10 border-teal-500/25 text-teal-500 hover:bg-teal-500/20'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-600 hover:border-zinc-500 hover:text-zinc-400',
                      ].join(' ')}
                    >
                      {i.disponible ? 'Dispo' : 'Manquant'}
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditIng(i)}
                        className="rounded p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => { if (confirm(`Supprimer « ${i.nom} » ?`)) deleteIngredient(i.id) }}
                        className="rounded p-1 text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <ModalRecette
          initial={editRecette}
          allIngredients={ingredients}
          onSave={handleSaveRecette}
          onClose={closeModal}
        />
      )}
      {showIngModal && (
        <ModalIngredient
          initial={editIngr}
          onSave={handleSaveIngredient}
          onClose={closeIngModal}
        />
      )}
    </div>
  )
}

// ─── Vue Liste de courses ─────────────────────────────────────────────────────

function VueListeCourses() {
  const recettes             = useCuisineStore((s) => s.recettes)
  const ingredients          = useCuisineStore((s) => s.ingredients)
  const listeCourses         = useCuisineStore((s) => s.listeCourses)
  const removeFromLC         = useCuisineStore((s) => s.removeFromListeCourses)
  const clearListeCourses    = useCuisineStore((s) => s.clearListeCourses)
  const toggleDisponible     = useCuisineStore((s) => s.toggleDisponible)
  const generateListeCourses = useCuisineStore((s) => s.generateListeCourses)

  const planifiees = useMemo(
    () => recettes.filter((r) => listeCourses.includes(r.id)),
    [recettes, listeCourses],
  )

  // Agréger tous les ingrédients manquants des recettes planifiées
  const manquants = useMemo(() => {
    const ids = new Set<string>()
    listeCourses.forEach((rId) => {
      generateListeCourses(rId).forEach((i) => ids.add(i.id))
    })
    return ingredients.filter((i) => ids.has(i.id))
  }, [listeCourses, ingredients, generateListeCourses])

  // Grouper par catégorie
  const grouped = useMemo(() => {
    const map = new Map<IngredientCategorie, Ingredient[]>()
    manquants.forEach((i) => {
      const list = map.get(i.categorie) ?? []
      list.push(i)
      map.set(i.categorie, list)
    })
    return map
  }, [manquants])

  const total    = manquants.length
  const achetes  = ingredients.filter((i) => manquants.some((m) => m.id === i.id) && i.disponible).length

  return (
    <div className="flex flex-col gap-6">

      {/* Recettes planifiées */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-400">
            Recettes planifiées ({planifiees.length})
          </h2>
          {listeCourses.length > 0 && (
            <button
              onClick={() => { if (confirm('Vider la liste de courses ?')) clearListeCourses() }}
              className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
            >
              Vider la liste
            </button>
          )}
        </div>

        {planifiees.length === 0 ? (
          <p className="text-sm text-zinc-600 py-4 text-center">
            Aucune recette planifiée — va dans l'onglet Recettes et clique sur « + Ajouter à la liste ».
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {planifiees.map((r) => {
              const cat = catRecette(r.categorie)
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2"
                >
                  <span className="text-sm">{cat.icon}</span>
                  <span className="text-sm text-zinc-300">{r.nom}</span>
                  <button
                    onClick={() => removeFromLC(r.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors text-xs"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Séparateur */}
      {listeCourses.length > 0 && <div className="border-t border-zinc-800/60" />}

      {/* Ingrédients à acheter */}
      {listeCourses.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-400">
              À acheter
            </h2>
            {total > 0 && (
              <span className="text-xs text-zinc-600 tabular-nums">
                {achetes}/{total} cochés
              </span>
            )}
          </div>

          {total === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="text-3xl">✅</span>
              <p className="text-sm text-zinc-500">Tous les ingrédients sont disponibles !</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {Array.from(grouped.entries()).map(([categorie, items]) => {
                const catMeta = catIngredient(categorie)
                return (
                  <div key={categorie} className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                      <span>{catMeta.icon}</span>
                      {catMeta.label}
                    </p>
                    {items.map((i) => (
                      <label
                        key={i.id}
                        className={[
                          'flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors select-none',
                          i.disponible
                            ? 'border-zinc-800/50 bg-zinc-900/30 opacity-50'
                            : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700',
                        ].join(' ')}
                      >
                        <input
                          type="checkbox"
                          checked={i.disponible}
                          onChange={() => toggleDisponible(i.id)}
                          className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-teal-500 shrink-0"
                        />
                        <span className={[
                          'flex-1 text-sm transition-colors',
                          i.disponible ? 'line-through text-zinc-600' : 'text-zinc-200',
                        ].join(' ')}>
                          {i.nom}
                        </span>
                        {i.quantite && (
                          <span className="text-xs text-zinc-600 shrink-0">{i.quantite}</span>
                        )}
                      </label>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function CuisinePage() {
  const [tab, setTab] = useState<'recettes' | 'courses'>('recettes')

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
          <span>🍳</span> Cuisine
        </h1>
        <p className="text-sm text-zinc-500">Recettes, ingrédients et liste de courses.</p>
      </div>

      {/* Tabs */}
      <TabBar active={tab} onChange={setTab} />

      {/* Content */}
      {tab === 'recettes' ? <VueRecettes /> : <VueListeCourses />}
    </div>
  )
}
