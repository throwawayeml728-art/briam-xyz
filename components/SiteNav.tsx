'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Projects', href: '/projects' },
  { label: 'Photos', href: '/photos' },
  { label: 'Contact', href: '#contact' },
] as const

export default function SiteNav() {
  const pathname = usePathname() || '/'
  const onBooks = pathname === '/books' || pathname.startsWith('/books/')

  return (
    <aside className="shell-sidebar">
      <Link href="/" className="shell-logo" aria-label="Brian Landauer home">
        <span aria-hidden="true">BL</span>
      </Link>
      <nav className="shell-nav" aria-label="Primary">
        <ul>
          {items.map((item) => {
            const href = item.label === 'Contact'
              ? (pathname === '/' ? '#contact' : '/#contact')
              : item.href
            const active = item.label === 'Contact'
              ? false
              : item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <li key={item.label}>
                <Link
                  href={href}
                  className={active ? 'is-active' : undefined}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <Link
        href="/books"
        className={onBooks ? 'shell-nav-box is-active' : 'shell-nav-box'}
        aria-current={onBooks ? 'page' : undefined}
      >
        Books
      </Link>
    </aside>
  )
}
