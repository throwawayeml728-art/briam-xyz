'use client'

import { useState } from 'react'

const PALETTE = [
  ['#4a2e1c', '#e9d9b8'], ['#9a3f1f', '#f6e9d0'], ['#2b1d14', '#d9b98a'],
  ['#55674a', '#f3ead9'], ['#6a5543', '#f3ead9'], ['#2f7d7a', '#f3ead9'],
] as const

function pick(seed: string) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
}

export default function BookCover({ src, title, author, eager = false }: { src: string | null; title: string; author: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false)
  if (src && !failed) {
    return (
      // Plain img: Open Library serves sized JPEGs already; avoids optimizer cost.
      // eslint-disable-next-line @next/next/no-img-element
      <img className="book-cover" src={src} alt={`Cover of ${title} by ${author}`}
        loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />
    )
  }
  const [bg, fg] = pick(title + author)
  return (
    <div className="book-cover book-cover--type" role="img" aria-label={`${title} by ${author}`} style={{ background: bg, color: fg }}>
      <span className="book-cover-rule" aria-hidden="true" />
      <span className="book-cover-title">{title}</span>
      <span className="book-cover-author">{author}</span>
      <span className="book-cover-rule" aria-hidden="true" />
    </div>
  )
}
