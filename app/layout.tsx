import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Libre_Baskerville, Alfa_Slab_One } from 'next/font/google'
import { MotionConfig } from 'framer-motion'
import Nav from '@/components/Nav'
import { PhotoZoomProvider } from '@/components/PhotoZoomProvider'

const serif = Libre_Baskerville({ subsets: ['latin'], weight: ['400', '700'], style: ['normal', 'italic'], display: 'swap', variable: '--font-serif' })

const display = Alfa_Slab_One({ subsets: ['latin'], weight: '400', display: 'swap', variable: '--font-display' })

const description = 'Builder, photographer, curious person. Based in New York City.'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f3ead9',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://fifthdegree.xyz'),
  title: { default: 'Brian Landauer', template: '%s · Brian Landauer' },
  description,
  openGraph: {
    title: 'Brian Landauer',
    description,
    url: 'https://fifthdegree.xyz',
    siteName: 'Brian Landauer',
    type: 'website',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Engraved geologic-map style rendering of Monument Valley buttes on cream paper' }],
  },
  twitter: { card: 'summary_large_image', title: 'Brian Landauer', description, images: ['/og.jpg'] },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${display.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:bg-bg focus:px-3 focus:py-2 focus:text-sm">
          Skip to content
        </a>
        <MotionConfig reducedMotion="user">
          <PhotoZoomProvider>
            <Nav />
            {children}
          </PhotoZoomProvider>
        </MotionConfig>
      </body>
    </html>
  )
}
