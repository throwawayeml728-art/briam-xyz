import type { Metadata } from 'next'
import SiteShell from '@/components/SiteShell'

const LINKEDIN = 'https://www.linkedin.com/in/brian-landauer/'
const X_URL = 'https://x.com/proofofbrian'
const EMAIL = 'mailto:hello@fifthdegree.xyz'

export const metadata: Metadata = { title: 'About', openGraph: { title: 'About' } }

export default function AboutPage() {
  return (
    <SiteShell number="01">
      <section className="shell-hero" aria-labelledby="about-title">
        <h1 id="about-title">About</h1>
        <div className="shell-copy">
          <p>
            I&apos;m Brian Landauer, based in New York City. I take photographs, build things, and keep a running list of what I&apos;m reading.
          </p>
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
            [Placeholder: a short paragraph about you — interests, what this site is for, or anything you&apos;d like people to know. Replace this.]
          </p>
        </div>
        <div className="shell-actions">
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
