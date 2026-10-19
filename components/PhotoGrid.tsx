'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import type { Photo } from '@/data/content'
import { usePhotoGridSettings, usePhotoZoom } from '@/components/PhotoZoomProvider'
import { orderPhotos } from '@/lib/photo-sort'

type RowItem = { photo: Photo; index: number; ratio: number }
type Row = { items: RowItem[]; sum: number }

// width / height of a photo (data stores ratio as "w/h")
function photoRatio(ratio?: string): number {
  if (!ratio) return 3 / 4
  const [w, h] = ratio.split('/').map(Number)
  return w && h ? w / h : 3 / 4
}

function greedyRows(items: RowItem[], rowWidthRatio: number): Row[] {
  const rows: Row[] = []
  let cur: RowItem[] = []
  let sum = 0
  for (const it of items) {
    cur.push(it)
    sum += it.ratio
    if (sum >= rowWidthRatio) {
      rows.push({ items: cur, sum })
      cur = []
      sum = 0
    }
  }
  if (cur.length) rows.push({ items: cur, sum })
  return rows
}

// Justified rows: every row spans the full width with zero gutters. Tile widths are proportional to
// aspect ratio so row height is uniform. We try several target row heights and keep the one whose
// last row ends up closest to the target height, so the final row is not stretched or squashed.
function justifyPhotos(photos: Photo[], columns: number): Row[] {
  const items: RowItem[] = photos.map((photo, index) => ({ photo, index, ratio: photoRatio(photo.ratio) }))
  if (!items.length) return []
  const avg = items.reduce((a, b) => a + b.ratio, 0) / items.length
  const base = columns * avg // target sum of ratios per row (target height = width / base)
  let best: Row[] = greedyRows(items, base)
  let bestScore = Infinity
  for (let k = -12; k <= 12; k++) {
    const target = base * (1 + k * 0.025)
    if (target < 1) continue
    const rows = greedyRows(items, target)
    const last = rows[rows.length - 1]
    const full = rows.length > 1 ? rows.slice(0, -1).reduce((a, r) => a + r.sum, 0) / (rows.length - 1) : last.sum
    const score = Math.abs(last.sum - full) / full + Math.abs(target - base) / base * 0.25
    if (score < bestScore) { bestScore = score; best = rows }
  }
  return best
}

