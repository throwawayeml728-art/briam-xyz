'use client'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { projects, type Project } from '@/data/content'

function ProjectCard({ project, i }: { project: Project; i: number }) {
  const inner = (
    <>
      <span className="project-preview">
        {project.image ? (
          <Image
            src={project.image}
            alt={`Preview of ${project.name}`}
            fill
            sizes="(max-width: 639px) 100vw, (max-width: 999px) 50vw, 350px"
            quality={75}
            style={{ objectFit: 'cover', objectPosition: 'top' }}
          />
        ) : (
          <span className="project-fallback" aria-hidden="true">{project.name.trim()[0]}</span>
        )}
      </span>
      <span className="project-meta">
        <h3 className="project-name"><span>{project.name}</span></h3>
        <span className="project-year">{project.year}</span>
      </span>
      <p className="project-desc">{project.desc}</p>
    </>
  )
  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: Math.min(i, 5) * 0.06 }}
    >
      {project.url ? (
        <a href={project.url} target="_blank" rel="noopener noreferrer" className="project-card project-card--link">
          {inner}
        </a>
      ) : (
        <div className="project-card">{inner}</div>
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
      <ul className="project-grid">
        {projects.map((p, i) => <ProjectCard key={p.name} project={p} i={i} />)}
      </ul>
    </section>
  )
}
