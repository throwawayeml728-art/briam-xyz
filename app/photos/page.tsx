import type { Metadata } from 'next'
import PhotoGrid from '@/components/PhotoGrid'
import SiteShell from '@/components/SiteShell'
import { getPhotos } from '@/lib/photos'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Photos', openGraph: { title: 'Photos' } }

export default function PhotosPage() {
  const photos = getPhotos()

  return (
    <SiteShell number="01" contentClassName="shell-content--photos">
      <section className="shell-page" aria-labelledby="photos-title">
        <h1 id="photos-title" className="shell-page-title">Photos</h1>
        <PhotoGrid photos={photos} />
      </section>
    </SiteShell>
  )
}
