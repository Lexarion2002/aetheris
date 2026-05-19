import { useState, useMemo, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { saveImage as dbSaveImage, loadImage as dbLoadImage, deleteImage as dbDeleteImage } from '../lib/imageDb'
import { Plus, ArrowRight, X, Check, ImagePlus, Link2, Crop as CropIcon } from 'lucide-react'
import { useShoppingStore } from '../store/shoppingStore'
import { useStore } from '../store'
import { computeMonthBalance } from '../utils/financeUtils'
import type {
  ShoppingItem,
  BoughtItem,
  ShoppingCategory,
  ShoppingPriority,
  ShoppingVerdict,
} from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITIES: ShoppingPriority[] = ['Envie', 'Besoin', 'Urgent']
const VERDICTS: ShoppingVerdict[] = ['Satisfait', 'Mitigé', 'Déçu']
const PRIORITY_LEVEL: Record<ShoppingPriority, number> = { Envie: 1, Besoin: 2, Urgent: 3 }
const CAT_SWATCHES = [
  '#B5532A', '#EAD1BE', '#7E9A7A', '#D5DFD0',
  '#6B5B48', '#DFD2B5', '#A08B72', '#3A2E22',
]
const STORAGE_PREFIX = 'aetheris-wish-img-'
const FRENCH_MONTHS = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

const today = () => new Date().toISOString().split('T')[0]

const catOf = (categories: ShoppingCategory[], categoryId?: string) =>
  categories.find((c) => c.id === categoryId) ?? { name: '—', color: 'var(--ink-4)' }

interface Finance {
  solde: number
  marge: number
  revenuMensuel: number
}

type VerdictKind = 'confortable' | 'faisable' | 'deconseille'

interface VerdictResult {
  kind: VerdictKind
  headline: string
  body: string
  metrics: {
    soldeAfter: number
    margeAfter: number
    epargne: number
    epargnePct: number
  }
}

function computeVerdict(price: number, finance: Finance): VerdictResult {
  const { solde, marge, revenuMensuel } = finance
  const epargne = marge - price
  const ratioSolde = solde > 0 ? price / solde : 1
  const epargnePct = revenuMensuel > 0 ? epargne / revenuMensuel : -1

  let kind: VerdictKind
  let headline: string
  let body: string

  if (ratioSolde <= 0.18 && epargnePct >= 0.15) {
    kind = 'confortable'
    headline = 'Confortable'
    body = "Cet achat représente une part modérée de votre solde et laisse une épargne suffisante ce mois-ci."
  } else if (ratioSolde <= 0.45 && epargne >= 0) {
    kind = 'faisable'
    headline = 'Faisable'
    body = "Cet achat est possible mais entame une part notable de votre marge mensuelle. À vous de décider."
  } else {
    kind = 'deconseille'
    headline = 'Déconseillé'
    body = "Cet achat dépasse votre marge disponible ou représente une part trop importante de votre solde."
  }

  return {
    kind,
    headline,
    body,
    metrics: {
      soldeAfter: solde - price,
      margeAfter: marge - price,
      epargne,
      epargnePct,
    },
  }
}

const VERDICT_TONE: Record<VerdictKind, { color: string; bg: string; border: string }> = {
  confortable:  { color: 'var(--sage-deep)',  bg: 'var(--sage-soft)',  border: '#B9C8B4' },
  faisable:     { color: 'var(--terra-deep)', bg: 'var(--terra-soft)', border: '#DEB89C' },
  deconseille:  { color: 'var(--danger)',     bg: '#F0DCCC',           border: '#E0B6A2' },
}

// ─── PriorityDots ─────────────────────────────────────────────────────────────

function PriorityDots({ priority }: { priority: ShoppingPriority }) {
  const level = PRIORITY_LEVEL[priority]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
      {[3, 2, 1].map((i) => (
        <div
          key={i}
          style={{
            width: 12,
            height: 2,
            borderRadius: 2,
            background: i <= level ? 'var(--terra)' : 'var(--paper-3)',
          }}
        />
      ))}
    </div>
  )
}

// ─── IconBtn ──────────────────────────────────────────────────────────────────

