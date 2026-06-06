'use client'

import { siteConfig } from '@/data/content'

const socialLinks = [
  ['LinkedIn', siteConfig.social.linkedin],
  ['Events', siteConfig.social.luma],
  ['Email', `mailto:${siteConfig.email}`],
] as const

export default function Footer() {
  return (
    <footer
      className="site-footer"
      style={{
        borderTop: '1px solid #e8e8e4',
        maxWidth: '1100px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <p style={{ fontSize: '12px', color: '#888884', fontWeight: 300 }}>
        © {new Date().getFullYear()} {siteConfig.name} · {siteConfig.domain}
      </p>
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {socialLinks.map(([label, href]) => (
          <a
            key={label}
            href={href}
            target={href.startsWith('mailto:') ? undefined : '_blank'}
            rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
            style={{
              fontSize: '11px',
              color: '#888884',
              textDecoration: 'none',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#1a1a18')}
            onMouseLeave={e => (e.currentTarget.style.color = '#888884')}
          >
            {label}
          </a>
        ))}
      </div>
    </footer>
  )
}
