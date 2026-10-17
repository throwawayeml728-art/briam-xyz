import type { Metadata } from 'next'
import PhotoGrid from '@/components/PhotoGrid'
import Footer from '@/components/Footer'
import { getPhotos } from '@/lib/photos'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Photos', openGraph: { title: 'Photos' } }

export default function PhotosPage() {
  const photos = getPhotos()

  return (
    <main id="main" className="page-main">
      <PhotoGrid photos={photos} />
      <Footer />
    </main>
  )
}
