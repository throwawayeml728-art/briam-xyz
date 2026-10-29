'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { hasBooks } from '@/data/books'

const links = [
  ['Home', '/'],
  ['Photos', '/photos', '/#photography'],
  ['Projects', '/projects', '/#projects'],
  ...(hasBooks ? [['Books', '/books'] as const] : []),
  ['About', '/about'],
] as readonly (readonly [string, string, string?])[]

export default function Nav() {
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <nav
      aria-label="Primary"
      className={`site-nav${isHome ? ' site-nav--home' : ' site-nav--page'}`}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      <ul className="site-nav-links" style={{ display: 'flex', gap: '32px', listStyle: 'none', margin: 0, padding: 0 }}>
        {links.filter(([, href]) => !isHome || href !== '/').map(([label, href, homeHref]) => {
          const active = href === '/'
            ? pathname === '/'
            : pathname === href || pathname.startsWith(`${href}/`)
          return (
            <li key={label}>
              <Link
                href={isHome && homeHref ? homeHref : href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'site-nav-link',
                  active ? 'site-nav-link--active' : '',
                  isHome ? 'site-nav-link--home' : '',
                ].filter(Boolean).join(' ')}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
