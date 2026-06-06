'use client'

import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import type { Clipping } from '@/data/content'

type ClippingCardProps = {
  clipping: Clipping
  index: number
}

export default function ClippingCard({ clipping, index }: ClippingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 300, damping: 30 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  const tilt = index % 3 === 0 ? -1.2 : index % 3 === 1 ? 0.8 : -0.4

  return (
    <motion.div
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      style={{ breakInside: 'avoid', marginBottom: '16px', width: '100%' }}
    >
      <Link href={`/cool-stuff/${clipping.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{ perspective: 800 }}>
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              rotateX,
              rotateY,
              rotate: tilt,
              transformStyle: 'preserve-3d',
            }}
            whileHover={{ scale: 1.03, rotate: 0, zIndex: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
          <div
            className="clipping-card"
            style={{
              background: '#fff',
              borderRadius: '6px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(26,26,24,0.06), 0 4px 12px rgba(26,26,24,0.04)',
              transition: 'box-shadow 0.3s ease',
            }}
          >
            <div style={{ position: 'relative', aspectRatio: clipping.ratio || '4/3' }}>
              <Image
                src={clipping.image}
                alt={clipping.title}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                style={{ objectFit: 'cover' }}
              />
            </div>
            <div style={{ padding: '14px 16px 16px' }}>
              <p style={{
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#888884',
                marginBottom: '4px',
              }}>
                {clipping.tag}
              </p>
              <h3 style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: '17px',
                lineHeight: 1.25,
                color: '#1a1a18',
                margin: 0,
              }}>
                {clipping.title}
              </h3>
            </div>
          </div>
          </motion.div>
        </div>
      </Link>
    </motion.div>
  )
}
