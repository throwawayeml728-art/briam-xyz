import type { Metadata } from 'next'
import Projects from '@/components/Projects'
import Footer from '@/components/Footer'

export const metadata: Metadata = { title: 'Projects', openGraph: { title: 'Projects' } }

export default function ProjectsPage() {
  return (
    <main id="main" className="page-main">
      <Projects />
      <Footer />
    </main>
  )
}
