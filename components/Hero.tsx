'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef } from 'react'
import { siteConfig } from '@/data/content'

// Which stylised image covers the photo. Switch here: 'pixelated' | 'painted'
const HERO_STYLE: 'pixelated' | 'painted' = 'pixelated'
const HERO_IMAGES = {
  pixelated: { src: '/hero/pixelated.jpg', alt: 'Pixel-art rendering of Monument Valley at sunset' },
  painted: { src: '/hero/painted.jpg', alt: 'Oil painting of Monument Valley at sunset' },
} as const

const REVEAL_MS = 3800 // painting -> photo
const REPAINT_MS = 3200 // photo -> painting

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * Full-viewport hero. The oil painting is shown by default; the original photo
 * sits on top, masked by a soft radial gradient that follows the cursor and
 * slowly grows while hovering until it covers everything (and shrinks back on
 * leave). The painted layer also softly desaturates/unblurs via the mask growth.
 * Touch: tap toggles the reveal from the tap point.
 */
export default function Hero() {
  const root = useRef<HTMLElement>(null)
  const photo = useRef<HTMLDivElement>(null)
  const state = useRef({
    p: 0, // eased progress 0..1 (raw linear below)
    raw: 0,
    target: 0,
    x: 0.5, y: 0.5, // smoothed pointer (0..1)
    tx: 0.5, ty: 0.5,
    last: 0,
    raf: 0,
    reduced: false,
  })

  const render = useCallback(() => {
    const el = root.current
    const ph = photo.current
    if (!el || !ph) return
    const s = state.current
    const { width, height } = el.getBoundingClientRect()
    const maxR = Math.hypot(width, height) * 1.25
    const e = easeInOut(s.raw)
    const r = e * maxR
    const soft = Math.max(r * 0.55, 1)
    const px = s.x * width
    const py = s.y * height
    const mask = `radial-gradient(circle at ${px}px ${py}px, #000 ${Math.max(r - soft, 0)}px, transparent ${r}px)`
    ph.style.webkitMaskImage = mask
    ph.style.maskImage = mask
    ph.style.opacity = e <= 0.001 ? '0' : '1'
  }, [])

  const tick = useCallback((now: number) => {
    const s = state.current
    const dt = Math.min(now - (s.last || now), 64)
    s.last = now
    const dir = s.target > s.raw ? 1 : -1
    const dur = dir > 0 ? REVEAL_MS : REPAINT_MS
    if (s.reduced) s.raw = s.target
    else s.raw = Math.min(1, Math.max(0, s.raw + (dir * dt) / dur))
    if ((dir > 0 && s.raw >= s.target) || (dir < 0 && s.raw <= s.target)) s.raw = s.target
    // pointer follows with lag
    const k = s.reduced ? 1 : 1 - Math.exp(-dt / 220)
    s.x += (s.tx - s.x) * k
    s.y += (s.ty - s.y) * k
    render()
    const moving = s.raw !== s.target || Math.abs(s.tx - s.x) > 0.0005 || Math.abs(s.ty - s.y) > 0.0005
    s.raf = moving || s.raw > 0 && s.raw < 1 ? requestAnimationFrame(tick) : 0
    if (!s.raf) s.last = 0
  }, [render])

  const kick = useCallback(() => {
    const s = state.current
    if (!s.raf) s.raf = requestAnimationFrame(tick)
  }, [tick])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const upd = () => { state.current.reduced = mq.matches }
    upd()
    mq.addEventListener('change', upd)
    render()
    const s = state.current
    return () => {
      mq.removeEventListener('change', upd)
      cancelAnimationFrame(s.raf)
    }
  }, [render])

  const setPoint = (e: React.PointerEvent, snap: boolean) => {
    const rect = root.current!.getBoundingClientRect()
    const s = state.current
    s.tx = (e.clientX - rect.left) / rect.width
    s.ty = (e.clientY - rect.top) / rect.height
    if (snap) { s.x = s.tx; s.y = s.ty }
  }

  const onEnter = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    // start the reveal bloom from the cursor when fully painted
    setPoint(e, state.current.raw < 0.02)
    state.current.target = 1
    kick()
  }
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    setPoint(e, false)
    kick()
  }
  const onLeave = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    state.current.target = 0
    kick()
  }
  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return
    const s = state.current
    setPoint(e, s.raw < 0.02)
    s.target = s.target === 1 ? 0 : 1 // tap toggles
    kick()
  }

  return (
    <main
      ref={root}
      className="hero"
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerDown={onDown}
    >
      <Image
        src={HERO_IMAGES[HERO_STYLE].src}
        alt={HERO_IMAGES[HERO_STYLE].alt}
        fill
        priority
        sizes="100vw"
        quality={80}
        className="hero-img"
      />
      <div ref={photo} className="hero-photo" aria-hidden="true">
        <Image
          src="/hero/original.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          quality={80}
          className="hero-img"
        />
      </div>
      <div className="hero-shade" aria-hidden="true" />

      <div className="hero-content">
        <h1 className="hero-name">{siteConfig.name}</h1>
        <p className="hero-tagline">{siteConfig.tagline}</p>
      </div>
    </main>
  )
}