function IconBtn({
  onClick,
  title,
  children,
}: {
  onClick: (e: React.MouseEvent) => void
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: 24,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        border: 'none',
        background: 'transparent',
        color: 'var(--ink-3)',
        cursor: 'pointer',
        transition: 'color var(--dur) var(--ease), background var(--dur) var(--ease)',
        padding: 0,
      }}
      onMouseEnter={(e) => {
        const t = e.currentTarget as HTMLButtonElement
        t.style.color = 'var(--terra)'
        t.style.background = 'var(--paper-1)'
      }}
      onMouseLeave={(e) => {
        const t = e.currentTarget as HTMLButtonElement
        t.style.color = 'var(--ink-3)'
        t.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

// ─── CropModal ────────────────────────────────────────────────────────────────

function CropModal({ src, onConfirm, onClose }: {
  src: string
  onConfirm: (blob: Blob) => void
  onClose: () => void
}) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<Crop>()
  const imgRef = useRef<HTMLImageElement>(null)

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 80 }, width / height, width, height), width, height))
  }

  const handleConfirm = () => {
    const img = imgRef.current
    if (!img || !completedCrop?.width || !completedCrop?.height) return

    const scaleX = img.naturalWidth  / img.width
    const scaleY = img.naturalHeight / img.height
    const canvas = document.createElement('canvas')
    canvas.width  = completedCrop.width  * scaleX
    canvas.height = completedCrop.height * scaleY
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(
      img,
      completedCrop.x * scaleX, completedCrop.y * scaleY,
      completedCrop.width * scaleX, completedCrop.height * scaleY,
      0, 0, canvas.width, canvas.height,
    )
    canvas.toBlob((blob) => { if (blob) onConfirm(blob) }, 'image/jpeg', 0.9)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(30,24,18,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--paper-1)',
          borderRadius: 'var(--r-lg)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          maxWidth: '90vw',
          maxHeight: '90vh',
          boxShadow: 'var(--shadow-2)',
        }}
      >
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--ink)' }}>
          Recadrer l'image
        </div>
        <div style={{ overflow: 'auto', maxHeight: 'calc(90vh - 120px)' }}>
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            style={{ maxWidth: '100%' }}
          >
            <img
              ref={imgRef}
              src={src}
              onLoad={onImageLoad}
              style={{ maxWidth: '70vw', maxHeight: '70vh', display: 'block' }}
              alt=""
            />
          </ReactCrop>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid var(--paper-2)', background: 'transparent',
              borderRadius: 'var(--r-md)', padding: '6px 14px',
              fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-3)',
              cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              border: 'none', background: 'var(--terra)',
              borderRadius: 'var(--r-md)', padding: '6px 14px',
              fontFamily: 'var(--font-sans)', fontSize: 13, color: '#fff',
              cursor: 'pointer',
            }}
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CardImage ────────────────────────────────────────────────────────────────

