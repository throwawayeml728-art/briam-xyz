import PhotoGrid from '@/components/PhotoGrid'
import Footer from '@/components/Footer'
import { getPhotos } from '@/lib/photos'

export const dynamic = 'force-dynamic'

export default function PhotosPage() {
  const photos = getPhotos()

  return (
    <main style={{ paddingTop: '60px' }}>
      <PhotoGrid photos={photos} />
      <Footer />
    </main>
  )
}
