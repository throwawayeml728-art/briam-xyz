const LINKEDIN = 'https://www.linkedin.com/in/brian-landauer/'
const X_URL = 'https://x.com/proofofbrian'
const EMAIL = 'mailto:hello@fifthdegree.xyz'

const links = [
  ['LinkedIn', LINKEDIN, true],
  ['X', X_URL, true],
  ['Email', EMAIL, false],
] as const

export default function Footer() {
  return (
    <footer className="shell-footer">
      <p>© {new Date().getFullYear()} Brian Landauer</p>
      <nav aria-label="Social links">
        <ul className="shell-footer-links">
          {links.map(([label, href, external]) => (
            <li key={label}>
              <a
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
              >
                {label}
                {external && <span className="sr-only"> (opens in a new tab)</span>}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  )
}
