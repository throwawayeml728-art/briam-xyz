'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import type { Photo } from '@/data/content'
import { usePhotoGridSettings, usePhotoZoom } from '@/components/PhotoZoomProvider'
import { orderPhotos } from '@/lib/photo-sort'

type ColumnItem = { photo: Photo; index: number }

function estimateRelativeHeight(ratio?: string): number {
  if (!ratio) return 4 / 3
  const [w, h] = ratio.split('/').map(Number)
  if (!w || !h) return 4 / 3
  return h / w
}

function balancePhotosIntoColumns(
  photos: Photo[],
  columnCount: number,
  gap: number,
): ColumnItem[][] {
  const columns: ColumnItem[][] = Array.from({ length: columnCount }, () => [])
  const heights = new Array<number>(columnCount).fill(0)
  const gapHeight = gap / 180

  photos.forEach((photo, index) => {
    let target = 0
    for (let c = 1; c < columnCount; c++) {
      if (heights[c] < heights[target]) target = c
    }

    if (columns[target].length > 0) heights[target] += gapHeight
    columns[target].push({ photo, index })
    heights[target] += estimateRelativeHeight(photo.ratio)
  })

  return columns
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

  const handleBackdropClick = () => {
    if (ignoreCloseRef.current) return
    close()
  }

  const columns = useMemo(
    () => balancePhotosIntoColumns(displayPhotos, grid.columns, grid.gap),
    [displayPhotos, grid.columns, grid.gap],
  )

  return (
    <>
      <section
        id="photos"
        className="photo-section"
        style={{
          maxWidth: grid.maxWidth,
          padding: grid.padding,
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
        <div
          className="photo-grid"
          style={{ gap: grid.gap }}
        >
          {columns.map((columnPhotos, col) => (
            <div key={col} className="photo-column" style={{ gap: grid.gap }}>
              {columnPhotos.map(({ photo, index }) => (
                <PhotoTile
                  key={photo.src}
                  photo={photo}
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.src}
              alt={active.alt}
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

function PhotoTile({ photo, onOpen }: { photo: Photo; onOpen: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="photo-tile"
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      {photo.src ? (
        <div className="photo-tile-frame" style={{ aspectRatio: photo.ratio || '3/4' }}>
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
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
          style={{ aspectRatio: photo.ratio || '3/4' }}
        >
          <span>{photo.alt} — coming soon</span>
        </div>
      )}
    </div>
  )
}
