import type { Metadata } from 'next'
import Projects from '@/components/Projects'
import Footer from '@/components/Footer'
import Stipple from '@/components/Stipple'

export const metadata: Metadata = { title: 'Projects', openGraph: { title: 'Projects' } }

export default function ProjectsPage() {
  return (
    <main id="main" className="page-main page-main--projects">
      <Projects />
      <Footer />
      <Stipple name="hoodoo-corner" className="stipple--projects-margin" />
    </main>
  )
}
