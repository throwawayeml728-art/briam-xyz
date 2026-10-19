import Link from 'next/link'
import Hero from '@/components/Hero'
import PhotoGrid from '@/components/PhotoGrid'
import Projects from '@/components/Projects'
import Footer from '@/components/Footer'
import { getPhotos } from '@/lib/photos'

export const dynamic = 'force-dynamic'

const HOME_PHOTO_COUNT = 43 // show every photo

export default function Home() {
  const photos = getPhotos().slice(0, HOME_PHOTO_COUNT)

  return (
    <main id="main" className="home-main">
      <Hero />
      <div className="home-content">
        <div id="photography" className="home-anchor" />
        <div className="home-heading">
          <h2>Photography</h2>
          <Link href="/photos" className="home-link">View all <span aria-hidden="true">→</span></Link>
        </div>
        <PhotoGrid photos={photos} />
        <Projects viewAllHref="/projects" />
        <Footer />
      </div>
    </main>
  )
}
