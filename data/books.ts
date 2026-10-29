// Brian's bookshelf. Add a book by appending an object to `books` below.
// Empty list = the /books page, nav link and home teaser all stay hidden.

export type BookStatus = 'reading' | 'favorite'

export interface Book {
  title: string
  author: string
  status: BookStatus
  /** Short note or favorite quote, shown under the book. */
  note?: string
  /** Explicit cover image (overrides the Open Library lookup). */
  coverUrl?: string
  /** ISBN-10 or ISBN-13 (dashes OK); used for the Open Library cover. */
  isbn?: string
  /** Where the book links to (publisher, Bookshop, Goodreads, ...). */
  link?: string
}

export const books: Book[] = [
  // {
  //   title: 'Blood Meridian',
  //   author: 'Cormac McCarthy',
  //   status: 'favorite',
  //   isbn: '9780679728757',
  //   note: 'Whatever exists without my knowledge exists without my consent.',
  //   link: 'https://bookshop.org/a/0/9780679728757',
  // },
]

export const readingBooks = books.filter((b) => b.status === 'reading')
export const favoriteBooks = books.filter((b) => b.status === 'favorite')
export const hasBooks = books.length > 0
