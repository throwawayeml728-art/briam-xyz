import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'
import { PhotoZoomProvider } from '@/components/PhotoZoomProvider'

export const metadata: Metadata = {
  title: 'Brian Landauer',
  description: 'Builder, photographer, curious person. Based in New York City.',
  openGraph: {
    title: 'Brian Landauer',
    description: 'Builder, photographer, curious person. Based in New York City.',
    url: 'https://fifthdegree.xyz',
    siteName: 'Brian Landauer',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PhotoZoomProvider>
          <Nav />
          {children}
        </PhotoZoomProvider>
      </body>
    </html>
  )
}
