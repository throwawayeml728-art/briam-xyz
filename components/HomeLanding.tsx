import Link from 'next/link'

const LINKEDIN = 'https://www.linkedin.com/in/brian-landauer/'
const X_URL = 'https://x.com/proofofbrian'
const EMAIL = 'mailto:hello@fifthdegree.xyz'

const nav = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Projects', href: '/projects' },
  { label: 'Photos', href: '/photos' },
  { label: 'Contact', href: '#contact' },
] as const

export default function HomeLanding() {
  return (
    <div className="landing" id="main">
      <div className="landing-frame">
        <aside className="landing-sidebar">
          <Link href="/" className="landing-logo" aria-label="Brian Landauer home">
            <span aria-hidden="true">BL</span>
          </Link>
          <nav className="landing-nav" aria-label="Primary">
            <ul>
              {nav.map((item) => {
                const active = item.href === '/'
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
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
          <Link href="/books" className="landing-nav-box">
            Books
          </Link>
        </aside>

        <div className="landing-content">
          <section className="landing-hero" aria-labelledby="landing-title">
            <span className="landing-num" aria-hidden="true">01</span>
            <h1 id="landing-title">
              Brian Landauer,
              <br />
              based in New York City.
            </h1>
            <div className="landing-copy">
              <p>I take photographs, build things, and keep a running list of what I&apos;m reading.</p>
              <p>
                You can find me on{' '}
                <a href={X_URL} target="_blank" rel="noopener noreferrer">
                  X
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>{' '}
                and{' '}
                <a href={LINKEDIN} target="_blank" rel="noopener noreferrer">
                  LinkedIn
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                .
              </p>
              <p className="landing-placeholder">
                [Placeholder: a short sentence about what this site gathers — photographs, projects, and books. Replace this line.]
              </p>
            </div>
            <div className="landing-actions" id="contact">
              <a className="landing-btn landing-btn--solid" href={EMAIL}>
                Get in touch
              </a>
              <a
                className="landing-btn landing-btn--outline"
                href={X_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Follow on X
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
