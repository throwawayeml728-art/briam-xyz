'use client'

// Endless spine-out bookshelf. The active book is pulled out and turned to face you;
// a detail sheet grows out of its cover. One rAF loop + the Web Animations API, no opacity fades.
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface ShelfBook {
  title: string
  author: string
  status: 'reading' | 'favorite'
  note?: string
  link?: string
  cover: string | null
  ratio: number
  spine: string
}

const EASE = 'cubic-bezier(.2,.8,.2,1)'
const SHEET_EASE = 'cubic-bezier(.76,0,.18,1)'
const PERSP = 2200
const COPIES = 3
// ink blots from the 474×900 reference box: cx, cy, delay (ms)
const BLOTS: [number, number, number][] = [[150, 330, 0], [340, 600, 120], [250, 120, 220], [90, 760, 300], [400, 250, 360], [260, 860, 420], [230, 470, 180]]

const smooth = (x: number) => x * x * (3 - 2 * x)
// slow ink bleed: gentle start, long soft tail
const inkEase = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2) * 0.75 + p * 0.25
const INK_DUR = 1600, INK_R = 400, INK_STAGGER = 1.8
const mod = (a: number, n: number) => ((a % n) + n) % n
const shortTitle = (t: string) => t.split(':')[0].trim()
const surname = (a: string) => a.trim().split(/\s+/).pop() || a
const statusLabel = (b: ShelfBook) => (b.status === 'reading' ? 'Reading now' : 'Favorite')

function inkFor(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const c = v / 255; return c <= 0.04 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.32 ? '#2b1d14' : '#f7f0e2'
}

function B(r: number) {
  if (r <= -1) return -0.5
  if (r >= 1) return 0.5
  return (r + Math.sin(Math.PI * r) / Math.PI) / 2
}

