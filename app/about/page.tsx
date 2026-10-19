import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import { siteConfig, workHistory } from '@/data/content'

export const metadata: Metadata = { title: 'About · Brian Landauer', openGraph: { title: 'About · Brian Landauer' } }

export default function AboutPage() {
  return (
    <main id="main" className="page-main">
      <div>
        <div className="about-intro">
          <h1>About</h1>
          <p>{siteConfig.tagline} Based in {siteConfig.location}.</p>
        </div>
        <section className="site-section" style={{ maxWidth: '1100px', margin: '0 auto' }} aria-labelledby="work-heading">
          <h2 id="work-heading" style={{ fontSize: '14px', fontWeight: 400, letterSpacing: '-0.01em', textTransform: 'none', color: '#888884', margin: 0, paddingBottom: '16px' }}>
            Work
          </h2>
          {workHistory.length === 0 ? (
            <p className="work-empty">Work history coming soon.</p>
          ) : (
            <ul className="work-list">
              {workHistory.map((w) => (
                <li key={`${w.company}-${w.start}`} className="work-row">
                  <span className="work-years">{w.start} – {w.end ?? 'Present'}</span>
                  <div>
                    <h3 className="work-title">
                      {w.role} <span className="work-company">·{' '}
                        {w.url ? <a href={w.url} target="_blank" rel="noopener noreferrer">{w.company}<span className="sr-only"> (opens in a new tab)</span></a> : w.company}
                      </span>
                    </h3>
                    {w.desc && <p className="work-desc">{w.desc}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <Footer />
    </main>
  )
}
