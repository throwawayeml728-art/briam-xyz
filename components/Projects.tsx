'use client'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { projects, type Project } from '@/data/content'

function ProjectItem({ project, i }: { project: Project; i: number }) {
  const note = project.status
  const inner = (
    <>
      <span className="project-year">{project.year}</span>
      <div>
        <h3 className="project-name"><span>{project.name}</span></h3>
        <p className="project-desc">{project.desc}</p>
      </div>
      {note && <span className="project-note">{note[0].toUpperCase() + note.slice(1)}</span>}
    </>
  )
  return (
    <motion.li
      className={`project-item${project.image ? ' project-item--image' : ''}`}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: Math.min(i, 5) * 0.06 }}
    >
      {project.url ? (
        <a href={project.url} target="_blank" rel="noopener noreferrer" className="project-row project-row--link">
          {inner}
        </a>
      ) : (
        <div className="project-row">{inner}</div>
      )}
      {project.image && (
        <span className="project-image" aria-hidden="true">
          <Image src={project.image} alt="" fill sizes="(max-width: 768px) 80vw, 240px" style={{ objectFit: 'cover' }} />
        </span>
      )}
    </motion.li>
  )
}

export default function Projects({ viewAllHref }: { viewAllHref?: string } = {}) {
  return (
    <section
      id="projects"
      className="site-section"
      style={{ maxWidth: '1100px', margin: '0 auto', borderBottom: '1px solid #e8e8e4' }}
    >
      <div
        style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid #e8e8e4' }}
      >
        <h2 style={{ fontSize: '14px', fontWeight: 400, letterSpacing: '-0.01em', textTransform: 'none', color: '#888884', margin: 0 }}>
          Projects
        </h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="home-link">All projects</Link>
        )}
      </div>
      <ul className="project-list">
        {projects.map((p, i) => <ProjectItem key={p.name} project={p} i={i} />)}
      </ul>
    </section>
  )
}
