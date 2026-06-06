import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { clippings, getClippingBySlug, getClippingIndex, siteConfig } from '@/data/content'

type PageProps = {
  params: { slug: string }
}

export function generateStaticParams() {
  return clippings.map(c => ({ slug: c.slug }))
}

export function generateMetadata({ params }: PageProps): Metadata {
  const clipping = getClippingBySlug(params.slug)
  if (!clipping) return { title: 'Not found' }

  return {
    title: `${clipping.title} · ${siteConfig.name}`,
    description: clipping.desc,
    openGraph: {
      title: clipping.title,
      description: clipping.desc,
      images: [{ url: clipping.image }],
    },
  }
}

export default function ClippingPage({ params }: PageProps) {
  const clipping = getClippingBySlug(params.slug)
  if (!clipping) notFound()

  const index = getClippingIndex(params.slug)
  const prev = index > 0 ? clippings[index - 1] : null
  const next = index < clippings.length - 1 ? clippings[index + 1] : null

  return (
    <main style={{ paddingTop: '60px' }}>
      <article
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '80px 48px 100px',
        }}
        className="clipping-detail"
      >
        <Link
          href="/cool-stuff"
          style={{
            display: 'inline-block',
            fontSize: '12px',
            color: '#888884',
            textDecoration: 'none',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '48px',
            transition: 'color 0.2s',
          }}
        >
          ← Back to cool stuff
        </Link>

        <div style={{ marginBottom: '32px' }}>
          <p style={{
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#888884',
            marginBottom: '12px',
          }}>
            {clipping.tag}{clipping.date ? ` · ${clipping.date}` : ''}
          </p>
          <h1 style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 'clamp(32px, 5vw, 48px)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: '#1a1a18',
            margin: 0,
          }}>
            {clipping.title}
          </h1>
        </div>

        <div
          style={{
            position: 'relative',
            aspectRatio: clipping.ratio || '4/3',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(26,26,24,0.06), 0 8px 24px rgba(26,26,24,0.06)',
            marginBottom: '40px',
          }}
        >
          <Image
            src={clipping.image}
            alt={clipping.title}
            fill
            priority
            sizes="720px"
            style={{ objectFit: 'cover' }}
          />
        </div>

        <p style={{
          fontSize: '16px',
          fontWeight: 300,
          color: '#1a1a18',
          lineHeight: 1.75,
          marginBottom: '32px',
        }}>
          {clipping.desc}
        </p>

        {clipping.sourceUrl && (
          <a
            href={clipping.sourceUrl}
            target={clipping.sourceUrl.startsWith('#') ? undefined : '_blank'}
            rel={clipping.sourceUrl.startsWith('#') ? undefined : 'noopener noreferrer'}
            style={{
              display: 'inline-block',
              fontSize: '13px',
              color: '#1a1a18',
              textDecoration: 'none',
              borderBottom: '1px solid #e8e8e4',
              paddingBottom: '2px',
              transition: 'border-color 0.2s',
            }}
          >
            View source ↗
          </a>
        )}

        <nav
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '80px',
            paddingTop: '32px',
            borderTop: '1px solid #e8e8e4',
            gap: '24px',
          }}
        >
          {prev ? (
            <Link
              href={`/cool-stuff/${prev.slug}`}
              style={{
                fontSize: '13px',
                color: '#888884',
                textDecoration: 'none',
                transition: 'color 0.2s',
                maxWidth: '45%',
              }}
            >
              ← {prev.title}
            </Link>
          ) : <span />}
          {next ? (
            <Link
              href={`/cool-stuff/${next.slug}`}
              style={{
                fontSize: '13px',
                color: '#888884',
                textDecoration: 'none',
                transition: 'color 0.2s',
                textAlign: 'right',
                maxWidth: '45%',
              }}
            >
              {next.title} →
            </Link>
          ) : <span />}
        </nav>
      </article>
    </main>
  )
}
