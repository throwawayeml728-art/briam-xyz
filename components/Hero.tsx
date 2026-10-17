'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'

// Pixelation grid of public/hero/pixelated.jpg (2048x1535 source).
const COLS = 54
const ROWS = 40
const IMG_W = 2048
const IMG_H = 1535
const FOCAL_Y = 0.6 // matches .hero-img object-position: center 60%

const FPS = 10 // deliberate stepped frame rate (icme-style "technology" feel)
const STEP_MS = 1000 / FPS
const RADIUS_CELLS = 5.2 // reveal radius around the pointer, in grid cells
const FLIP_P = 0.55 // chance a pending cell advances on a given step -> scattered cell-by-cell
const LEVELS = [0, 0.5, 1] // cell opacity steps (flicker in, flicker out)

/**
 * Hero image only. The pixelated image is the default; the original photo is
 * revealed in a blocky region around the pointer. A canvas draws the original
 * photo through grid cells that line up exactly with the pixelation blocks.
 * Cells switch on/off in random order at ~10 fps, stepping through partial
 * opacity, and revert to pixelated after the pointer leaves.
 */
export default function Hero() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = root.current!
    const cv = canvas.current!
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const level = new Uint8Array(COLS * ROWS) // index into LEVELS
    const want = new Uint8Array(COLS * ROWS) // 0 or 2
    let px = -1, py = -1 // pointer, css px; -1 = none
    let active = false
    let W = 0, H = 0, dpr = 1
    let raf = 0, last = 0
    let reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMq = () => { reduced = mq.matches; kick() }

    const photo = new window.Image()
    let loaded = false
    photo.onload = () => { loaded = true; draw() }
    photo.src = '/hero/original.jpg'

    // image-space -> screen mapping (object-fit: cover, position center 60%)
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
      draw()
    }

    const computeWant = () => {
      want.fill(0)
      if (!active) return
      const { s, dx, dy } = geom()
      const cw = (IMG_W / COLS) * s, ch = (IMG_H / ROWS) * s
      const ccx = (px - dx) / cw, ccy = (py - dy) / ch // pointer in cell units
      // cells are ~square; use cell-unit distance with aspect correction
      const ar = ch / cw
      for (let j = 0; j < ROWS; j++) {
        for (let i = 0; i < COLS; i++) {
          const ddx = i + 0.5 - ccx
          const ddy = (j + 0.5 - ccy) * ar
          if (ddx * ddx + ddy * ddy <= RADIUS_CELLS * RADIUS_CELLS) want[j * COLS + i] = 2
        }
      }
    }

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      if (!loaded) return
      const { s, dx, dy } = geom()
      const cw = (IMG_W / COLS) * s, ch = (IMG_H / ROWS) * s
      for (let lv = 1; lv < LEVELS.length; lv++) {
        ctx.save()
        ctx.beginPath()
        let any = false
        for (let j = 0; j < ROWS; j++) {
          for (let i = 0; i < COLS; i++) {
            if (level[j * COLS + i] !== lv) continue
            any = true
            const x0 = Math.floor(dx + i * cw), y0 = Math.floor(dy + j * ch)
            const x1 = Math.ceil(dx + (i + 1) * cw), y1 = Math.ceil(dy + (j + 1) * ch)
            ctx.rect(x0, y0, x1 - x0, y1 - y0)
          }
        }
        if (any) {
          ctx.clip()
          ctx.globalAlpha = LEVELS[lv]
          ctx.drawImage(photo, dx, dy, IMG_W * s, IMG_H * s)
        }
        ctx.restore()
      }
    }

    const step = (now: number) => {
      raf = 0
      if (now - last >= STEP_MS - 4) {
        last = now
        computeWant()
        let pending = false
        for (let k = 0; k < level.length; k++) {
          if (level[k] === want[k]) continue
          if (reduced) level[k] = want[k]
          else if (Math.random() < FLIP_P) level[k] += level[k] < want[k] ? 1 : -1
          if (level[k] !== want[k]) pending = true
        }
        draw()
        if (!pending && !active) return // fully reverted: stop loop
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
      kick()
    }
    const leave = () => { active = false; kick() }

    el.addEventListener('pointerenter', set)
    el.addEventListener('pointermove', set)
    el.addEventListener('pointerdown', set)
    el.addEventListener('pointerleave', leave)
    el.addEventListener('pointercancel', leave)
    el.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') leave() })
    mq.addEventListener('change', onMq)
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mq.removeEventListener('change', onMq)
      el.removeEventListener('pointerenter', set)
      el.removeEventListener('pointermove', set)
      el.removeEventListener('pointerdown', set)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('pointercancel', leave)
    }
  }, [])

  return (
    <main id="main" ref={root} className="hero">
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
    </main>
  )
}
