'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

// Pixelation grid of public/hero/pixelated.jpg (2048x1535 source).
// (make-hero.py --block 28: round(2048/28) x round(1535/28))
const COLS = 73
const ROWS = 55
const IMG_W = 2048
const IMG_H = 1535
const FOCAL_Y = 0.6 // matches .hero-img object-position: center 60%

const MAX_DPR = 2 // backing-store cap
const FLAPS = 3 // flaps per cell: pixelated -> shade -> shade -> original
const RESOLVE_START = 0.2 // runway progress where the scroll-driven resolve begins
const RESOLVE_END = 1 // ...and where every cell is the real photo
const FLIP_SPAN = 0.32 // fraction of the resolve window a single cell's flip occupies
const WAVE_ROWS = 0.78 // share of the stagger that is top-to-bottom (rest is per-cell random)
const PROGRESS_HALF_LIFE = 0.09 // s: eased follow of the scroll target
const MAX_DT = 0.05 // s: clamp so a stalled frame never teleports animations

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const damp = (a: number, b: number, halfLife: number, dt: number) => b + (a - b) * Math.pow(0.5, dt / halfLife)

/**
 * Hero image. The pixelated image is shown at the top of the page; scrolling through
 * the runway flips grid cells to the original photo (reversible). A single canvas
 * draws each grid cell as a split-flap tile: the top half folds down, the bottom
 * half folds into place, stepping through intermediate shades with a dark seam across
 * the middle. Fold angles are eased, and the loop is driven by delta time so motion is
 * identical at 60/120/144 Hz. No pointer interaction.
 * Both images are pre-composited once per resize onto offscreen
 * canvases at device resolution, so each frame only blits integer-aligned sub-rects (settled cells are merged into
 * per-row runs, so the draw-call count stays small despite the dense grid).
 * Nothing in the loop touches React state or layout.
 */
