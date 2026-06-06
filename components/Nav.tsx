'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  ['Photos', '/photos'],
  ['Cool stuff', '/cool-stuff'],
  ['Projects', '/projects'],
] as const

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav
      className="site-nav"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '60px',
        background: 'rgba(250,250,248,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e8e8e4',
      }}
    >
      <Link
        href="/photos"
        style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: '17px',
          color: '#1a1a18',
          textDecoration: 'none',
          letterSpacing: '-0.01em',
        }}
      >
        Brian Landauer
      </Link>
      <ul className="site-nav-links" style={{ display: 'flex', gap: '32px', listStyle: 'none', margin: 0, padding: 0 }}>
        {links.map(([label, href]) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <li key={label}>
              <Link
                href={href}
                className={active ? 'site-nav-link site-nav-link--active' : 'site-nav-link'}
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
