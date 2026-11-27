import type { Metadata, Viewport } from 'next'
import HomeLanding from '@/components/HomeLanding'

export const viewport: Viewport = {
  themeColor: '#f6f5f3',
}

export const metadata: Metadata = {
  title: { absolute: 'Brian Landauer' },
  description: 'Brian Landauer, based in New York City.',
}

export default function Home() {
  return <HomeLanding />
}