function CardImage({ itemId }: { itemId: string }) {
  const dbKey = STORAGE_PREFIX + itemId
  const [src, setSrc] = useState<string>('')
  const [showUrl, setShowUrl] = useState(false)
  const [url, setUrl] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)

  // Libère l'object URL précédent pour éviter les fuites mémoire
  const setAndTrackSrc = useCallback((newSrc: string) => {
    if (objectUrlRef.current && objectUrlRef.current !== newSrc) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    if (newSrc.startsWith('blob:')) objectUrlRef.current = newSrc
    setSrc(newSrc)
  }, [])

  // Charge l'image depuis IndexedDB au montage
  useLayoutEffect(() => {
    let cancelled = false
    dbLoadImage(dbKey).then((loaded) => {
      if (!cancelled && loaded) setAndTrackSrc(loaded)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [dbKey, setAndTrackSrc])

  // Synchronisation entre cartes du même item
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (detail) setAndTrackSrc(detail)
    }
    window.addEventListener(`aetheris-img-${itemId}`, handler)
    return () => window.removeEventListener(`aetheris-img-${itemId}`, handler)
  }, [itemId, setAndTrackSrc])

  const persistAndShow = useCallback((blob: Blob, previewUrl: string) => {
    dbSaveImage(dbKey, blob).catch(() => {})
    setAndTrackSrc(previewUrl)
    window.dispatchEvent(new CustomEvent(`aetheris-img-${itemId}`, { detail: previewUrl }))
  }, [dbKey, itemId, setAndTrackSrc])

  const handleFile = useCallback((file: File) => {
    const previewUrl = URL.createObjectURL(file)
    persistAndShow(file, previewUrl)
  }, [persistAndShow])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    const u = url.trim()
    // Pour les URLs externes on stocke la chaîne directement (pas de Blob)
    dbSaveImage(dbKey, new Blob([u], { type: 'text/plain' })).catch(() => {})
    setAndTrackSrc(u)
    window.dispatchEvent(new CustomEvent(`aetheris-img-${itemId}`, { detail: u }))
    setShowUrl(false)
    setUrl('')
  }

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    dbDeleteImage(dbKey).catch(() => {})
    setAndTrackSrc('')
    window.dispatchEvent(new CustomEvent(`aetheris-img-${itemId}`, { detail: '' }))
  }

  if (src) {
    return (
      <div
        className="card-image"
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        style={{
          margin: '-20px -20px 4px',
          height: 160,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
          ...(dragActive ? { outline: '2px dashed var(--terra)', outlineOffset: -2 } : {}),
        }}
      >
        <img
          src={src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <div
          className="card-image-ctl"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 4,
            background: 'rgba(251,246,234,0.85)',
            borderRadius: 8,
            padding: 4,
          }}
        >
          <IconBtn onClick={removeImage} title="Supprimer l'image">
            <X size={13} />
          </IconBtn>
          <IconBtn onClick={(e) => { e.stopPropagation(); setCropOpen(true) }} title="Recadrer">
            <CropIcon size={13} />
          </IconBtn>
          <IconBtn onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }} title="Changer d'image">
            <ImagePlus size={13} />
          </IconBtn>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {cropOpen && (
          <CropModal
            src={src}
            onConfirm={(blob) => {
              const previewUrl = URL.createObjectURL(blob)
              persistAndShow(blob, previewUrl)
              setCropOpen(false)
            }}
            onClose={() => setCropOpen(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <div
        className="card-image-trigger"
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'flex',
          gap: 4,
          zIndex: 2,
        }}
      >
        {showUrl ? (
          <form
            onSubmit={handleUrlSubmit}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              gap: 4,
              background: 'var(--paper-1)',
              border: '1px solid var(--paper-2)',
              borderRadius: 8,
              padding: '4px 6px',
              boxShadow: 'var(--shadow-2)',
            }}
          >
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              autoFocus
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 12,
                width: 140,
                color: 'var(--ink)',
              }}
            />
            <button
              type="submit"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--terra)', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <Check size={13} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowUrl(false) }}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <X size={13} />
            </button>
          </form>
        ) : (
          <div
            style={{
              background: 'var(--paper-1)',
              border: '1px solid var(--paper-2)',
              borderRadius: 8,
              padding: 4,
              display: 'flex',
              gap: 4,
              boxShadow: 'var(--shadow-1)',
            }}
          >
            <IconBtn onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }} title="Ajouter une image">
              <ImagePlus size={13} />
            </IconBtn>
            <IconBtn onClick={(e) => { e.stopPropagation(); setShowUrl(true) }} title="URL d'image">
              <Link2 size={13} />
            </IconBtn>
          </div>
        )}
      </div>
      {dragActive && (
        <div
          style={{
            margin: '-20px -20px 4px',
            height: 160,
            borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
            border: '2px dashed var(--terra)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--terra)',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
          }}
        >
          Déposer l'image ici
        </div>
      )}
    </div>
  )
}

// ─── WishCard ─────────────────────────────────────────────────────────────────

interface WishCardProps {
  item: ShoppingItem
  categories: ShoppingCategory[]
  index: number
  onDecide: (item: ShoppingItem) => void
  onDelete: () => void
}

