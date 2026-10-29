import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import Stipple from '@/components/Stipple'
import BookShelf from '@/components/BookShelf'
import { readingBooks, favoriteBooks } from '@/data/books'
import { resolveCover } from '@/lib/covers'

export const metadata: Metadata = { title: 'Books', openGraph: { title: 'Books' } }
export const revalidate = 604800

export default async function BooksPage() {
  // Currently-reading first (marked with a rust ribbon), then favorites.
  const books = await Promise.all([...readingBooks, ...favoriteBooks].map(async (b) => ({ ...b, cover: await resolveCover(b) })))

  return (
    <main id="main" className="page-main page-main--books">
      <div className="books">
        <header className="books-header">
          <p className="books-sub">Reading now &amp; old favorites</p>
          <h1>On the Shelf</h1>
        </header>
        {books.length ? <BookShelf books={books} /> : (
          <div className="shelf-panel books-empty">
            <Stipple name="cowboy-rider" className="stipple--books-empty" />
            <p>The shelf is being dusted off. Check back soon.</p>
          </div>
        )}
      </div>
      <Footer />
    </main>
  )
}
