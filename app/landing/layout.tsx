import type { Metadata, Viewport } from 'next'
import { Inter_Tight, Libre_Baskerville } from 'next/font/google'
import './landing.css'

const sans = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--landing-sans',
})

const serif = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--landing-serif',
})

const description = 'Brian Landauer, based in New York City.'

export const viewport: Viewport = {
  themeColor: '#f6f5f3',
}

export const metadata: Metadata = {
  title: { absolute: 'Brian Landauer' },
  description,
  openGraph: {
    title: 'Brian Landauer',
    description,
    url: 'https://fifthdegree.xyz/landing',
    siteName: 'Brian Landauer',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Brian Landauer',
    description,
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${sans.variable} ${serif.variable}`}>{children}</div>
}
