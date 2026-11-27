'use client'
import Image from 'next/image'
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
            sizes="(max-width: 859px) 100vw, 420px"
            quality={75}
            style={{ objectFit: 'cover', objectPosition: 'top' }}
          />
        ) : (
          <span className="project-fallback" aria-hidden="true">{project.name.trim()[0]}</span>
        )}
      </span>
      <span className="project-meta">
        <h2 className="project-name"><span>{project.name}</span></h2>
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
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <div className="project-card">{inner}</div>
      )}
    </motion.li>
  )
}

export default function Projects() {
  return (
    <ul className="project-grid">
      {projects.map((p, i) => <ProjectCard key={p.name} project={p} i={i} />)}
    </ul>
  )
}
