import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import Stipple from '@/components/Stipple'
import BookCover from '@/components/BookCover'
import { readingBooks, favoriteBooks, type Book } from '@/data/books'
import { resolveCover } from '@/lib/covers'

export const metadata: Metadata = { title: 'Books', openGraph: { title: 'Books' } }
export const revalidate = 604800

type WithCover = Book & { cover: string | null }
const withCovers = (list: Book[]) => Promise.all(list.map(async (b) => ({ ...b, cover: await resolveCover(b) })))

function Wrap({ book, className, children }: { book: Book; className: string; children: React.ReactNode }) {
  return book.link
    ? <a href={book.link} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
    : <div tabIndex={0} className={className}>{children}</div>
}

export default async function BooksPage() {
  const [reading, favorites] = await Promise.all([withCovers(readingBooks), withCovers(favoriteBooks)])
  const empty = !reading.length && !favorites.length

  return (
    <main id="main" className="page-main page-main--books">
      <div className="books">
        <header className="books-header">
          <h1>Bookshelf</h1>
          <p>What&rsquo;s on the nightstand, and the ones I keep coming back to.</p>
          <Stipple name="merrick-butte" className="stipple--books-header" />
        </header>

        {empty && (
          <div className="books-empty">
            <Stipple name="cowboy-rider" className="stipple--books-empty" />
            <p>The shelf is being dusted off. Check back soon.</p>
          </div>
        )}

        {reading.length > 0 && (
          <section className="books-section" aria-labelledby="reading-h">
            <h2 id="reading-h" className="books-h2">Currently reading</h2>
            <ul className="nightstand">
              {reading.map((b: WithCover) => (
                <li key={b.title} className="nightstand-item">
                  <Wrap book={b} className="nightstand-cover">
                    <BookCover src={b.cover} title={b.title} author={b.author} eager />
                  </Wrap>
                  <div className="nightstand-meta">
                    <span className="books-kicker">On the nightstand</span>
                    <h3>{b.title}</h3>
                    <p className="books-author">{b.author}</p>
                    {b.note && <p className="books-note">{b.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {favorites.length > 0 && (
          <section className="books-section" aria-labelledby="fav-h">
            <h2 id="fav-h" className="books-h2">Favorites</h2>
            <ul className="shelf">
              {favorites.map((b: WithCover) => (
                <li key={b.title} className="shelf-item">
                  <Wrap book={b} className="shelf-book">
                    <BookCover src={b.cover} title={b.title} author={b.author} />
                    <span className="shelf-caption">
                      <strong>{b.title}</strong>
                      <span>{b.author}</span>
                      {b.note && <em>{b.note}</em>}
                    </span>
                  </Wrap>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <Footer />
    </main>
  )
}
