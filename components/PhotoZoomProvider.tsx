'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ZOOM_KEY = 'photo-grid-zoom'
const COLOR_SORT_KEY = 'photo-grid-color-sort'
const SHUFFLE_SEED_KEY = 'photo-grid-shuffle-seed'

export const DEFAULT_ZOOM = 0

export type PhotoGridSettings = {
  columns: number
  gap: number
  maxWidth: number
  padding: number
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function gridSettingsFromZoom(zoom: number, isMobile: boolean): PhotoGridSettings {
  const t = zoom / 100
  const columnSteps = [4, 3, 2, 1]
  let columns = columnSteps[Math.min(3, Math.floor(t * 4))]

  if (isMobile) {
    columns = zoom >= 65 ? 1 : Math.min(columns, 2)
  }

  return {
    columns,
    gap: Math.round(lerp(4, 24, t)),
    maxWidth: Math.round(lerp(2400, 680, t)),
    padding: Math.round(lerp(8, 32, t)),
  }
}

type PhotoZoomContextValue = {
  zoom: number
  setZoom: (zoom: number) => void
  colorSort: boolean
  setColorSort: (enabled: boolean) => void
  shuffleSeed: number
}

const PhotoZoomContext = createContext<PhotoZoomContextValue | null>(null)

export function PhotoZoomProvider({ children }: { children: React.ReactNode }) {
  const [zoom, setZoomState] = useState(DEFAULT_ZOOM)
  const [colorSort, setColorSortState] = useState(true)
  const [shuffleSeed, setShuffleSeedState] = useState(1)

  useEffect(() => {
    const storedZoom = localStorage.getItem(ZOOM_KEY)
    if (storedZoom !== null) {
      const parsed = Number(storedZoom)
      if (!Number.isNaN(parsed)) setZoomState(Math.min(100, Math.max(0, parsed)))
    }

    const storedSort = localStorage.getItem(COLOR_SORT_KEY)
    if (storedSort !== null) setColorSortState(storedSort === 'true')

    const storedSeed = localStorage.getItem(SHUFFLE_SEED_KEY)
    if (storedSeed !== null) {
      const parsed = Number(storedSeed)
      if (!Number.isNaN(parsed)) setShuffleSeedState(parsed)
    }
  }, [])

  const setZoom = (value: number) => {
    const next = Math.min(100, Math.max(0, value))
    setZoomState(next)
    localStorage.setItem(ZOOM_KEY, String(next))
  }

  const setColorSort = (enabled: boolean) => {
    setColorSortState(enabled)
    localStorage.setItem(COLOR_SORT_KEY, String(enabled))
    if (!enabled) {
      const seed = Date.now()
      setShuffleSeedState(seed)
      localStorage.setItem(SHUFFLE_SEED_KEY, String(seed))
    }
  }

  const value = useMemo(
    () => ({ zoom, setZoom, colorSort, setColorSort, shuffleSeed }),
    [zoom, colorSort, shuffleSeed],
  )

  return (
    <PhotoZoomContext.Provider value={value}>
      {children}
    </PhotoZoomContext.Provider>
  )
}

export function usePhotoZoom() {
  const ctx = useContext(PhotoZoomContext)
  if (!ctx) {
    throw new Error('usePhotoZoom must be used within PhotoZoomProvider')
  }
  return ctx
}

export function usePhotoGridSettings() {
  const { zoom } = usePhotoZoom()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return gridSettingsFromZoom(zoom, isMobile)
}
