import type { Metadata } from 'next'
import Projects from '@/components/Projects'
import SiteShell from '@/components/SiteShell'

export const metadata: Metadata = { title: 'Projects', openGraph: { title: 'Projects' } }

export default function ProjectsPage() {
  return (
    <SiteShell number="01">
      <section className="shell-page" aria-labelledby="projects-title">
        <h1 id="projects-title" className="shell-page-title">Projects</h1>
        <Projects />
      </section>
    </SiteShell>
  )
}
