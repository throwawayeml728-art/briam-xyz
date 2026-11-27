import type { Metadata } from 'next'
import SiteShell from '@/components/SiteShell'
import VhsShelf, { type ShelfBook } from '@/components/VhsShelf'
import { readingBooks, favoriteBooks } from '@/data/books'
import { resolveCover } from '@/lib/covers'
import meta from '@/data/book-meta.json'

export const metadata: Metadata = { title: 'Books', openGraph: { title: 'Books' } }
export const revalidate = 604800

const M = meta as Record<string, { ratio: number; edge: string; dominant: string }>

export default async function BooksPage() {
  // Currently-reading first, then favorites.
  const books: ShelfBook[] = await Promise.all([...readingBooks, ...favoriteBooks].map(async (b) => {
    const cover = await resolveCover(b)
    const m = (b.coverUrl && M[b.coverUrl]) || { ratio: 0.66, edge: '#7a5a3c', dominant: '#7a5a3c' }
    return { title: b.title, author: b.author, status: b.status, note: b.note, link: b.link, cover, ratio: m.ratio, spine: m.edge }
  }))

  if (!books.length) {
    return (
      <SiteShell number="01">
        <section className="shell-page" aria-labelledby="books-title">
          <h1 id="books-title" className="shell-page-title">Books</h1>
          <p className="shell-books-empty">The shelf is being dusted off. Check back soon.</p>
        </section>
      </SiteShell>
    )
  }

  return (
    <SiteShell number="01" footer={false} contentClassName="shell-content--shelf">
      <h1 className="sr-only">On the Shelf: books Brian is reading now and old favorites</h1>
      <VhsShelf books={books} />
    </SiteShell>
  )
}
