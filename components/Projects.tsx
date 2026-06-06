'use client'
import { motion } from 'framer-motion'
import { projects } from '@/data/content'

const statusColors: Record<string, string> = {
  'live': '#3B6D11',
  'in progress': '#854F0B',
  'archived': '#888884',
}

export default function Projects() {
  return (
    <section
      id="projects"
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
        Projects
      </motion.p>

      <div>
        {projects.map((project, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="project-row"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'start',
              padding: '28px 0',
              borderBottom: '1px solid #e8e8e4',
              gap: '24px',
              cursor: project.url && project.url !== '#' ? 'pointer' : 'default',
              transition: 'opacity 0.2s',
            }}
            onClick={() => project.url && project.url !== '#' && window.open(project.url, '_blank')}
            onMouseEnter={e => { if (project.url && project.url !== '#') (e.currentTarget as HTMLDivElement).style.opacity = '0.6' }}
            onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.opacity = '1')}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: '#888884', fontWeight: 300 }}>{project.year}</span>
                {project.status && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 500,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: statusColors[project.status] || '#888884',
                  }}>
                    {project.status}
                  </span>
                )}
              </div>
              <h3 style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: '24px',
                letterSpacing: '-0.01em',
                color: '#1a1a18',
                marginBottom: '6px',
              }}>
                {project.name}
              </h3>
              <p style={{ fontSize: '13px', color: '#888884', fontWeight: 300, maxWidth: '480px' }}>
                {project.desc}
              </p>
            </div>
            <span className="project-arrow" style={{ fontSize: '20px', color: '#888884', marginTop: '4px' }}>↗</span>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
