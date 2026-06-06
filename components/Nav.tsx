'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  ['Home', '/'],
  ['Photos', '/photos'],
  ['Cool stuff', '/cool-stuff'],
  ['Projects', '/projects'],
] as const

export default function Nav() {
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <nav
      className={`site-nav${isHome ? ' site-nav--home' : ''}`}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: '60px',
        background: isHome ? 'transparent' : 'rgba(250,250,248,0.92)',
        backdropFilter: isHome ? 'none' : 'blur(12px)',
        borderBottom: isHome ? 'none' : '1px solid #e8e8e4',
      }}
    >
      <ul className="site-nav-links" style={{ display: 'flex', gap: '32px', listStyle: 'none', margin: 0, padding: 0 }}>
        {links.map(([label, href]) => {
          const active = href === '/'
            ? pathname === '/'
            : pathname === href || pathname.startsWith(`${href}/`)
          return (
            <li key={label}>
              <Link
                href={href}
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
