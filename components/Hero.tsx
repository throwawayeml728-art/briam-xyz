'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'

// Pixelation grid of public/hero/pixelated.jpg (2048x1535 source).
const COLS = 54
const ROWS = 40
const IMG_W = 2048
const IMG_H = 1535
const FOCAL_Y = 0.6 // matches .hero-img object-position: center 60%

const RENDER_MS = 33 // canvas redraw throttle (~30fps) so each fold looks smooth
const TICK_MS = 72 // one flap = one "tick" (~14fps split-flap rate)
const TICKS = 4 // flaps per cell: pixelated -> 3 intermediate shades -> original
const RADIUS_CELLS = 5.2 // reveal radius around the pointer, in grid cells
const WAVE_MS_PER_CELL = 16 // stagger radiating from the cursor
const ROW_MS = 2.2 // slight row-wise sweep on top of the radial wave
const COL_MS = 1.4 // ...and left-to-right
const TAP_HOLD_MS = 900 // touch: how long a tap/long-press reveal lingers

type Cell = {
  at: 0 | 1 // settled state: 0 pixelated, 1 original
  dir: 0 | 1 // target of running flip
  start: number // ms timestamp the flip begins (may be in the future); 0 = idle
}

/**
 * Hero image. Pixelated image is the default; the original photo is revealed in
 * a blocky region around the pointer. A single canvas draws each grid cell as a
 * split-flap tile: the top half folds down, the bottom half folds into place,
 * stepping through several intermediate shades with a dark seam across the
 * middle. Reverting uses the same flip in reverse.
 */