function WishCard({ item, categories, index, onDecide, onDelete }: WishCardProps) {
  const cat = catOf(categories, item.categoryId)

  return (
    <div className="reveal wish-card" style={{ animationDelay: `${index * 40}ms`, position: 'relative' }}>
      <CardImage itemId={item.id} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: cat.color,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 11, fontFamily: 'var(--font-sans)', color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cat.name}
          </span>
        </div>
        <PriorityDots priority={item.priority} />
      </div>

      {/* Title */}
      <div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.25 }}>
          {item.name}
        </div>
        {item.brand && (
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontStyle: 'italic', color: 'var(--ink-3)', marginTop: 3 }}>
            {item.brand}
          </div>
        )}
      </div>

      {/* Notes */}
      {item.notes && (
        <div
          style={{
            borderLeft: '2px solid var(--paper-3)',
            paddingLeft: 10,
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--ink-3)',
            lineHeight: 1.5,
          }}
        >
          {item.notes}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', gap: 8 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--terra)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
            {fmt(item.price)}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
            {fmtDate(item.createdAt)}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => onDelete()}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--ink-4)',
              display: 'flex',
              alignItems: 'center',
              padding: 4,
              borderRadius: 6,
              transition: 'color var(--dur) var(--ease)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-4)')}
            title="Supprimer"
          >
            <X size={14} />
          </button>

          <button
            type="button"
            className="decide-btn"
            onClick={() => onDecide(item)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: 'var(--terra)',
              color: 'var(--paper-1)',
              border: 'none',
              borderRadius: 'var(--r-full)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Décider
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── RevealWord ───────────────────────────────────────────────────────────────

function RevealWord({ word, color }: { word: string; color: string }) {
  return (
    <div className="verdict-word" style={{ display: 'flex', gap: 0 }}>
      {word.split('').map((ch, i) => (
        <span
          key={i}
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 48,
            fontWeight: 500,
            color,
            lineHeight: 1,
            animationDelay: `${i * 40}ms`,
          }}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </div>
  )
}

// ─── EpargneGauge ─────────────────────────────────────────────────────────────

function EpargneGauge({ pct, color }: { pct: number; color: string }) {
  const circleRef = useRef<SVGCircleElement>(null)
  const r = 28
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, pct / 0.4))

  useEffect(() => {
    if (!circleRef.current) return
    const offset = circumference * (1 - clamped)
    circleRef.current.style.strokeDashoffset = String(circumference)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (circleRef.current) {
          circleRef.current.style.transition = 'stroke-dashoffset 800ms var(--ease)'
          circleRef.current.style.strokeDashoffset = String(offset)
        }
      })
    })
  }, [clamped, circumference])

  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx={36} cy={36} r={r} fill="none" stroke="var(--paper-2)" strokeWidth={4} />
      <circle
        ref={circleRef}
        cx={36}
        cy={36}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
      <text x={36} y={40} textAnchor="middle" fill={color} fontSize={12} fontFamily="var(--font-mono)">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  )
}

// ─── MetricRow ────────────────────────────────────────────────────────────────

function MetricRow({
  label,
  before,
  after,
}: {
  label: string
  before: number
  after: number
}) {
  const isPositive = after >= 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-3)', textDecoration: 'line-through' }}>{fmt(before)}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: isPositive ? 'var(--sage-deep)' : 'var(--danger)', fontWeight: 500 }}>{fmt(after)}</span>
        </div>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--paper-2)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            borderRadius: 2,
            background: isPositive ? 'var(--sage)' : 'var(--danger)',
            width: before !== 0 ? `${Math.max(0, Math.min(100, (after / Math.abs(before)) * 100))}%` : '0%',
            transition: 'width 600ms var(--ease)',
          }}
        />
      </div>
    </div>
  )
}

// ─── VerdictPanel ─────────────────────────────────────────────────────────────

interface VerdictPanelProps {
  item: ShoppingItem
  finance: Finance
  categories: ShoppingCategory[]
  buyItem: (id: string, pricePaid: number, boughtDate: string, verdict: ShoppingVerdict) => void
  onClose: () => void
}