export default function Hero() {
  const root = useRef<HTMLElement>(null)
  const stick = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const progressRef = useRef(0) // raw runway progress 0..1 (set from scroll, eased inside the loop)
  const kickRef = useRef<() => void>(() => {})

  // progress across the sticky runway: 0 = hero pinned at top, 1 = runway fully scrolled
  const { scrollYProgress } = useScroll({ target: root, offset: ['start start', 'end end'] })
  const cueOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0])

  useEffect(() => {
    progressRef.current = scrollYProgress.get()
    return scrollYProgress.on('change', (v) => { progressRef.current = v; kickRef.current() })
  }, [scrollYProgress])

  useEffect(() => {
    const el = stick.current!
    const cv = canvas.current!
    const ctx2d = cv.getContext('2d', { alpha: true })
    if (!ctx2d) return
    const ctx: CanvasRenderingContext2D = ctx2d

    const N = COLS * ROWS
    // precomputed per-cell device-pixel rects (rebuilt on resize only)
    const rx = new Int32Array(N), ry = new Int32Array(N), rw = new Int32Array(N), rh = new Int32Array(N)
    const shades: (string | undefined)[] = new Array(N * (FLAPS - 1))
    let avgP: Uint8ClampedArray | null = null
    let avgO: Uint8ClampedArray | null = null
    let photoCv: HTMLCanvasElement | null = null // offscreen, cover-fitted at device res
    let pixelCv: HTMLCanvasElement | null = null

    let W = 0, H = 0, dpr = 1
    let gdx = 0, gdy = 0, gcw = 1, gch = 1 // grid geometry in device px
    let raf = 0, lastT = 0
    let visible = true, tabVisible = !document.hidden
    let ready = 0
    let P = progressRef.current // eased progress
    const sf = new Float32Array(N) // per-cell scroll flip progress 0..1
    const thr = new Float32Array(N) // per-cell stagger threshold 0..1 (top-to-bottom wave + stable random)
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
      const k = j * COLS + i
      const rnd = (((k * 2246822519) >>> 0) % 10007) / 10007
      thr[k] = (j / (ROWS - 1)) * WAVE_ROWS + rnd * (1 - WAVE_ROWS)
    }
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
    const shade = (k: number, idx: number) => {
      const key = k * (FLAPS - 1) + (idx - 1)
      const hit = shades[key]
      if (hit) return hit
      const m = idx / FLAPS
      // deterministic brightness jitter so flaps read as mechanical, not a smooth ramp
      const jit = (((k * 131 + idx * 17 + 53) % 11) - 5) * 3.2
      const o = k * 4
      const from = avgP!, to = avgO!
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
    const half = (top: boolean, k: number, idx: number, sy: number, dark: number) => {
      if (sy <= 0.004) return
      const x = rx[k], y = ry[k], w = rw[k], h = rh[k]
      const hT = h >> 1
      const sh = top ? hT : h - hT // source half height
      const dh = Math.max(1, Math.round(sh * sy))
      const dyy = top ? y + hT - dh : y + hT
      const sy0 = top ? y : y + hT
      if (idx === 0 || idx === FLAPS) {
        // textures: idx 0 = pixelated, idx FLAPS = photo
        ctx.drawImage(idx === 0 ? pixelCv! : photoCv!, x, sy0, w, sh, x, dyy, w, dh)
      } else {
        ctx.fillStyle = shade(k, idx)
        ctx.fillRect(x, dyy, w, dh)
      }
      if (dark > 0.01) {
        ctx.fillStyle = `rgba(0,0,0,${dark.toFixed(2)})`
        ctx.fillRect(x, dyy, w, dh)
      }
    }

    // split-flap cell k at flap position f (0..FLAPS), pixelated -> photo
  function flip(k: number, f: number) {
    const idx = Math.floor(f)
      const e = easeInOutCubic(f - idx) // eased fold angle: theta = PI * e
      const cos = Math.cos(Math.PI * e)
      // static halves behind the flap: new top, old bottom
      half(true, k, idx + 1, 1, 0)
      half(false, k, idx, 1, 0)
      if (e < 0.5) half(true, k, idx, cos, 0.3 * Math.sin(Math.PI * e)) // old top falls
      else half(false, k, idx + 1, -cos, 0.3 * Math.sin(Math.PI * e)) // new bottom drops in
      const ym = ry[k] + (rh[k] >> 1)
      ctx.fillStyle = 'rgba(8,4,2,0.55)'
      ctx.fillRect(rx[k], ym - 1, rw[k], Math.max(1, Math.round(dpr * 0.5)))
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.fillRect(rx[k], ym, rw[k], Math.max(1, Math.round(dpr * 0.5)))
  }

    function draw() {
      ctx.clearRect(0, 0, cv.width, cv.height)
      if (!photoCv || !pixelCv || !avgP || !avgO) return
      if (reduced) {
        // reduced motion: no flipping, just a crossfade from pixelated to photo driven by scroll
        ctx.drawImage(pixelCv, 0, 0)
        if (P > 0.001) { ctx.globalAlpha = Math.min(1, P); ctx.drawImage(photoCv, 0, 0); ctx.globalAlpha = 1 }
      }
      if (!reduced) {
        // 1) settled cells: merge horizontal runs into one 1:1 blit each
        for (let j = 0; j < ROWS; j++) {
          let i = 0
          while (i < COLS) {
            if (sf[j * COLS + i] < 1) { i++; continue }
            const a = j * COLS + i
            while (i < COLS && sf[j * COLS + i] >= 1) i++
            const b = j * COLS + i - 1
            const x = rx[a], y = ry[a], w = rx[b] + rw[b] - x, h = rh[a] > rh[b] ? rh[a] : rh[b]
            ctx.drawImage(photoCv, x, y, w, h, x, y, w, h)
          }
        }
        // 2) in-flight cells, deterministic from scroll progress
        for (let k = 0; k < N; k++) {
          const f = sf[k]
          if (f > 0 && f < 1) flip(k, Math.min(FLAPS - 1e-6, f * FLAPS))
        }
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

      // scroll progress: eased follow of the target, then per-cell flip progress
      const pT = progressRef.current
      P = reduced ? pT : damp(P, pT, PROGRESS_HALF_LIFE, dt)
      if (Math.abs(P - pT) < 0.0004) P = pT
      const rp = Math.min(1, Math.max(0, (P - RESOLVE_START) / (RESOLVE_END - RESOLVE_START)))
      for (let k = 0; k < N; k++) {
        const t0 = thr[k] * (1 - FLIP_SPAN)
        sf[k] = Math.min(1, Math.max(0, (rp - t0) / FLIP_SPAN))
      }
      draw()
      if (P !== pT) raf = requestAnimationFrame(step)
      else lastT = 0
    }

    function kick() {
      if (!raf && running() && ready >= 2) raf = requestAnimationFrame(step)
    }

    const onVis = () => { tabVisible = !document.hidden; if (tabVisible) kick(); else { cancelAnimationFrame(raf); raf = 0; lastT = 0 } }
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting
      if (visible) kick(); else { cancelAnimationFrame(raf); raf = 0; lastT = 0 }
    }, { rootMargin: '50px' })
    io.observe(el)

    document.addEventListener('visibilitychange', onVis)
    mq.addEventListener('change', onMq)
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    kickRef.current = () => { if (reduced) P = progressRef.current; kick() }
    resize()

    return () => {
      kickRef.current = () => {}
      cancelAnimationFrame(raf)
      window.removeEventListener('load', startLoad)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      mq.removeEventListener('change', onMq)
    }
  }, [])

  return (
    <section ref={root} className="hero" aria-label="Hero">
      <div ref={stick} className="hero-sticky">
        <div className="hero-stage">
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
        </div>
        <motion.div className="hero-cue-wrap" aria-hidden="true" style={{ opacity: cueOpacity }}>
          <div className="hero-cue">
            <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
              <path d="M2 2l9 8 9-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