export default function Hero() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const reducedMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({ target: root, offset: ['start start', 'end start'] })
  const opacity = useTransform(scrollYProgress, [0, 0.9], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [1, reducedMotion ? 1 : 1.06])
  const blur = useTransform(scrollYProgress, [0, 1], ['blur(0px)', reducedMotion ? 'blur(0px)' : 'blur(8px)'])

  useEffect(() => {
    const el = root.current!
    const cv = canvas.current!
    const ctx2d = cv.getContext('2d')
    if (!ctx2d) return
    const ctx: CanvasRenderingContext2D = ctx2d

    const cells: Cell[] = Array.from({ length: COLS * ROWS }, () => ({ at: 0, dir: 0, start: 0 }))
    const want = new Uint8Array(COLS * ROWS)
    const seqCache: string[][] = new Array(COLS * ROWS)
    let avgP: Uint8ClampedArray | null = null
    let avgO: Uint8ClampedArray | null = null
    let px = -1, py = -1
    let active = false
    let W = 0, H = 0, dpr = 1
    let raf = 0, lastRender = 0
    let holdTimer = 0
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reduced = mq.matches
    const onMq = () => { reduced = mq.matches; kick() }

    const photo = new window.Image()
    const pixel = new window.Image()
    let ready = 0
    const onImg = () => {
      if (++ready < 2) return
      avgP = averages(pixel)
      avgO = averages(photo)
      draw(performance.now())
    }
    photo.onload = onImg
    pixel.onload = onImg
    photo.src = '/hero/original.jpg'
    pixel.src = '/hero/pixelated.jpg'

    function averages(img: HTMLImageElement) {
      const o = document.createElement('canvas')
      o.width = COLS; o.height = ROWS
      const c = o.getContext('2d')!
      c.imageSmoothingQuality = 'high'
      c.drawImage(img, 0, 0, COLS, ROWS)
      return c.getImageData(0, 0, COLS, ROWS).data
    }

    // Per-cell sequence of fills: [pixelated tex, shade, shade, shade, original tex].
    // Index 0 / TICKS are textures (null); the rest are rgb strings.
    const sequence = (k: number, dir: 0 | 1) => {
      const key = k * 2 + dir
      const cached = seqCache[key]
      if (cached) return cached
      const seq: string[] = []
      for (let t = 0; t <= TICKS; t++) {
        if (t === 0 || t === TICKS) { seq.push(''); continue }
        const m = t / TICKS
        // deterministic jitter in brightness so ticks feel mechanical, not a smooth ramp
        const jit = (((k * 131 + t * 17 + dir * 53) % 11) - 5) * 3.2
        const o = k * 4
        const r = avgP![o] + (avgO![o] - avgP![o]) * m + jit
        const g = avgP![o + 1] + (avgO![o + 1] - avgP![o + 1]) * m + jit
        const b = avgP![o + 2] + (avgO![o + 2] - avgP![o + 2]) * m + jit
        seq.push(`rgb(${r | 0},${g | 0},${b | 0})`)
      }
      if (dir === 0) seq.reverse()
      seqCache[key] = seq
      return seq
    }

    const geom = () => {
      const s = Math.max(W / IMG_W, H / IMG_H)
      const dw = IMG_W * s, dh = IMG_H * s
      return { s, dx: (W - dw) / 2, dy: (H - dh) * FOCAL_Y }
    }

    const resize = () => {
      const r = el.getBoundingClientRect()
      W = r.width; H = r.height
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      draw(performance.now())
    }

    const syncWant = (now: number) => {
      const { s, dx, dy } = geom()
      const cw = (IMG_W / COLS) * s, ch = (IMG_H / ROWS) * s
      const ccx = (px - dx) / cw, ccy = (py - dy) / ch
      const ar = ch / cw
      const r2 = RADIUS_CELLS * RADIUS_CELLS
      for (let j = 0; j < ROWS; j++) {
        for (let i = 0; i < COLS; i++) {
          const k = j * COLS + i
          const ddx = i + 0.5 - ccx, ddy = (j + 0.5 - ccy) * ar
          const d2 = ddx * ddx + ddy * ddy
          const w = active && d2 <= r2 ? 1 : 0
          want[k] = w
          const c = cells[k]
          if (c.start === 0) {
            if (c.at !== w) {
              c.dir = w as 0 | 1
              if (reduced) c.at = c.dir
              else {
                const dist = Math.sqrt(d2)
                c.start = now + dist * WAVE_MS_PER_CELL + j * ROW_MS + i * COL_MS
              }
            }
          } else if (c.start > now && c.dir !== w) {
            // still waiting to flip the other way: cancel
            c.start = 0
          }
        }
      }
    }

    // draw one half (top/bottom) of a state, vertically scaled about the hinge `ym`
    const half = (
      top: boolean, fill: string, x: number, y: number, w: number, h: number,
      sy: number, tex: HTMLImageElement | null, ox: number, oy: number, ow: number, oh: number, shade: number,
    ) => {
      if (sy <= 0.001) return
      const ym = y + h / 2
      ctx.save()
      ctx.beginPath()
      if (top) ctx.rect(x, y, w, ym - y); else ctx.rect(x, ym, w, y + h - ym)
      ctx.clip()
      ctx.translate(0, ym); ctx.scale(1, sy); ctx.translate(0, -ym)
      if (tex) ctx.drawImage(tex, ox, oy, ow, oh)
      else { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h) }
      ctx.restore()
      if (shade > 0) {
        ctx.fillStyle = `rgba(0,0,0,${shade})`
        const hh = (h / 2) * sy
        if (top) ctx.fillRect(x, ym - hh, w, hh); else ctx.fillRect(x, ym, w, hh)
      }
    }

    function draw(now: number) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      if (ready < 2 || !avgP || !avgO) return
      const { s, dx, dy } = geom()
      const cw = (IMG_W / COLS) * s, ch = (IMG_H / ROWS) * s
      const ow = IMG_W * s, oh = IMG_H * s
      const rect = (i: number, j: number) => {
        const x0 = Math.floor(dx + i * cw), y0 = Math.floor(dy + j * ch)
        return [x0, y0, Math.ceil(dx + (i + 1) * cw) - x0, Math.ceil(dy + (j + 1) * ch) - y0] as const
      }

      // 1) settled original cells: one clip path, one drawImage
      ctx.save()
      ctx.beginPath()
      let any = false
      for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
        const c = cells[j * COLS + i]
        if (c.at === 1 && (c.start === 0 || now < c.start)) { const [x, y, w, h] = rect(i, j); ctx.rect(x, y, w, h); any = true }
      }
      if (any) { ctx.clip(); ctx.drawImage(photo, dx, dy, ow, oh) }
      ctx.restore()

      // 2) flipping cells (flat per-cell fills between textures)
      for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
        const k = j * COLS + i
        const c = cells[k]
        if (c.start === 0 || now < c.start) continue
        const el = now - c.start
        const f = Math.min(TICKS - 1e-6, el / TICK_MS)
        const t = Math.floor(f)
        const u = f - t
        const seq = sequence(k, c.dir)
        const [x, y, w, h] = rect(i, j)
        const texOf = (idx: number) => (idx === 0 ? (c.dir === 1 ? pixel : photo) : idx === TICKS ? (c.dir === 1 ? photo : pixel) : null)
        // seq index 0 = old state, TICKS = new state, textures at both ends
        const A = seq[t], B = seq[t + 1]
        const ta = t === 0 ? texOf(0) : null
        const tb = t + 1 === TICKS ? texOf(TICKS) : null
        const ym = y + h / 2
        // static halves behind the flap
        half(true, B, x, y, w, h, 1, tb, dx, dy, ow, oh, 0)
        half(false, A, x, y, w, h, 1, ta, dx, dy, ow, oh, 0)
        if (u < 0.5) {
          const sy = 1 - u * 2 // old top half folds down toward the hinge
          half(true, A, x, y, w, h, sy, ta, dx, dy, ow, oh, 0.28 * u * 2)
        } else {
          const sy = (u - 0.5) * 2 // new bottom half drops into place
          half(false, B, x, y, w, h, sy, tb, dx, dy, ow, oh, 0.28 * (1 - sy))
        }
        // seam
        ctx.fillStyle = 'rgba(8,4,2,0.55)'
        ctx.fillRect(x, Math.round(ym) - 0.5, w, 1)
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fillRect(x, Math.round(ym) + 0.5, w, 1)
      }
    }

    const step = (now: number) => {
      raf = 0
      if (now - lastRender >= RENDER_MS - 4) {
        lastRender = now
        syncWant(now)
        let busy = false
        for (let k = 0; k < cells.length; k++) {
          const c = cells[k]
          if (c.start === 0) continue
          busy = true
          if (now - c.start >= TICKS * TICK_MS) { c.at = c.dir; c.start = 0 }
        }
        draw(now)
        if (!busy && !active) {
          // might still need settle check on cells with want != at
          let pending = false
          for (let k = 0; k < cells.length; k++) if (cells[k].at !== want[k] || cells[k].start) { pending = true; break }
          if (!pending) return
        }
      }
      raf = requestAnimationFrame(step)
    }

    function kick() {
      if (!raf) raf = requestAnimationFrame(step)
    }

    const set = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      px = e.clientX - r.left
      py = e.clientY - r.top
      active = true
      window.clearTimeout(holdTimer)
      kick()
    }
    const leave = () => { active = false; kick() }
    // Touch: vertical drags scroll the page (touch-action: pan-y -> pointercancel), so
    // reveal is tap / long-press / horizontal drag only; it lingers briefly after release.
    const onDown = (e: PointerEvent) => set(e)
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        window.clearTimeout(holdTimer)
        holdTimer = window.setTimeout(leave, TAP_HOLD_MS)
      }
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' && e.buttons === 0 && !active) return
      set(e)
    }

    el.addEventListener('pointerenter', onMove)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerleave', leave)
    el.addEventListener('pointercancel', leave)
    el.addEventListener('pointerup', onUp)
    mq.addEventListener('change', onMq)
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(holdTimer)
      ro.disconnect()
      mq.removeEventListener('change', onMq)
      el.removeEventListener('pointerenter', onMove)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('pointercancel', leave)
      el.removeEventListener('pointerup', onUp)
    }
  }, [])

  return (
    <section ref={root} className="hero" aria-label="Hero">
      <motion.div className="hero-stage" style={{ opacity, scale, filter: blur }}>
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