function VerdictPanel({ item, finance, categories, buyItem, onClose }: VerdictPanelProps) {
  const [confirming, setConfirming] = useState(false)
  const [selectedVerdict, setSelectedVerdict] = useState<ShoppingVerdict>('Satisfait')

  const verdict = useMemo(() => computeVerdict(item.price, finance), [item.price, finance])
  const tone = VERDICT_TONE[verdict.kind]
  const cat = catOf(categories, item.categoryId)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleConfirm = () => {
    buyItem(item.id, item.price, today(), selectedVerdict)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      {/* Scrim */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(58,46,34,0.35)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
      <div
        className="verdict-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(560px, 92vw)',
          background: 'var(--paper-1)',
          borderLeft: '1px solid var(--paper-2)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px 0' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Analyse d'achat
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Item info */}
        <div style={{ padding: '20px 32px 0' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500, color: 'var(--ink)' }}>
            {item.name}
          </div>
          {item.brand && (
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontStyle: 'italic', color: 'var(--ink-3)', marginTop: 2 }}>
              {item.brand}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            {item.categoryId && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 10px',
                borderRadius: 'var(--r-full)',
                background: cat.color + '22',
                fontSize: 11,
                color: cat.color,
                fontFamily: 'var(--font-sans)',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                {cat.name}
              </span>
            )}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--terra)', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(item.price)}
            </span>
          </div>
        </div>

        {/* Verdict word */}
        <div style={{ padding: '32px 32px 0', background: tone.bg, margin: '24px 0 0' }}>
          <div style={{ paddingBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tone.color, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, opacity: 0.8 }}>
              Verdict
            </div>
            <RevealWord word={verdict.headline} color={tone.color} />
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, marginTop: 12 }}>
              {verdict.body}
            </p>
          </div>
        </div>

        {/* Metrics */}
        <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
          <MetricRow label="Solde" before={finance.solde} after={verdict.metrics.soldeAfter} />
          <MetricRow label="Marge mensuelle" before={finance.marge} after={verdict.metrics.margeAfter} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 4 }}>
            <EpargneGauge pct={Math.max(0, verdict.metrics.epargnePct)} color={tone.color} />
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Épargne restante</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: verdict.metrics.epargne >= 0 ? 'var(--sage-deep)' : 'var(--danger)', marginTop: 4 }}>
                {fmt(verdict.metrics.epargne)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: '20px 32px 32px', borderTop: '1px solid var(--paper-2)' }}>
          {confirming ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)' }}>
                Quel est votre verdict ?
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {VERDICTS.map((v) => {
                  const vColor = v === 'Satisfait' ? 'var(--sage-deep)' : v === 'Mitigé' ? 'var(--terra-deep)' : 'var(--danger)'
                  const vBg = v === 'Satisfait' ? 'var(--sage-soft)' : v === 'Mitigé' ? 'var(--terra-soft)' : '#F0DCCC'
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSelectedVerdict(v)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        border: `1px solid ${selectedVerdict === v ? vColor : 'var(--paper-2)'}`,
                        borderRadius: 8,
                        background: selectedVerdict === v ? vBg : 'transparent',
                        color: selectedVerdict === v ? vColor : 'var(--ink-3)',
                        fontFamily: 'var(--font-sans)',
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all var(--dur) var(--ease)',
                      }}
                    >
                      {v}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    border: '1px solid var(--paper-2)',
                    borderRadius: 8,
                    background: 'transparent',
                    color: 'var(--ink-3)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  style={{
                    flex: 2,
                    padding: '10px 0',
                    border: 'none',
                    borderRadius: 8,
                    background: 'var(--terra)',
                    color: 'var(--paper-1)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Confirmer l'achat
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                style={{
                  padding: '12px 0',
                  border: 'none',
                  borderRadius: 8,
                  background: 'var(--terra)',
                  color: 'var(--paper-1)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Confirmer l'achat
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '12px 0',
                  border: '1px solid var(--paper-2)',
                  borderRadius: 8,
                  background: 'transparent',
                  color: 'var(--ink-3)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Mettre de côté
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── AddItemPanel ─────────────────────────────────────────────────────────────

interface AddItemPanelProps {
  categories: ShoppingCategory[]
  onAdd: (item: Omit<ShoppingItem, 'id' | 'createdAt'>) => void
  onAddCategory: (name: string, color: string) => ShoppingCategory
  onClose: () => void
}

function AddItemPanel({ categories, onAdd, onAddCategory, onClose }: AddItemPanelProps) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [price, setPrice] = useState('')
  const [priority, setPriority] = useState<ShoppingPriority>('Envie')
  const [categoryId, setCategoryId] = useState('')
  const [notes, setNotes] = useState('')
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(CAT_SWATCHES[0])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleCreateCat = () => {
    if (!newCatName.trim()) return
    const cat = onAddCategory(newCatName.trim(), newCatColor)
    setCategoryId(cat.id)
    setNewCatName('')
    setShowNewCat(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !price) return
    onAdd({
      name: name.trim(),
      brand: brand.trim() || undefined,
      price: parseFloat(price),
      priority,
      categoryId: categoryId || undefined,
      notes: notes.trim() || undefined,
    })
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid var(--paper-2)',
    borderRadius: 8,
    padding: '9px 12px',
    fontFamily: 'var(--font-sans)',
    fontSize: 14,
    color: 'var(--ink)',
    background: 'var(--paper)',
    outline: 'none',
    transition: 'border-color var(--dur) var(--ease)',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: 'var(--font-sans)',
    fontSize: 12,
    color: 'var(--ink-3)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 6,
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(58,46,34,0.35)', backdropFilter: 'blur(2px)' }} />
      <form
        className="verdict-panel"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(480px, 92vw)',
          background: 'var(--paper-1)',
          borderLeft: '1px solid var(--paper-2)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '24px 32px 40px',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: 'var(--ink)' }}>
            Nouvel article
          </span>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Nom */}
        <div>
          <label style={labelStyle}>Nom *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Air Jordan 1"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = 'var(--terra)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--paper-2)')}
          />
        </div>

        {/* Marque */}
        <div>
          <label style={labelStyle}>Marque</label>
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Ex : Nike"
            style={{ ...inputStyle, fontStyle: brand ? 'italic' : 'normal' }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--terra)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--paper-2)')}
          />
        </div>

        {/* Prix */}
        <div>
          <label style={labelStyle}>Prix (€) *</label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--terra)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--paper-2)')}
          />
        </div>

        {/* Priorité */}
        <div>
          <label style={labelStyle}>Priorité</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  border: `1px solid ${priority === p ? 'var(--terra)' : 'var(--paper-2)'}`,
                  borderRadius: 8,
                  background: priority === p ? 'var(--terra-soft)' : 'transparent',
                  color: priority === p ? 'var(--terra-deep)' : 'var(--ink-3)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all var(--dur) var(--ease)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Catégorie */}
        <div>
          <label style={labelStyle}>Catégorie</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{ ...inputStyle, flex: 1, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">Aucune</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewCat((v) => !v)}
              style={{
                padding: '8px 14px',
                border: '1px solid var(--paper-2)',
                borderRadius: 8,
                background: 'transparent',
                color: 'var(--ink-3)',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              + Créer
            </button>
          </div>
          {showNewCat && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--paper)', borderRadius: 8, border: '1px solid var(--paper-2)' }}>
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nom de la catégorie"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'var(--terra)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--paper-2)')}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CAT_SWATCHES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCatColor(color)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: color,
                      border: 'none',
                      cursor: 'pointer',
                      outline: newCatColor === color ? `2px solid var(--terra)` : '2px solid transparent',
                      outlineOffset: 2,
                      transform: newCatColor === color ? 'scale(1.15)' : 'scale(1)',
                      transition: 'transform var(--dur) var(--ease)',
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleCreateCat}
                style={{
                  alignSelf: 'flex-end',
                  padding: '6px 16px',
                  background: 'var(--terra)',
                  color: 'var(--paper-1)',
                  border: 'none',
                  borderRadius: 'var(--r-full)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                OK
              </button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label style={labelStyle}>Note personnelle</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Pourquoi tu veux ça…"
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--terra)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--paper-2)')}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          style={{
            padding: '12px 0',
            border: 'none',
            borderRadius: 8,
            background: 'var(--terra)',
            color: 'var(--paper-1)',
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
            marginTop: 'auto',
          }}
        >
          Ajouter
        </button>
      </form>
    </div>
  )
}

