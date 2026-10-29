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
  {
    title: 'Flash Boys: A Wall Street Revolt',
    author: 'Michael Lewis',
    status: 'reading',
    coverUrl: '/books/24724602.webp',
    link: 'https://www.goodreads.com/book/show/24724602-flash-boys',
  },
  {
    title: 'The Screwtape Letters',
    author: 'C.S. Lewis',
    status: 'reading',
    coverUrl: '/books/25692144.webp',
    link: 'https://www.goodreads.com/book/show/25692144-the-screwtape-letters',
  },
  {
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    status: 'reading',
    coverUrl: '/books/54493401.webp',
    link: 'https://www.goodreads.com/book/show/54493401-project-hail-mary',
  },
  {
    title: 'Thoughts for Young Men',
    author: 'J.C. Ryle',
    status: 'favorite',
    coverUrl: '/books/249050.webp',
    link: 'https://www.goodreads.com/book/show/249050',
  },
  {
    title: 'The Four Agreements',
    author: 'Miguel Ruiz',
    status: 'favorite',
    coverUrl: '/books/6596.webp',
    link: 'https://www.goodreads.com/book/show/6596',
  },
  {
    title: 'Spark',
    author: 'John J. Ratey',
    status: 'favorite',
    coverUrl: '/books/721609.webp',
    link: 'https://www.goodreads.com/book/show/721609',
  },
  {
    title: 'Mere Christianity',
    author: 'C.S. Lewis',
    status: 'favorite',
    coverUrl: '/books/11138.webp',
    link: 'https://www.goodreads.com/book/show/11138',
  },
  {
    title: 'A Call to Prayer',
    author: 'J.C. Ryle',
    status: 'favorite',
    coverUrl: '/books/1030140.webp',
    link: 'https://www.goodreads.com/book/show/1030140',
  },
  {
    title: 'The Things They Carried',
    author: "Tim O'Brien",
    status: 'favorite',
    coverUrl: '/books/133518.webp',
    link: 'https://www.goodreads.com/book/show/133518',
  },
  {
    title: 'Heaven',
    author: 'J.C. Ryle',
    status: 'favorite',
    coverUrl: '/books/1643225.webp',
    link: 'https://www.goodreads.com/book/show/1643225',
  },
  {
    title: 'As a Man Thinketh',
    author: 'James Allen',
    status: 'favorite',
    coverUrl: '/books/81959.webp',
    link: 'https://www.goodreads.com/book/show/81959',
  },
  {
    title: 'The Reason for God',
    author: 'Timothy J. Keller',
    status: 'favorite',
    coverUrl: '/books/1858013.webp',
    link: 'https://www.goodreads.com/book/show/1858013',
  },
  {
    title: 'Harry Potter and the Prisoner of Azkaban',
    author: 'J.K. Rowling',
    status: 'favorite',
    coverUrl: '/books/5.webp',
    link: 'https://www.goodreads.com/book/show/5',
  },
  {
    title: 'Harry Potter and the Goblet of Fire',
    author: 'J.K. Rowling',
    status: 'favorite',
    coverUrl: '/books/6.webp',
    link: 'https://www.goodreads.com/book/show/6',
  },
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
