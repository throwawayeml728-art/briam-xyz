'use client'

import Link from 'next/link'
import { siteConfig } from '@/data/content'

const sections = [
  { label: 'Photos', href: '/photos' },
  { label: 'Cool stuff', href: '/cool-stuff' },
  { label: 'Projects', href: '/projects' },
] as const

export default function HomeGradient() {
  return (
    <main className="home-gradient-page">
      <div className="home-gradient" aria-hidden="true">
        <div className="home-gradient-blob home-gradient-blob--sky" />
        <div className="home-gradient-blob home-gradient-blob--azure" />
        <div className="home-gradient-blob home-gradient-blob--cyan" />
        <div className="home-gradient-blob home-gradient-blob--glow" />
        <div className="home-gradient-blob home-gradient-blob--deep" />
      </div>

      <div className="home-content">
        <div className="home-intro">
          <h1 className="home-name">{siteConfig.name}</h1>
          <p className="home-tagline">{siteConfig.tagline}</p>
          <p className="home-location">{siteConfig.location}</p>
        </div>

        <nav className="home-sections" aria-label="Site sections">
          {sections.map(({ label, href }) => (
            <Link key={href} href={href} className="home-section-link">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  )
}
