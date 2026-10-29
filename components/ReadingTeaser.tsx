import Link from 'next/link'
import { readingBooks } from '@/data/books'

export default function ReadingTeaser() {
  if (!readingBooks.length) return null
  return (
    <section className="reading-teaser" aria-label="Currently reading">
      <span className="books-kicker">Currently reading</span>
      <p>
        {readingBooks.map((b, i) => (
          <span key={b.title}>{i > 0 && <span aria-hidden="true"> · </span>}<em>{b.title}</em> by {b.author}</span>
        ))}
      </p>
      <Link href="/books" className="home-link">Bookshelf <span aria-hidden="true">→</span></Link>
    </section>
  )
}
