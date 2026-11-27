import SiteShell from '@/components/SiteShell'

const LINKEDIN = 'https://www.linkedin.com/in/brian-landauer/'
const X_URL = 'https://x.com/proofofbrian'
const EMAIL = 'mailto:hello@fifthdegree.xyz'

export default function HomeLanding() {
  return (
    <SiteShell number="01">
      <section className="shell-hero" aria-labelledby="home-title">
        <h1 id="home-title">
          Brian Landauer,
          <br />
          based in New York City.
        </h1>
        <div className="shell-copy">
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
          <p className="shell-placeholder">
            [Placeholder: a short sentence about what this site gathers — photographs, projects, and books. Replace this line.]
          </p>
        </div>
        <div className="shell-actions" id="contact">
          <a className="shell-btn shell-btn--solid" href={EMAIL}>
            Get in touch
          </a>
          <a
            className="shell-btn shell-btn--outline"
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow on X
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </section>
    </SiteShell>
  )
}
