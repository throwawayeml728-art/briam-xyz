import { siteConfig } from '@/data/content'

const socialLinks = [
  ['LinkedIn', siteConfig.social.linkedin],
  ['Events', siteConfig.social.luma],
  ['Email', `mailto:${siteConfig.email}`],
] as const

export default function Footer() {
  return (
    <footer className="site-footer">
      <p className="site-footer-copy">
        © {new Date().getFullYear()} {siteConfig.name} · {siteConfig.domain}
      </p>
      <nav className="site-footer-links" aria-label="Social links">
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
