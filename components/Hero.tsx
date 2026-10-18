'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'

// Pixelation grid of public/hero/pixelated.jpg (2048x1535 source).
const COLS = 54
const ROWS = 40
const IMG_W = 2048
const IMG_H = 1535
const FOCAL_Y = 0.6 // matches .hero-img object-position: center 60%

const MAX_DPR = 2 // backing-store cap
const FLAPS = 3 // flaps per cell: pixelated -> shade -> shade -> original
const FLAP_MS = 150 // one flap (fold + unfold); a full cell flip is FLAPS * FLAP_MS
const RADIUS_CELLS = 5.2 // reveal radius around the (smoothed) pointer, in grid cells
const EDGE_JITTER = 1.1 // cells: per-cell random soft edge on the radius
const HYSTERESIS = 1.0 // cells: extra distance before a revealed cell reverts (no edge flicker)
const WAVE_MS_PER_CELL = 16 // stagger radiating out from the cursor
const ROW_MS = 2.2 // slight row-wise sweep on top of the radial wave
const COL_MS = 1.4 // ...and left-to-right
const CURSOR_HALF_LIFE = 0.07 // s: cursor glide (frame-rate independent exponential smoothing)
const RADIUS_HALF_LIFE = 0.1 // s: reveal radius grows / shrinks smoothly
const TAP_HOLD_MS = 900 // touch: how long a tap/long-press reveal lingers
const LONG_PRESS_MS = 220 // touch: press-and-hold before the reveal starts
const DRAG_PX = 8 // touch: horizontal travel that starts a reveal drag
const MAX_DT = 0.05 // s: clamp so a stalled frame never teleports animations

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const damp = (a: number, b: number, halfLife: number, dt: number) => b + (a - b) * Math.pow(0.5, dt / halfLife)

type Cell = {
  at: 0 | 1 // settled state: 0 pixelated, 1 original
  dir: 0 | 1 // target of the running flip
  delay: number // ms until the flip starts (counts down while the loop runs)
  t: number // ms into the running flip, -1 = idle
}

/**
 * Hero image. Pixelated image is the default; the original photo is revealed in a
 * blocky region around the pointer. A single canvas draws each grid cell as a
 * split-flap tile: the top half folds down, the bottom half folds into place,
 * stepping through intermediate shades with a dark seam across the middle. Fold
 * angles are eased, and the loop is driven by delta time so motion is identical at
 * 60/120/144 Hz. Both images are pre-composited once per resize onto offscreen
 * canvases at device resolution, so each frame only blits integer-aligned sub-rects.
 * Nothing in the loop touches React state or layout.
 */