// ─── CategoryDistribution ─────────────────────────────────────────────────────

function CategoryDistribution({ bought, categories }: { bought: BoughtItem[]; categories: ShoppingCategory[] }) {
  const data = useMemo(() => {
    if (!bought.length) return []
    const map: Record<string, { name: string; color: string; total: number }> = {}
    for (const item of bought) {
      const key = item.categoryId ?? '__none__'
      if (!map[key]) {
        const cat = catOf(categories, item.categoryId)
        map[key] = { name: cat.name, color: cat.color, total: 0 }
      }
      map[key].total += item.pricePaid
    }
    const total = Object.values(map).reduce((a, v) => a + v.total, 0)
    return Object.entries(map)
      .map(([, v]) => ({ ...v, pct: total > 0 ? v.total / total : 0 }))
      .sort((a, b) => b.total - a.total)
  }, [bought, categories])

  if (!data.length) {
    return (
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-3)', fontStyle: 'italic' }}>
        Aucun achat enregistré.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stratified bar */}
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
        {data.map((d) => (
          <div key={d.name} style={{ width: `${d.pct * 100}%`, background: d.color }} />
        ))}
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((d) => (
          <div key={d.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)' }}>{d.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                  {Math.round(d.pct * 100)}%
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>
                  {fmt(d.total)}
                </span>
              </div>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'var(--paper-2)' }}>
              <div style={{ height: '100%', borderRadius: 2, background: d.color, width: `${d.pct * 100}%`, transition: 'width 600ms var(--ease)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MonthlyEvolution ─────────────────────────────────────────────────────────

function MonthlyEvolution({ bought }: { bought: BoughtItem[] }) {
  const { months, totals, max, mean, currentMonth } = useMemo(() => {
    const now = new Date()
    const months: string[] = []
    const totals: number[] = []

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push(key)
      const total = bought
        .filter((b) => b.boughtDate.startsWith(key))
        .reduce((a, b) => a + b.pricePaid, 0)
      totals.push(total)
    }

    const nonZero = totals.filter((t) => t > 0)
    const max = Math.max(...totals, 1)
    const mean = nonZero.length > 0 ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    return { months, totals, max, mean, currentMonth }
  }, [bought])

  const hasData = totals.some((t) => t > 0)

  if (!hasData) {
    return (
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-3)', fontStyle: 'italic' }}>
        Aucun achat enregistré.
      </p>
    )
  }

  const CHART_H = 100
  const BAR_W = 28
  const GAP = 8
  const CHART_W = months.length * (BAR_W + GAP) - GAP

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        width={CHART_W + 40}
        height={CHART_H + 40}
        style={{ display: 'block' }}
      >
        {/* Mean line */}
        {mean > 0 && (
          <line
            x1={20}
            x2={CHART_W + 20}
            y1={CHART_H - (mean / max) * CHART_H}
            y2={CHART_H - (mean / max) * CHART_H}
            stroke="var(--ink-4)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        )}

        {/* Bars */}
        {months.map((m, i) => {
          const h = totals[i] > 0 ? Math.max(3, (totals[i] / max) * CHART_H) : 0
          const x = 20 + i * (BAR_W + GAP)
          const y = CHART_H - h
          const isCurrent = m === currentMonth
          const label = FRENCH_MONTHS[parseInt(m.split('-')[1]) - 1]

          return (
            <g key={m}>
              {h > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={BAR_W}
                  height={h}
                  rx={3}
                  fill={isCurrent ? 'var(--terra)' : 'var(--paper-3)'}
                />
              )}
              <text
                x={x + BAR_W / 2}
                y={CHART_H + 18}
                textAnchor="middle"
                fontSize={10}
                fontFamily="var(--font-mono)"
                fill={isCurrent ? 'var(--terra)' : 'var(--ink-4)'}
              >
                {label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── HistoryList ──────────────────────────────────────────────────────────────

function HistoryList({ bought, categories, onDelete }: {
  bought: BoughtItem[]
  categories: ShoppingCategory[]
  onDelete: (id: string) => void
}) {
  if (!bought.length) {
    return (
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-3)', fontStyle: 'italic' }}>
        Aucun achat enregistré.
      </p>
    )
  }

  const verdictStyle: Record<ShoppingVerdict, React.CSSProperties> = {
    Satisfait: { color: 'var(--sage-deep)' },
    Mitigé:    { color: 'var(--terra-deep)' },
    Déçu:      { color: 'var(--danger)' },
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '96px 1fr 130px 110px 110px',
        gap: 16,
        padding: '0 4px 10px',
        borderBottom: '2px solid var(--paper-2)',
      }}>
        {['Date', 'Article', 'Catégorie', 'Prix payé', 'Verdict'].map((h) => (
          <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {[...bought].sort((a, b) => b.boughtDate.localeCompare(a.boughtDate)).map((item) => {
        const cat = catOf(categories, item.categoryId)
        return (
          <div key={item.id} className="hist-row" style={{ position: 'relative' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
              {fmtDate(item.boughtDate)}
            </span>
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </div>
              {item.brand && (
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                  {item.brand}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cat.name}
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--terra)', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(item.pricePaid)}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, ...verdictStyle[item.verdict] }}>
                {item.verdict}
              </span>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-4)', display: 'flex', padding: 2, borderRadius: 4 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-4)')}
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  kicker,
  value,
  sub,
  mono,
  delay,
}: {
  kicker: string
  value: string
  sub: string
  mono?: boolean
  delay: number
}) {
  return (
    <div
      className="reveal"
      style={{
        animationDelay: `${delay}ms`,
        background: 'var(--paper-1)',
        border: '1px solid var(--paper-2)',
        borderRadius: 'var(--r-lg)',
        padding: '20px 24px',
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
        {kicker}
      </div>
      <div style={{
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-serif)',
        fontSize: 28,
        fontWeight: 500,
        color: 'var(--ink)',
        letterSpacing: mono ? '-0.02em' : '-0.01em',
        lineHeight: 1.1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
        {sub}
      </div>
    </div>
  )
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-serif)',
      fontSize: 22,
      fontWeight: 500,
      color: 'var(--ink)',
      borderBottom: '1px solid var(--paper-2)',
      paddingBottom: 16,
      marginBottom: 24,
    }}>
      {children}
    </div>
  )
}

// ─── ShoppingPage ─────────────────────────────────────────────────────────────

export function ShoppingPage() {
  const {
    wishlist,
    bought,
    categories,
    addWishlistItem,
    removeWishlistItem,
    buyItem,
    removeBoughtItem,
    addCategory,
  } = useShoppingStore()

  const transactions = useStore((s) => s.transactions)

  // ── Finance data ──────────────────────────────────────────────────────────
  const finance = useMemo<Finance>(() => {
    const now = new Date()
    const currentYYYYMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const solde = computeMonthBalance(transactions, currentYYYYMM)
    const monthTx = transactions.filter((t) => t.date.startsWith(currentYYYYMM))
    const revenuMensuel = monthTx.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0)
    const depensesMensuelles = monthTx.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0)
    const marge = revenuMensuel - depensesMensuelles
    return { solde, marge, revenuMensuel }
  }, [transactions])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const wishlistTotal = useMemo(() => wishlist.reduce((a, i) => a + i.price, 0), [wishlist])

  const boughtThisMonth = useMemo(() => {
    const now = new Date()
    const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return bought.filter((b) => b.boughtDate.startsWith(m))
  }, [bought])

  const boughtThisMonthTotal = useMemo(
    () => boughtThisMonth.reduce((a, b) => a + b.pricePaid, 0),
    [boughtThisMonth],
  )

  // ── Panel state ───────────────────────────────────────────────────────────
  const [decidingItem, setDecidingItem] = useState<ShoppingItem | null>(null)
  const [showAddPanel, setShowAddPanel] = useState(false)

  const handleDecide = useCallback((item: ShoppingItem) => {
    setShowAddPanel(false)
    setDecidingItem(item)
  }, [])

  const handleCloseVerdict = useCallback(() => setDecidingItem(null), [])
  const handleCloseAdd = useCallback(() => setShowAddPanel(false), [])

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '40px 48px 80px',
        display: 'flex',
        flexDirection: 'column',
        gap: 80,
      }}
    >
      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section>
        <div className="reveal" style={{ animationDelay: '0ms' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 16 }}>
            Budget · Wishlist · Historique
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px, 6vw, 68px)', fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
            Achats<span style={{ color: 'var(--terra)' }}>.</span>
          </h1>
        </div>

        {/* Stat banner */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            marginTop: 40,
          }}
        >
          <StatCard
            kicker="Solde net"
            value={fmt(finance.solde)}
            sub="Ce mois"
            mono
            delay={80}
          />
          <StatCard
            kicker="Marge mensuelle"
            value={fmt(finance.marge)}
            sub="Revenus − dépenses"
            mono
            delay={130}
          />
          <StatCard
            kicker="Wishlist"
            value={fmt(wishlistTotal)}
            sub={`${wishlist.length} article${wishlist.length > 1 ? 's' : ''}`}
            mono
            delay={180}
          />
          <StatCard
            kicker="Achats ce mois"
            value={fmt(boughtThisMonthTotal)}
            sub={`${boughtThisMonth.length} achat${boughtThisMonth.length > 1 ? 's' : ''}`}
            mono
            delay={230}
          />
        </div>
      </section>

      {/* ── Wishlist ──────────────────────────────────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <SectionTitle>Wishlist</SectionTitle>
          <button
            type="button"
            onClick={() => { setDecidingItem(null); setShowAddPanel(true) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 18px',
              background: 'var(--terra)',
              color: 'var(--paper-1)',
              border: 'none',
              borderRadius: 'var(--r-full)',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Plus size={15} />
            Ajouter
          </button>
        </div>

        {wishlist.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 16 }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontStyle: 'italic', color: 'var(--ink-3)', margin: 0 }}>
              Aucune envie pour l'instant.
            </p>
            <button
              type="button"
              onClick={() => setShowAddPanel(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: 'var(--terra-soft)',
                color: 'var(--terra-deep)',
                border: 'none',
                borderRadius: 'var(--r-full)',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <Plus size={13} />
              Ajouter
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {wishlist.map((item, i) => (
              <WishCard
                key={item.id}
                item={item}
                categories={categories}
                index={i}
                onDecide={handleDecide}
                onDelete={() => removeWishlistItem(item.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Analytics ─────────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Analyse</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 20 }}>
              Répartition par catégorie
            </div>
            <CategoryDistribution bought={bought} categories={categories} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 20 }}>
              Évolution mensuelle (12 mois)
            </div>
            <MonthlyEvolution bought={bought} />
          </div>
        </div>
      </section>

      {/* ── Historique ────────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Historique</SectionTitle>
        <HistoryList bought={bought} categories={categories} onDelete={removeBoughtItem} />
      </section>

      {/* ── Panels ────────────────────────────────────────────────────────────── */}
      {decidingItem && (
        <VerdictPanel
          item={decidingItem}
          finance={finance}
          categories={categories}
          buyItem={buyItem}
          onClose={handleCloseVerdict}
        />
      )}

      {showAddPanel && (
        <AddItemPanel
          categories={categories}
          onAdd={addWishlistItem}
          onAddCategory={addCategory}
          onClose={handleCloseAdd}
        />
      )}
    </div>
  )
}
