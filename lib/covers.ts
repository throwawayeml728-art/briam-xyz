import type { Book } from '@/data/books'

const OL = 'https://covers.openlibrary.org/b'

/** Open Library cover by ISBN. `default=false` makes OL 404 (not a blank gif) when missing. */
export function isbnCoverUrl(isbn: string, size: 'S' | 'M' | 'L' = 'L') {
  return `${OL}/isbn/${isbn.replace(/[^0-9Xx]/g, '')}-${size}.jpg?default=false`
}

/** Resolve a cover: explicit coverUrl > ISBN > Open Library search by title+author. null = typographic fallback. */
export async function resolveCover(book: Book): Promise<string | null> {
  if (book.coverUrl) return book.coverUrl
  if (book.isbn) return isbnCoverUrl(book.isbn)
  try {
    const q = new URLSearchParams({ title: book.title, author: book.author, limit: '1', fields: 'cover_i' })
    const res = await fetch(`https://openlibrary.org/search.json?${q}`, { next: { revalidate: 60 * 60 * 24 * 7 } })
    if (!res.ok) return null
    const data = (await res.json()) as { docs?: { cover_i?: number }[] }
    const id = data.docs?.[0]?.cover_i
    return id ? `${OL}/id/${id}-L.jpg?default=false` : null
  } catch {
    return null
  }
}
