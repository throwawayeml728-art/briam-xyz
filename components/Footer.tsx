import Link from 'next/link'
import { siteConfig } from '@/data/content'

const socialLinks = [
  ['LinkedIn', siteConfig.social.linkedin],
  ['Events', siteConfig.social.luma],
  ['Email', `mailto:${siteConfig.email}`],
] as const

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <p className="site-footer-tagline">
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 0l1.4 4.6L12 6 7.4 7.4 6 12 4.6 7.4 0 6l4.6-1.4z" /></svg>
          Arizona born
        </p>
        <p className="site-footer-copy">
          © {new Date().getFullYear()} {siteConfig.name} · {siteConfig.domain}
        </p>
      </div>
      <nav className="site-footer-links" aria-label="Social links">
        <Link href="/about">About</Link>
        {socialLinks.map(([label, href]) => {
          const external = !href.startsWith('mailto:')
          return (
            <a
              key={label}
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
            >
              {label}
              {external && <span className="sr-only"> (opens in a new tab)</span>}
            </a>
          )
        })}
      </nav>
    </footer>
  )
}