export default function VhsShelf({ books }: { books: ShelfBook[] }) {
  const N = books.length
  const V = N * COPIES
  const rootRef = useRef<HTMLElement>(null)
  const probeRef = useRef<HTMLDivElement>(null)
  const shelfRef = useRef<HTMLDivElement>(null)
  const tapeRefs = useRef<(HTMLDivElement | null)[]>([])
  const coverRefs = useRef<(HTMLDivElement | null)[]>([])
  const capRefs = useRef<(HTMLSpanElement | null)[]>([])
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const indRef = useRef<HTMLSpanElement>(null)
  const playRef = useRef<HTMLButtonElement>(null)
  const curRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const blobRefs = useRef<(SVGCircleElement | null)[]>([])
  const [detail, setDetail] = useState<number | null>(null)
  const [tab, setTab] = useState<number>(-1)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const st = useRef({
    s: N, T: N, active: -1, W: 0, H: 0, cy: 0, mx: -1e4, my: -1e4, inside: false,
    tiltX: 0, tiltY: 0, hover: -1, lift: new Float32Array(V), last: 0,
    drag: null as null | { id: number; x0: number; T0: number; on: boolean },
    suppress: false, inkR: 0.66, wheelT: 0 as any, open: false, closing: false, inkStart: 0,
    m: 1, mT: 1, rest: false, cx: 0, cyCur: 0, cur: { x: -100, y: -100 }, reduced: false, fine: false,
  })

  const geo = () => { const H = st.current.H; const ws = (H * 142) / 840; return { H, ws, d: 0.66 * H, gap: 0.03 * H } }

  // ---------- caption ----------
  const swapCaption = useCallback((i: number, dir: number, instant: boolean) => {
    const b = books[Math.max(0, i)]
    const texts = i < 0
      ? ['On the Shelf', `${N} books`, 'Reading now & old favorites']
      : [b.title, b.author, `${statusLabel(b)} \u00b7 ${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`]
    capRefs.current.forEach((line, k) => {
      if (!line) return
      const span = document.createElement('span')
      span.className = 'vs-cap-in'
      span.textContent = texts[k]
      const olds = Array.from(line.children) as HTMLElement[]
      line.appendChild(span)
      if (instant || st.current.reduced) { olds.forEach((o) => o.remove()); return }
      const opts = { duration: 650, easing: EASE, fill: 'both' as const }
      span.animate([{ transform: `translateY(${dir * 105}%)` }, { transform: 'translateY(0)' }], opts)
      olds.forEach((o) => {
        if (o.classList.contains('vs-cap-old')) return // already leaving
        const from = getComputedStyle(o).transform
        o.classList.add('vs-cap-old')
        o.getAnimations().forEach((a) => a.cancel())
        o.animate([{ transform: from === 'none' ? 'translateY(0)' : from }, { transform: `translateY(${-dir * 105}%)` }], opts).finished.then(() => o.remove(), () => o.remove())
      })
    })
  }, [books, N])

  // ---------- tabs indicator ----------
  useLayoutEffect(() => {
    const ind = indRef.current
    const el = tab >= 0 ? tabRefs.current[tab] : null
    if (!ind) return
    if (!el) { ind.style.width = '0px'; return }
    ind.style.width = `${el.offsetWidth}px`
    ind.style.transform = `translateX(${el.offsetLeft}px)`
  }, [tab])

  // ---------- navigation ----------
  // leave the ALL rest state: the nearest book turns back out
  const wake = () => { const s = st.current; if (!s.rest) return false; s.rest = false; s.mT = 1; s.T = Math.round(s.T); s.active = -2; return true }
  const toRest = () => {
    const s = st.current; if (s.rest) return
    s.rest = true; s.mT = 0; s.T = Math.round(s.T)
    swapCaption(-1, 1, false); s.active = -3; setTab(0)
  }
  const go = useCallback((delta: number) => { const s = st.current; if (s.open) return; if (wake()) return; s.T = Math.round(s.T) + delta }, [])
  const goTo = useCallback((idx: number) => {
    const s = st.current; if (s.open) return; wake()
    const base = Math.round(s.T)
    let d = mod(idx - mod(base, N), N); if (d > N / 2) d -= N
    s.T = base + d
  }, [N])
  const jumpGroup = (g: 0 | 1 | 2) => {
    if (g === 0) { if (st.current.open) closeDetail(); toRest(); return }
    const idx = books.findIndex((b) => b.status === (g === 1 ? 'reading' : 'favorite'))
    if (idx >= 0) goTo(idx)
  }

  // the visible copy of the active book
  const activeV = () => {
    const s = st.current; let best = 0, bd = 1e9
    for (let v = 0; v < V; v++) { let r = mod(v - s.s, V); if (r >= V / 2) r -= V; if (Math.abs(r) < bd) { bd = Math.abs(r); best = v } }
    return best
  }
  // the unrotated cover rect on screen (center from the bbox, size from the perspective scale)
  const coverRect = () => {
    const el = coverRefs.current[activeV()]
    const { H, d } = geo()
    const bb = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 }
    const sc = PERSP / (PERSP - 0.2 * H)
    const cx = bb.left + bb.width / 2, cy = bb.top + bb.height / 2
    return { cx, cy, w: d * sc, h: H * sc }
  }

  const openDetail = useCallback(() => {
    const s = st.current
    if (s.open || s.active < 0 || s.rest) return
    s.open = true
    if (curRef.current) curRef.current.dataset.state = ''
    setDetail(s.active)
  }, [])

  const closeDetail = useCallback(() => {
    const s = st.current, sheet = sheetRef.current
    if (!s.open || s.closing || !sheet) return
    s.closing = true
    const { cx, cy, w, h } = coverRect()
    const W = innerWidth, Hh = innerHeight
    sheet.style.transformOrigin = `${cx}px ${cy}px`
    const rect = `inset(${cy - h / 2}px ${W - cx - w / 2}px ${Hh - cy - h / 2}px ${cx - w / 2}px round 3px)`
    sheet.getAnimations().forEach((a) => a.cancel())
    const a = sheet.animate([
      { clipPath: 'inset(0px 0px 0px 0px round 0px)', transform: 'rotate(0deg)' },
      { clipPath: rect, transform: 'rotate(-4.5deg)' },
    ], { duration: s.reduced ? 1 : 850, easing: SHEET_EASE, fill: 'both' })
    a.finished.then(() => {
      sheet.hidden = true
      sheet.getAnimations({ subtree: true }).forEach((x) => x.cancel())
      document.documentElement.classList.remove('vs-locked')
      s.open = false; s.closing = false
      setDetail(null)
      playRef.current?.focus({ preventScroll: true })
    }, () => {})
  }, [])

  // run the open animation once the sheet has rendered the active book
  useLayoutEffect(() => {
    if (detail === null) return
    const s = st.current, sheet = sheetRef.current
    if (!sheet) return
    s.inkR = books[detail].ratio
    const { cx, cy, w, h } = coverRect()
    const W = innerWidth, Hh = innerHeight
    sheet.hidden = false
    sheet.scrollTop = 0
    document.documentElement.classList.add('vs-locked')
    sheet.style.transformOrigin = `${cx}px ${cy}px`
    const dur = (ms: number) => (s.reduced ? 1 : ms)
    sheet.animate([
      { clipPath: `inset(${cy - h / 2}px ${W - cx - w / 2}px ${Hh - cy - h / 2}px ${cx - w / 2}px round 3px)`, transform: 'rotate(-4.5deg)' },
      { clipPath: 'inset(0px 0px 0px 0px round 0px)', transform: 'rotate(0deg)' },
    ], { duration: dur(1050), easing: SHEET_EASE, fill: 'both' })
    sheet.querySelectorAll<HTMLElement>('.dl-in').forEach((el, i) => {
      el.animate([{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], { duration: dur(900), delay: s.reduced ? 0 : 620 + i * 75, easing: EASE, fill: 'both' })
    })
    s.inkStart = performance.now() + (s.reduced ? -1e5 : 520)
    closeRef.current?.focus({ preventScroll: true })
  }, [detail])

  // ---------- main loop + listeners ----------
  useEffect(() => {
    const s = st.current
    const root = rootRef.current!, shelf = shelfRef.current!
    const mqR = matchMedia('(prefers-reduced-motion: reduce)')
    const mqF = matchMedia('(pointer: fine) and (min-width: 768px)')
    const syncMq = () => {
      s.reduced = mqR.matches; s.fine = mqF.matches
      document.documentElement.classList.toggle('vs-hidecur', s.fine)
    }
    syncMq(); mqR.addEventListener('change', syncMq); mqF.addEventListener('change', syncMq)

    // preload every cover
    books.forEach((b) => { if (b.cover) { const i = new Image(); i.decoding = 'async'; i.src = b.cover } })

    const measure = () => {
      s.H = probeRef.current?.offsetHeight || 400
      s.W = root.clientWidth
      const r = shelf.getBoundingClientRect(); s.cy = r.top + r.height / 2
    }
    measure()
    const ro = new ResizeObserver(measure); ro.observe(root)
    addEventListener('scroll', measure, { passive: true })

    // start on the first currently-reading book in the middle copy
    const first = Math.max(0, books.findIndex((b) => b.status === 'reading'))
    s.s = s.T = N + first

    let raf = 0
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, s.last ? (t - s.last) / 1000 : 0.016); s.last = t
      const { H, ws, d, gap } = geo(); const W = s.W

      // spring
      if (s.reduced && !s.drag?.on) s.s = s.T
      else s.s += (s.T - s.s) * (1 - Math.exp(-(s.drag?.on ? 18 : 5.2) * dt))
      if (Math.abs(s.T - s.s) < 1e-4) s.s = s.T
      // openness multiplier: 1 = active book turned out, 0 = plain shelf (ALL)
      if (s.reduced) s.m = s.mT
      else s.m += (s.mT - s.m) * (1 - Math.exp(-5.2 * dt))
      if (Math.abs(s.mT - s.m) < 1e-3) s.m = s.mT
      const m = s.m
      // keep s in the middle copy
      const loops = Math.floor(s.s / N) - 1
      if (loops) { s.s -= loops * N; s.T -= loops * N; if (s.drag) s.drag.T0 -= loops * N }

      const active = mod(Math.round(s.s), N)
      if (!s.rest && active !== s.active) {
        const dir = Math.sign(s.T - s.s) || 1
        swapCaption(active, dir, s.active === -1)
        s.active = active
        setTab(books[active].status === 'reading' ? 1 : 2)
      }

      // tilt toward the cursor
      const settled = Math.abs(s.T - s.s) < 0.3
      let ty = 0, tx = 0
      if (s.inside && !s.open && !s.rest) {
        const onCover = settled && Math.abs(s.mx - W / 2) < 0.55 * d && Math.abs(s.my - s.cy) < 0.55 * H
        if (onCover) { ty = ((s.mx - W / 2) / (0.55 * d)) * 9; tx = -((s.my - s.cy) / (H / 2)) * 6 }
        else ty = ((s.mx - W / 2) / W) * 5
      }
      const kt = s.reduced ? 1 : 1 - Math.exp(-7 * dt)
      s.tiltY += (ty - s.tiltY) * kt; s.tiltX += (tx - s.tiltX) * kt
      const kl = s.reduced ? 1 : 1 - Math.exp(-12 * dt)

      for (let v = 0; v < V; v++) {
        const el = tapeRefs.current[v]; if (!el) continue
        let r = mod(v - s.s, V); if (r >= V / 2) r -= V
        const x = r * (ws + gap) + (d - ws + 1.6 * gap) * B(r) * m
        if (Math.abs(x) > W / 2 + 1.5 * d) { if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden'; continue }
        if (el.style.visibility) el.style.visibility = ''
        const o = smooth(Math.max(0, 1 - Math.abs(r))) * m
        // only a turning book shows its cover face; at rest the side face would peek out under perspective
        const cv = coverRefs.current[v]
        if (cv) { const want = o > 0.004 ? '' : 'hidden'; if (cv.style.visibility !== want) cv.style.visibility = want }
        const lt = v === s.hover && Math.abs(r) > 0.5 && !s.drag?.on ? 1 : 0
        s.lift[v] += (lt - s.lift[v]) * kl
        const y = -o * 0.025 * H - s.lift[v] * 0.045 * H
        el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${(o * 0.2 * H).toFixed(2)}px) rotateZ(${(-4.5 * o).toFixed(3)}deg) rotateX(${(s.tiltX * o).toFixed(3)}deg) rotateY(${(-90 * o + s.tiltY * o).toFixed(3)}deg)`
        el.style.zIndex = String(Math.round(100 - Math.abs(r) * 4))
        el.style.setProperty('--ss', (o * 0.55).toFixed(3))
        el.style.setProperty('--cs', ((1 - o) * 0.5).toFixed(3))
      }

      // play ring
      const pr = playRef.current
      if (pr) {
        const sc = (s.reduced ? (settled ? 1 : 0) : smooth(Math.max(0, 1 - Math.abs(s.T - s.s) * 3))) * (s.rest ? 0 : m)
        pr.style.transform = `translate(-50%,-50%) scale(${sc.toFixed(3)})`
        pr.style.left = `${W / 2 - 0.5 * d - 6}px`
        pr.style.top = `${s.cy - root.getBoundingClientRect().top + 0.36 * H}px`
      }

      // cursor
      const cur = curRef.current
      if (cur && s.fine) {
        const k = 1 - Math.exp(-16 * dt)
        s.cur.x += (s.cx - s.cur.x) * k; s.cur.y += (s.cyCur - s.cur.y) * k
        cur.style.transform = `translate3d(${s.cur.x.toFixed(1)}px,${s.cur.y.toFixed(1)}px,0)`
      }

      // ink bleed
      if (s.open) {
        const w = 600, h = 600 / s.inkR
        blobRefs.current.forEach((c, i) => {
          if (!c) return
          const p = Math.min(1, Math.max(0, (t - s.inkStart - BLOTS[i][2] * INK_STAGGER) / INK_DUR))
          c.setAttribute('r', (inkEase(p) * INK_R * Math.max(w / 474, h / 900)).toFixed(1))
        })
      }
    }
    raf = requestAnimationFrame(frame)

    // the active cover, tested geometrically (3D hit-testing of the turned face is unreliable)
    const overCover = (x: number, y: number) => {
      const { H, d } = geo(); const rr = root.getBoundingClientRect()
      const sc = PERSP / (PERSP - 0.2 * H)
      return !s.open && !s.rest && s.m > 0.9 && Math.abs(s.T - s.s) < 0.3 && Math.abs(x - rr.left - s.W / 2) < 0.5 * d * sc && Math.abs(y - s.cy + 0.025 * H) < 0.5 * H * sc
    }
    // pointer: hover/lift, cursor state, tilt, drag
    const curState = (target: Element | null, x: number, y: number) => {
      const c = curRef.current; if (!c) return
      let state = ''
      const onShelf = !!target?.closest?.('.vs-shelf')
      const tape = target?.closest?.('.tape') as HTMLElement | null
      if (st.current.open) state = target?.closest?.('a,button') ? 'btn' : ''
      else if (onShelf && overCover(x, y)) state = 'open'
      else if (tape) {
        let r = mod(+tape.dataset.v! - s.s, V); if (r >= V / 2) r -= V
        state = Math.abs(r) < 0.5 && !s.rest ? 'open' : 'spine'
      } else if (target?.closest?.('a,button,[role=button]')) state = 'btn'
      c.dataset.state = state
    }
    const onMove = (e: PointerEvent) => {
      s.cx = e.clientX; s.cyCur = e.clientY
      const rr = root.getBoundingClientRect()
      s.inside = e.clientY >= rr.top && e.clientY <= rr.bottom
      s.mx = e.clientX - rr.left; s.my = e.clientY
      const tape = (e.target as Element)?.closest?.('.tape') as HTMLElement | null
      s.hover = tape ? +tape.dataset.v! : -1
      curState(e.target as Element, e.clientX, e.clientY)
      if (s.drag && e.pointerId === s.drag.id) {
        const dx = e.clientX - s.drag.x0
        if (!s.drag.on && Math.abs(dx) > 5) { s.drag.on = true; shelf.setPointerCapture(e.pointerId); shelf.classList.add('is-drag') }
        if (s.drag.on) { if (s.rest) { s.rest = false; s.mT = 1; s.active = -2 } const { ws, gap } = geo(); s.T = s.drag.T0 - dx / (ws + gap) }
      }
    }
    const onLeave = () => { s.inside = false; s.hover = -1 }
    const onDown = (e: PointerEvent) => {
      if (s.open || e.button !== 0) return
      s.drag = { id: e.pointerId, x0: e.clientX, T0: s.T, on: false }
    }
    const onUp = () => {
      if (!s.drag) return
      if (s.drag.on) { s.T = Math.round(s.T); s.suppress = true; setTimeout(() => (s.suppress = false), 0); shelf.classList.remove('is-drag') }
      s.drag = null
    }
    const onClick = (e: MouseEvent) => {
      if (s.suppress || s.open) return
      if (overCover(e.clientX, e.clientY)) { openDetail(); return }
      const tape = (e.target as Element).closest('.tape') as HTMLElement | null
      if (!tape) return
      const wasRest = s.rest; if (s.rest) { s.rest = false; s.mT = 1; s.active = -2 }
      let r = mod(+tape.dataset.v! - s.s, V); if (r >= V / 2) r -= V
      if (!wasRest && Math.abs(r) < 0.5 && Math.abs(s.T - s.s) < 0.3) openDetail()
      else s.T = Math.round(s.T + r)
    }
    const onWheel = (e: WheelEvent) => {
      if (s.open) return
      e.preventDefault()
      if (s.rest) { s.rest = false; s.mT = 1; s.active = -2 }
      const dl = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      const { ws, gap } = geo()
      s.T += (dl * (e.deltaMode === 1 ? 16 : 1)) / (ws + gap) * 0.5
      clearTimeout(s.wheelT); s.wheelT = setTimeout(() => { s.T = Math.round(s.T) }, 160)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (s.open) { if (e.key === 'Escape') { e.preventDefault(); closeDetail() } return }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
      else if (e.key === 'Enter' && !(e.target as HTMLElement)?.closest?.('a,button')) { e.preventDefault(); if (!wake()) openDetail() }
    }
    addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    shelf.addEventListener('pointerdown', onDown)
    addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp)
    shelf.addEventListener('click', onClick)
    shelf.addEventListener('wheel', onWheel, { passive: false })
    addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf); ro.disconnect()
      removeEventListener('scroll', measure)
      removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave)
      shelf.removeEventListener('pointerdown', onDown); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp)
      shelf.removeEventListener('click', onClick); shelf.removeEventListener('wheel', onWheel); removeEventListener('keydown', onKey)
      mqR.removeEventListener('change', syncMq); mqF.removeEventListener('change', syncMq)
      document.documentElement.classList.remove('vs-hidecur', 'vs-locked')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const db = detail !== null ? books[detail] : null
  const inkBox = () => { const r = db?.ratio || 0.66; return { w: 600, h: 600 / r } }
  const { w: iw, h: ih } = inkBox()
  const tabs = ['All', 'Reading now', 'Favorites']

  return (
    <section ref={rootRef} className="vs" aria-label="Bookshelf">
      <div ref={probeRef} className="vs-probe" aria-hidden="true" />

      <nav className="vs-tabs" aria-label="Shelf sections">
        <span ref={indRef} className="vs-tab-ind" aria-hidden="true" />
        {tabs.map((t, i) => (
          <button key={t} ref={(el) => { tabRefs.current[i] = el }} type="button" className={`vs-tab lbl box${tab === i ? ' is-on' : ''}`}
            aria-current={tab === i ? 'true' : undefined} onClick={() => jumpGroup(i as 0 | 1 | 2)}>{t}</button>
        ))}
      </nav>

      <div ref={shelfRef} className="vs-shelf">
        <div className="vs-stage" aria-hidden="true">
          {Array.from({ length: V }, (_, v) => {
            const b = books[v % N]
            const title = shortTitle(b.title)
            const f = Math.min(0.074, 0.6 / (title.length * 0.43))
            return (
              <div key={v} ref={(el) => { tapeRefs.current[v] = el }} className="tape" data-v={v}>
                <div className="tape-spine" style={{ ['--c' as string]: b.spine, ['--ink' as string]: inkFor(b.spine) }}>
                  <span className="sp-title" style={{ fontSize: `calc(var(--H) * ${f.toFixed(4)})` }}>{title}</span>
                  <span className="sp-author">{surname(b.author)}</span>
                  <span className="sp-badge">{b.status === 'reading' ? 'NOW' : 'FAV'}</span>
                </div>
                <div ref={(el) => { coverRefs.current[v] = el }} className="tape-cover" style={{ ['--c' as string]: b.spine }}>
                  {b.cover && <img src={b.cover} alt="" draggable={false} decoding="async" />}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <button ref={playRef} type="button" className="vs-play" aria-label="Open book" onClick={openDetail}>
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 1l9 5-9 5z" fill="currentColor" /></svg>
      </button>

      <div className="vs-caption" aria-live="polite">
        <span ref={(el) => { capRefs.current[0] = el }} className="vs-cap vs-cap-title" />
        <span ref={(el) => { capRefs.current[1] = el }} className="vs-cap vs-cap-author lbl" />
        <span ref={(el) => { capRefs.current[2] = el }} className="vs-cap vs-cap-status lbl" />
      </div>

      <button type="button" className="vs-arrow vs-arrow--prev" aria-label="Previous book" onClick={() => go(-1)}>
        <svg width="18" height="10" viewBox="0 0 18 10" aria-hidden="true"><path d="M17 5H1M5 1L1 5l4 4" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
      </button>
      <button type="button" className="vs-arrow vs-arrow--next" aria-label="Next book" onClick={() => go(1)}>
        <svg width="18" height="10" viewBox="0 0 18 10" aria-hidden="true"><path d="M1 5h16M13 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
      </button>

      {mounted && createPortal(<>
      <div className="vs-grain" aria-hidden="true" />

      <div ref={sheetRef} className="vs-sheet" role="dialog" aria-modal="true" aria-label={db ? db.title : 'Book'} hidden>
        <button ref={closeRef} type="button" className="vs-close lbl box" onClick={closeDetail}>Close</button>
        {db && (
          <div className="vs-sheet-grid">
            <div className="vs-sheet-text">
              <span className="dl"><span className="dl-in lbl vs-rust">{statusLabel(db)}</span></span>
              <h2 className="dl vs-sheet-title"><span className="dl-in">{db.title}</span></h2>
              <span className="dl"><span className="dl-in lbl vs-muted">{db.author}</span></span>
              {db.note && <p className="dl vs-sheet-note"><span className="dl-in">{db.note}</span></p>}
              {db.link && (
                <span className="dl dl-btn"><a className="dl-in vs-btn lbl" href={db.link} target="_blank" rel="noopener noreferrer">View on Goodreads</a></span>
              )}
            </div>
            <div className="vs-poster">
              <svg viewBox={`0 0 ${iw} ${ih.toFixed(1)}`} style={{ aspectRatio: `${db.ratio}` }} role="img" aria-label={`Cover of ${db.title}`}>
                <defs>
                  <filter id="vs-ink" x="-50%" y="-50%" width="200%" height="200%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves={3} seed={7} />
                    <feDisplacementMap in="SourceGraphic" scale={120} xChannelSelector="R" yChannelSelector="G" />
                  </filter>
                  <mask id="vs-ink-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={iw} height={ih}>
                    <g filter="url(#vs-ink)">
                      {BLOTS.map(([x, y], i) => (
                        <circle key={i} ref={(el) => { blobRefs.current[i] = el }} cx={(x * iw) / 474} cy={(y * ih) / 900} r="0" fill="#fff" />
                      ))}
                    </g>
                  </mask>
                </defs>
                <rect width={iw} height={ih} fill="#efe5d2" />
                {db.cover && <image href={db.cover} width={iw} height={ih} preserveAspectRatio="xMidYMid slice" mask="url(#vs-ink-mask)" />}
              </svg>
            </div>
          </div>
        )}
      </div>

      <div ref={curRef} className="vs-cursor" aria-hidden="true"><span className="vs-cursor-dot" /><span className="vs-cursor-lbl lbl">Open</span></div>
      </>, document.body)}
    </section>
  )
}
