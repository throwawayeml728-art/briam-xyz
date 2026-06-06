'use client'

import { motion } from 'framer-motion'
import { clippings } from '@/data/content'
import ClippingCard from '@/components/ClippingCard'

export default function CoolStuffGallery() {
  return (
    <section
      id="cool-stuff"
      className="site-section"
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        borderBottom: '1px solid #e8e8e4',
      }}
    >
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        style={{
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#888884',
          marginBottom: '48px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e8e8e4',
        }}
      >
        Cool stuff
      </motion.p>

      <div className="clippings-grid">
        {clippings.map((clipping, i) => (
          <ClippingCard key={clipping.slug} clipping={clipping} index={i} />
        ))}
      </div>
    </section>
  )
}