export default function PhotoGrid({ photos = [] }: { photos?: Photo[] }) {
  const grid = usePhotoGridSettings()
  const { zoom, setZoom, colorSort, setColorSort, shuffleSeed } = usePhotoZoom()
  const displayPhotos = useMemo(
    () => orderPhotos(photos, colorSort, shuffleSeed),
    [photos, colorSort, shuffleSeed],
  )
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const ignoreCloseRef = useRef(false)

  const active = activeIndex !== null ? displayPhotos[activeIndex] : null

  useEffect(() => setMounted(true), [])

  const openPhoto = useCallback((index: number) => {
    ignoreCloseRef.current = true
    setActiveIndex(index)
    window.setTimeout(() => {
      ignoreCloseRef.current = false
    }, 100)
  }, [])

  const close = useCallback(() => setActiveIndex(null), [])

  const goPrev = useCallback(() => {
    setActiveIndex(i => (i !== null && i > 0 ? i - 1 : i))
  }, [])

  const goNext = useCallback(() => {
    setActiveIndex(i => (i !== null && i < displayPhotos.length - 1 ? i + 1 : i))
  }, [displayPhotos.length])

  useEffect(() => {
    if (activeIndex === null) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeIndex, close, goPrev, goNext])

  // Swipe left/right in the lightbox (single finger only, and not while pinch-zoomed, so
  // native pinch-zoom and panning keep working).
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null)
  const activePointers = useRef(new Set<number>())
  const onLbDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return
    activePointers.current.add(e.pointerId)
    swipe.current = activePointers.current.size === 1 ? { x: e.clientX, y: e.clientY, id: e.pointerId } : null
  }
  const onLbUp = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return
    activePointers.current.delete(e.pointerId)
    const s = swipe.current
    swipe.current = null
    if (!s || s.id !== e.pointerId) return
    if ((window.visualViewport?.scale ?? 1) > 1.02) return
    const dx = e.clientX - s.x, dy = e.clientY - s.y
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      ignoreCloseRef.current = true
      window.setTimeout(() => { ignoreCloseRef.current = false }, 120)
      if (dx < 0) goNext(); else goPrev()
    }
  }
  const onLbCancel = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId)
    swipe.current = null
  }

  const handleBackdropClick = () => {
    if (ignoreCloseRef.current) return
    close()
  }

  const rows = useMemo(
    () => justifyPhotos(displayPhotos, grid.columns),
    [displayPhotos, grid.columns],
  )

  return (
    <>
      <section
        id="photos"
        className="photo-section"
        style={{
          maxWidth: grid.maxWidth,
        }}
      >
        <div className="photo-grid-controls">
          <div className="photo-zoom-control">
            <span className="photo-zoom-label" aria-hidden="true">−</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="photo-zoom-slider"
              aria-label="Photo grid size"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={zoom}
            />
            <span className="photo-zoom-label" aria-hidden="true">+</span>
          </div>
          <label className="photo-sort-toggle">
            <span className="photo-sort-toggle-label">Color sort</span>
            <input
              type="checkbox"
              checked={colorSort}
              onChange={e => setColorSort(e.target.checked)}
              className="photo-sort-toggle-input"
            />
            <span className="photo-sort-toggle-track" aria-hidden="true">
              <span className="photo-sort-toggle-thumb" />
            </span>
          </label>
        </div>
        <div className="photo-grid">
          {rows.map((row, r) => (
            <div key={r} className="photo-row" style={{ aspectRatio: row.sum }}>
              {row.items.map(({ photo, index, ratio }) => (
                <PhotoTile
                  key={photo.src}
                  photo={photo}
                  widthPct={(ratio / row.sum) * 100}
                  sizes={tileSizes(grid.columns)}
                  onOpen={() => openPhoto(index)}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      {mounted && active && activeIndex !== null && createPortal(
        <div
          className="photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={active.alt}
          onClick={handleBackdropClick}
          onPointerDown={onLbDown}
          onPointerUp={onLbUp}
          onPointerCancel={onLbCancel}
        >
          <button
            type="button"
            className="photo-lightbox-close"
            aria-label="Close"
            onClick={close}
          >
            ×
          </button>

          {activeIndex > 0 && (
            <button
              type="button"
              className="photo-lightbox-nav photo-lightbox-nav--prev"
              aria-label="Previous photo"
              onClick={e => { e.stopPropagation(); goPrev() }}
            >
              ←
            </button>
          )}

          {activeIndex < displayPhotos.length - 1 && (
            <button
              type="button"
              className="photo-lightbox-nav photo-lightbox-nav--next"
              aria-label="Next photo"
              onClick={e => { e.stopPropagation(); goNext() }}
            >
              →
            </button>
          )}

          <div
            className="photo-lightbox-content"
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={active.src}
              alt={active.alt}
              width={lightboxSize(active.ratio).w}
              height={lightboxSize(active.ratio).h}
              sizes="(max-width: 768px) 100vw, 95vw"
              quality={80}
              priority
              className="photo-lightbox-image"
            />
            {active.location && (
              <p className="photo-lightbox-caption">{active.location}</p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

function lightboxSize(ratio?: string) {
  const [a, b] = (ratio || '3/4').split('/').map(Number)
  const r = a && b ? a / b : 0.75
  return r >= 1 ? { w: 2000, h: Math.round(2000 / r) } : { w: Math.round(1600 * r), h: 1600 }
}

// Each tile is ~1/columns of the viewport wide; tell next/image so phones don't download desktop widths.
function tileSizes(columns: number) {
  return `(max-width: 768px) ${Math.round(100 / columns)}vw, ${Math.round(100 / Math.min(columns, 4))}vw`
}

function PhotoTile({ photo, onOpen, sizes, widthPct }: { photo: Photo; onOpen: () => void; sizes: string; widthPct: number }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open photo: ${photo.alt}`}
      className="photo-tile"
      style={{ width: `${widthPct}%` }}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      {photo.src ? (
        <div className="photo-tile-frame">
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes={sizes}
            quality={72}
            className="photo-tile-image"
            draggable={false}
          />
          {photo.location && (
            <span className="photo-tile-location">{photo.location}</span>
          )}
        </div>
      ) : (
        <div
          className="photo-tile-placeholder"
        >
          <span>{photo.alt} — coming soon</span>
        </div>
      )}
    </div>
  )
}
