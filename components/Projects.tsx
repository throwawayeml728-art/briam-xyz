'use client'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { projects, type Project } from '@/data/content'

const statusColors: Record<string, string> = {
  live: '#3B6D11',
  'in progress': '#854F0B',
  archived: '#888884',
}

function ProjectRow({ project, i }: { project: Project; i: number }) {
  const body = (
    <>
      {project.image && (
        <div className="project-thumb">
          <Image src={project.image} alt={project.name} fill sizes="160px" style={{ objectFit: 'cover' }} />
        </div>
      )}
      <div className="project-main">
        <div className="project-meta">
          <span className="project-year">{project.year}</span>
          {project.status && (
            <span className="project-status" style={{ color: statusColors[project.status] || '#888884' }}>
              <span className="project-dot" style={{ background: statusColors[project.status] || '#888884' }} />
              {project.status}
            </span>
          )}
        </div>
        <h3 className="project-name">{project.name}</h3>
        <p className="project-desc">{project.desc}</p>
        {project.tags && project.tags.length > 0 && (
          <ul className="project-tags">
            {project.tags.map(t => <li key={t}>{t}</li>)}
          </ul>
        )}
      </div>
      {project.url && <span className="project-arrow" aria-hidden="true">↗</span>}
    </>
  )

  return (
    <motion.li
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: Math.min(i, 5) * 0.08 }}
      style={{ listStyle: 'none' }}
    >
      {project.url ? (
        <a href={project.url} target="_blank" rel="noopener noreferrer" className="project-row project-row--link">
          {body}
        </a>
      ) : (
        <div className="project-row">{body}</div>
      )}
    </motion.li>
  )
}

export default function Projects() {
  return (
    <section
      id="projects"
      className="site-section"
      style={{ maxWidth: '1100px', margin: '0 auto', borderBottom: '1px solid #e8e8e4' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e8e8e4' }}
      >
        <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888884', margin: 0 }}>
          Projects
        </p>
        <p style={{ fontSize: '14px', fontWeight: 300, color: '#888884', margin: '10px 0 0' }}>
          Apps I&rsquo;ve built with AI.
        </p>
      </motion.div>

      <ul style={{ margin: 0, padding: 0 }}>
        {projects.map((p, i) => <ProjectRow key={p.name} project={p} i={i} />)}
      </ul>
    </section>
  )
}