export default function Hero() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const reducedMotion = useReducedMotion()
  const [lite, setLite] = useState(true) // small / touch screens: no scroll blur (SSR-safe default)

  const { scrollYProgress } = useScroll({ target: root, offset: ['start start', 'end start'] })
  const opacity = useTransform(scrollYProgress, [0, 0.9], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [1, reducedMotion ? 1 : 1.06])
  const blur = useTransform(scrollYProgress, [0, 1], ['blur(0px)', reducedMotion || lite ? 'blur(0px)' : 'blur(6px)'])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px), (pointer: coarse)')
    const update = () => setLite(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const el = root.current!
    const cv = canvas.current!
    const ctx2d = cv.getContext('2d', { alpha: true })
    if (!ctx2d) return
    const ctx: CanvasRenderingContext2D = ctx2d

    const N = COLS * ROWS
    const cells: Cell[] = Array.from({ length: N }, () => ({ at: 0, dir: 0, delay: 0, t: -1 }))
    const noise = new Float32Array(N) // stable per-cell jitter in [-1, 1]
    for (let k = 0; k < N; k++) noise[k] = ((k * 2654435761) % 1000) / 500 - 1
    // precomputed per-cell device-pixel rects (rebuilt on resize only)
    const rx = new Int32Array(N), ry = new Int32Array(N), rw = new Int32Array(N), rh = new Int32Array(N)
    const shades: (string | undefined)[] = new Array(N * 2 * (FLAPS - 1))
    let avgP: Uint8ClampedArray | null = null
    let avgO: Uint8ClampedArray | null = null
    let photoCv: HTMLCanvasElement | null = null // offscreen, cover-fitted at device res
    let pixelCv: HTMLCanvasElement | null = null

    let tx = 0, ty = 0 // pointer target, CSS px relative to hero (set from events)
    let hasPointer = false
    let cx = 0, cy = 0 // smoothed cursor
    let radius = 0 // smoothed reveal radius (cells)
    let active = false
    let W = 0, H = 0, dpr = 1
    let gdx = 0, gdy = 0, gcw = 1, gch = 1 // grid geometry in device px
    let raf = 0, lastT = 0
    let visible = true, tabVisible = !document.hidden
    let holdTimer = 0, pressTimer = 0
    let lastClientX = 0, lastClientY = 0, pendingMove = false
    let ready = 0
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reduced = mq.matches
    const onMq = () => { reduced = mq.matches; kick() }

    const photo = new window.Image()
    const pixel = new window.Image()
    const onImg = () => {
      if (++ready < 2) return
      avgP = averages(pixel)
      avgO = averages(photo)
      build()
      kick()
    }
    const load = (img: HTMLImageElement, src: string) => {
      img.decoding = 'async'
      img.onload = onImg
      img.src = src
    }
    // pixelated.jpg is already preloaded by next/image (priority); original.jpg is fetched when
    // the browser is idle so it never competes with LCP, long before the first reveal.
    // smaller variants for phones / small viewports (the canvas never needs more than device res)
    const small = Math.max(window.innerWidth, window.innerHeight) * Math.min(window.devicePixelRatio || 1, 1.5) <= 1500
    const sfx = small ? '-1280' : ''
    load(pixel, `/hero/pixelated${sfx}.jpg`)
    const ric: (cb: () => void) => number =
      (window as any).requestIdleCallback ? (cb) => (window as any).requestIdleCallback(cb, { timeout: 1500 }) : (cb) => window.setTimeout(cb, 300)
    const startLoad = () => ric(() => load(photo, `/hero/original${sfx}.jpg`))
    if (document.readyState === 'complete') startLoad()
    else window.addEventListener('load', startLoad, { once: true })

    function averages(img: HTMLImageElement) {
      const o = document.createElement('canvas')
      o.width = COLS; o.height = ROWS
      const c = o.getContext('2d', { willReadFrequently: true })!
      c.imageSmoothingQuality = 'high'
      c.drawImage(img, 0, 0, COLS, ROWS)
      return c.getImageData(0, 0, COLS, ROWS).data
    }

    // flat shade between the two textures for flap state `idx` (1..FLAPS-1); cached, never per frame
    const shade = (k: number, dir: 0 | 1, idx: number) => {
      const key = (k * 2 + dir) * (FLAPS - 1) + (idx - 1)
      const hit = shades[key]
      if (hit) return hit
      const from = dir === 1 ? avgP! : avgO!
      const to = dir === 1 ? avgO! : avgP!
      const m = idx / FLAPS
      // deterministic brightness jitter so flaps read as mechanical, not a smooth ramp
      const jit = (((k * 131 + idx * 17 + dir * 53) % 11) - 5) * 3.2
      const o = k * 4
      const s = `rgb(${(from[o] + (to[o] - from[o]) * m + jit) | 0},${(from[o + 1] + (to[o + 1] - from[o + 1]) * m + jit) | 0},${(from[o + 2] + (to[o + 2] - from[o + 2]) * m + jit) | 0})`
      shades[key] = s
      return s
    }

    function build() {
      if (ready < 2 || W === 0 || H === 0) return
      const Wd = Math.round(W * dpr), Hd = Math.round(H * dpr)
      if (cv.width !== Wd) cv.width = Wd
      if (cv.height !== Hd) cv.height = Hd
      const s = Math.max(Wd / IMG_W, Hd / IMG_H)
      const dw = IMG_W * s, dh = IMG_H * s
      gdx = (Wd - dw) / 2; gdy = (Hd - dh) * FOCAL_Y
      gcw = (IMG_W / COLS) * s; gch = (IMG_H / ROWS) * s
      for (const [which, img] of [['photo', photo], ['pixel', pixel]] as const) {
        const o = document.createElement('canvas')
        o.width = Wd; o.height = Hd
        const c = o.getContext('2d', { alpha: false })!
        c.imageSmoothingQuality = 'high'
        c.drawImage(img, gdx, gdy, dw, dh)
        if (which === 'photo') photoCv = o; else pixelCv = o
      }
      for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
        const k = j * COLS + i
        const x0 = Math.floor(gdx + i * gcw), y0 = Math.floor(gdy + j * gch)
        rx[k] = x0; ry[k] = y0
        rw[k] = Math.ceil(gdx + (i + 1) * gcw) - x0
        rh[k] = Math.ceil(gdy + (j + 1) * gch) - y0
      }
    }

    // one half (top/bottom) of flap state `idx`, vertically scaled about the hinge
    const half = (top: boolean, k: number, dir: 0 | 1, idx: number, sy: number, dark: number) => {
      if (sy <= 0.004) return
      const x = rx[k], y = ry[k], w = rw[k], h = rh[k]
      const hT = h >> 1
      const sh = top ? hT : h - hT // source half height
      const dh = Math.max(1, Math.round(sh * sy))
      const dyy = top ? y + hT - dh : y + hT
      const sy0 = top ? y : y + hT
      if (idx === 0 || idx === FLAPS) {
        // textures: idx 0 = old state, idx FLAPS = new state
        const toPhoto = idx === 0 ? dir === 0 : dir === 1
        ctx.drawImage(toPhoto ? photoCv! : pixelCv!, x, sy0, w, sh, x, dyy, w, dh)
      } else {
        ctx.fillStyle = shade(k, dir, idx)
        ctx.fillRect(x, dyy, w, dh)
      }
      if (dark > 0.01) {
        ctx.fillStyle = `rgba(0,0,0,${dark.toFixed(2)})`
        ctx.fillRect(x, dyy, w, dh)
      }
    }

    function draw() {
      ctx.clearRect(0, 0, cv.width, cv.height)
      if (!photoCv || !pixelCv || !avgP || !avgO) return
      // 1) settled original cells: straight 1:1 blits
      for (let k = 0; k < N; k++) {
        const c = cells[k]
        if (c.at === 1 && c.t < 0) ctx.drawImage(photoCv, rx[k], ry[k], rw[k], rh[k], rx[k], ry[k], rw[k], rh[k])
      }
      // 2) flipping cells
      for (let k = 0; k < N; k++) {
        const c = cells[k]
        if (c.t < 0 || c.delay > 0) continue
        const f = Math.min(FLAPS - 1e-6, (c.t / (FLAPS * FLAP_MS)) * FLAPS)
        const idx = Math.floor(f)
        const e = easeInOutCubic(f - idx) // eased fold angle: theta = PI * e
        const cos = Math.cos(Math.PI * e)
        const dir = c.dir
        // static halves behind the flap: new top, old bottom
        half(true, k, dir, idx + 1, 1, 0)
        half(false, k, dir, idx, 1, 0)
        if (e < 0.5) half(true, k, dir, idx, cos, 0.3 * Math.sin(Math.PI * e)) // old top falls
        else half(false, k, dir, idx + 1, -cos, 0.3 * Math.sin(Math.PI * e)) // new bottom drops in
        const ym = ry[k] + (rh[k] >> 1)
        ctx.fillStyle = 'rgba(8,4,2,0.55)'
        ctx.fillRect(rx[k], ym - 1, rw[k], Math.max(1, Math.round(dpr * 0.5)))
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fillRect(rx[k], ym, rw[k], Math.max(1, Math.round(dpr * 0.5)))
      }
    }

    const resize = () => {
      const r = el.getBoundingClientRect()
      const nw = Math.round(r.width), nh = Math.round(r.height)
      const coarse = window.matchMedia('(pointer: coarse)').matches
      const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || ((navigator as any).deviceMemory || 8) <= 4
      const nd = Math.min(window.devicePixelRatio || 1, coarse ? (lowEnd ? 1 : 1.5) : MAX_DPR)
      if (nw === W && nh === H && nd === dpr) return
      W = nw; H = nh; dpr = nd
      build()
      if (running()) kick(); else draw()
    }

    const running = () => visible && tabVisible

    function step(t: number) {
      raf = 0
      if (!running()) { lastT = 0; return }
      const dt = lastT ? Math.min(MAX_DT, (t - lastT) / 1000) : 1 / 60
      lastT = t
      const dtMs = dt * 1000

      if (pendingMove) {
        const r = el.getBoundingClientRect() // single layout read per frame
        tx = lastClientX - r.left; ty = lastClientY - r.top
        pendingMove = false
        if (!hasPointer) { cx = tx; cy = ty; hasPointer = true }
      }
      if (reduced) { cx = tx; cy = ty }
      else { cx = damp(cx, tx, CURSOR_HALF_LIFE, dt); cy = damp(cy, ty, CURSOR_HALF_LIFE, dt) }
      const rTarget = active ? RADIUS_CELLS : 0
      radius = reduced ? rTarget : damp(radius, rTarget, RADIUS_HALF_LIFE, dt)
      if (Math.abs(radius - rTarget) < 0.01) radius = rTarget

      const ccx = (cx * dpr - gdx) / gcw, ccy = (cy * dpr - gdy) / gch
      const ar = gch / gcw
      let busy = false
      for (let j = 0; j < ROWS; j++) {
        for (let i = 0; i < COLS; i++) {
          const k = j * COLS + i
          const c = cells[k]
          const ddx = i + 0.5 - ccx, ddy = (j + 0.5 - ccy) * ar
          const d = Math.sqrt(ddx * ddx + ddy * ddy)
          // soft edge: per-cell jitter on the radius; hysteresis on the way out
          const edge = radius + noise[k] * EDGE_JITTER * (radius > 0 ? 1 : 0)
          const inside = radius > 0.05 && d <= edge
          const outside = d > edge + HYSTERESIS || radius <= 0.05
          if (c.t < 0) {
            const want = inside ? 1 : outside ? 0 : c.at
            if (c.at !== want) {
              c.dir = want as 0 | 1
              if (reduced) c.at = c.dir
              else { c.t = 0; c.delay = d * WAVE_MS_PER_CELL + j * ROW_MS + i * COL_MS }
            }
          } else if (c.delay > 0 && ((c.dir === 1 && outside) || (c.dir === 0 && inside))) {
            c.t = -1; c.delay = 0 // still waiting to flip the other way: cancel
          }
          if (c.t >= 0) {
            busy = true
            if (c.delay > 0) c.delay -= dtMs
            else {
              c.t += dtMs
              if (c.t >= FLAPS * FLAP_MS) { c.at = c.dir; c.t = -1; c.delay = 0 }
            }
          }
        }
      }
      draw()
      const settling = Math.abs(cx - tx) > 0.3 || Math.abs(cy - ty) > 0.3
      if (busy || settling || radius !== rTarget) raf = requestAnimationFrame(step)
      else lastT = 0
    }

    function kick() {
      if (!raf && running() && ready >= 2) raf = requestAnimationFrame(step)
    }

    const setTarget = (e: PointerEvent) => {
      lastClientX = e.clientX; lastClientY = e.clientY; pendingMove = true
      window.clearTimeout(holdTimer)
      active = true
      kick()
    }
    const leave = () => { active = false; kick() }
    const lingerThenLeave = () => {
      window.clearTimeout(holdTimer)
      holdTimer = window.setTimeout(leave, TAP_HOLD_MS)
    }

    // Touch: the hero uses touch-action: pan-y, so vertical drags scroll the page (the browser
    // then fires pointercancel). Reveal only on tap, long-press, or a horizontal-dominant drag.
    let sx = 0, sy = 0, dragging = false
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') { setTarget(e); return }
      sx = e.clientX; sy = e.clientY; dragging = false
      lastClientX = e.clientX; lastClientY = e.clientY
      window.clearTimeout(pressTimer)
      pressTimer = window.setTimeout(() => { dragging = true; pendingMove = true; active = true; window.clearTimeout(holdTimer); kick() }, LONG_PRESS_MS)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') { setTarget(e); return }
      lastClientX = e.clientX; lastClientY = e.clientY
      if (!dragging) {
        const ax = Math.abs(e.clientX - sx), ay = Math.abs(e.clientY - sy)
        if (ax > DRAG_PX && ax > ay) { dragging = true; window.clearTimeout(pressTimer); setTarget(e) }
        return
      }
      setTarget(e)
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      window.clearTimeout(pressTimer)
      if (!dragging) setTarget(e) // quick tap: reveal here
      dragging = false
      lingerThenLeave()
    }
    const onCancel = (e: PointerEvent) => {
      window.clearTimeout(pressTimer)
      dragging = false
      if (e.pointerType === 'touch') lingerThenLeave(); else leave()
    }
    const onLeave = (e: PointerEvent) => { if (e.pointerType !== 'touch') leave() }

    const onVis = () => { tabVisible = !document.hidden; if (tabVisible) kick(); else { cancelAnimationFrame(raf); raf = 0; lastT = 0 } }
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting
      if (visible) kick(); else { cancelAnimationFrame(raf); raf = 0; lastT = 0 }
    }, { rootMargin: '50px' })
    io.observe(el)

    el.addEventListener('pointerenter', onMove, { passive: true })
    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerdown', onDown, { passive: true })
    el.addEventListener('pointerleave', onLeave, { passive: true })
    el.addEventListener('pointercancel', onCancel, { passive: true })
    el.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('visibilitychange', onVis)
    mq.addEventListener('change', onMq)
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(holdTimer)
      window.clearTimeout(pressTimer)
      window.removeEventListener('load', startLoad)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      mq.removeEventListener('change', onMq)
      el.removeEventListener('pointerenter', onMove)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('pointercancel', onCancel)
      el.removeEventListener('pointerup', onUp)
    }
  }, [])

  return (
    <section ref={root} className="hero" aria-label="Hero">
      <motion.div className="hero-stage" style={lite ? { opacity, scale } : { opacity, scale, filter: blur }}>
        <Image
          src="/hero/pixelated.jpg"
          alt="Pixel-art rendering of Monument Valley at sunset"
          fill
          priority
          sizes="100vw"
          quality={80}
          className="hero-img"
        />
        <canvas ref={canvas} className="hero-canvas" aria-hidden="true" />
      </motion.div>
      <div className="hero-fade" aria-hidden="true" />
      <div className="hero-cue" aria-hidden="true">
        <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
          <path d="M2 2l9 8 9-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  )
}
