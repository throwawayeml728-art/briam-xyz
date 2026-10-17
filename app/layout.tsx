import type { Metadata } from 'next'
import './globals.css'
import { Libre_Baskerville } from 'next/font/google'
import { MotionConfig } from 'framer-motion'
import Nav from '@/components/Nav'
import { PhotoZoomProvider } from '@/components/PhotoZoomProvider'

const serif = Libre_Baskerville({ subsets: ['latin'], weight: ['400', '700'], style: ['normal', 'italic'], display: 'swap', variable: '--font-serif' })

const description = 'Builder, photographer, curious person. Based in New York City.'

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
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Pixel-art rendering of Monument Valley at sunset' }],
  },
  twitter: { card: 'summary_large_image', title: 'Brian Landauer', description, images: ['/og.jpg'] },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:bg-white focus:px-3 focus:py-2 focus:text-sm">
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
