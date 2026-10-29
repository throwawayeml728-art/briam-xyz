'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Book } from '@/data/books'

export type ShelfBook = Book & { cover: string | null }

const PALETTE = [
  ['#4a2e1c', '#e9d9b8'], ['#9a3f1f', '#f6e9d0'], ['#2b1d14', '#d9b98a'],
  ['#55674a', '#f3ead9'], ['#6a5543', '#f3ead9'], ['#2f7d7a', '#f3ead9'],
] as const

function hash(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) }

/** Short wooden "tock": filtered noise burst + low sine knock, ~70ms. */
function useTock() {
  const ctx = useRef<AudioContext | null>(null)
  return useCallback(() => {
    try {
      const ac = (ctx.current ??= new AudioContext())
      const t = ac.currentTime
      const len = Math.floor(ac.sampleRate * 0.05)
      const buf = ac.createBuffer(1, len, ac.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4)
      const noise = ac.createBufferSource(); noise.buffer = buf
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 4
      const osc = ac.createOscillator(); osc.frequency.setValueAtTime(220, t); osc.frequency.exponentialRampToValueAtTime(140, t + 0.06)
      const g = ac.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
      noise.connect(bp).connect(g); osc.connect(g); g.connect(ac.destination)
      noise.start(t); osc.start(t); osc.stop(t + 0.08)
    } catch { /* audio unavailable */ }
  }, [])
}

function Cover({ book, onRatio }: { book: ShelfBook; onRatio: (r: number) => void }) {
  const [failed, setFailed] = useState(false)
  const img = useRef<HTMLImageElement>(null)
  // Images can finish loading before hydration; read their dimensions on mount too.
  useEffect(() => {
    const i = img.current
    if (i?.complete) { if (i.naturalWidth > 1) onRatio(i.naturalWidth / i.naturalHeight); else setFailed(true) }
  }, [onRatio])
  if (book.cover && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img ref={img} src={book.cover} alt={`Cover of ${book.title} by ${book.author}`} loading="lazy" decoding="async"
        onLoad={(e) => { const i = e.currentTarget; if (i.naturalWidth > 1) onRatio(i.naturalWidth / i.naturalHeight); else setFailed(true) }}
        onError={() => setFailed(true)} />
    )
  }
  const [bg, fg] = PALETTE[hash(book.title + book.author) % PALETTE.length]
  return (
    <div className="bk-type" role="img" aria-label={`${book.title} by ${book.author}`} style={{ background: bg, color: fg }}>
      <span className="bk-type-rule" aria-hidden="true" />
      <span className="bk-type-title">{book.title}</span>
      <span className="bk-type-author">{book.author}</span>
      <span className="bk-type-rule" aria-hidden="true" />
    </div>
  )
}

function BookItem({ book, index, active, onActivate }: { book: ShelfBook; index: number; active: boolean; onActivate: (i: number | null, sound?: boolean) => void }) {
  const [ratio, setRatio] = useState(2 / 3)
  const scale = 0.94 + (hash(book.title) % 13) / 100 // natural height variation 0.94–1.06
  const style = { '--r': ratio.toFixed(3), '--s': scale.toFixed(3) } as React.CSSProperties
  const props = {
    className: `bk${active ? ' bk--active' : ''}${book.status === 'reading' ? ' bk--reading' : ''}`,
    style,
    'aria-describedby': active ? 'shelf-caption' : undefined,
    onMouseEnter: () => onActivate(index, true),
    onFocus: () => onActivate(index, true),
    onBlur: () => onActivate(null),
    onMouseLeave: () => onActivate(null),
  }
  const inner = (
    <>
      <span className="bk-body"><Cover book={book} onRatio={setRatio} /><span className="bk-pages" aria-hidden="true" /></span>
      {book.status === 'reading' && <span className="bk-ribbon" aria-hidden="true" />}
      <span className="sr-only">{book.status === 'reading' ? ' (reading now)' : ''}</span>
    </>
  )
  return (
    <li className="bk-slot">
      {book.link
        ? <a href={book.link} target="_blank" rel="noopener noreferrer" {...props}>{inner}</a>
        : <button type="button" {...props} onClick={() => onActivate(index, true)}>{inner}</button>}
    </li>
  )
}

export default function BookShelf({ books }: { books: ShelfBook[] }) {
  const [active, setActive] = useState<number | null>(null)
  const [sound, setSound] = useState(false)
  const tock = useTock()
  const activate = useCallback((i: number | null, s?: boolean) => {
    setActive((prev) => { if (i !== null && i !== prev && s && sound) tock(); return i })
  }, [sound, tock])
  const b = active !== null ? books[active] : null

  return (
    <div className="shelf-panel">
      <button type="button" className="shelf-sound" aria-pressed={sound} aria-label={sound ? 'Turn shelf sound off' : 'Turn shelf sound on'}
        onClick={() => { const next = !sound; setSound(next); if (next) tock() }}>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
          {sound ? <><path d="M16 9a4 4 0 0 1 0 6" /><path d="M19 6.5a8 8 0 0 1 0 11" /></> : <path d="M17 9l5 6M22 9l-5 6" />}
        </svg>
      </button>
      <ul className="shelf-books">
        {books.map((bk, i) => <BookItem key={bk.title + bk.author} book={bk} index={i} active={active === i} onActivate={activate} />)}
      </ul>
      <div id="shelf-caption" className="shelf-caption" aria-live="polite">
        {b ? (
          <>
            {b.status === 'reading' && <span className="shelf-caption-kicker">Reading now</span>}
            <span className="shelf-caption-title">{b.title}</span>
            <span className="shelf-caption-author">{b.author}</span>
            {b.note && <span className="shelf-caption-note">{b.note}</span>}
          </>
        ) : (
          <span className="shelf-caption-hint">Hover or tap a book <span aria-hidden="true">·</span> <span className="shelf-caption-ribbon" aria-hidden="true" /> reading now</span>
        )}
      </div>
    </div>
  )
}
