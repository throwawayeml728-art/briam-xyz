// ─────────────────────────────────────────────────────────────────────
// EDIT THIS FILE to update the site content.
// No design knowledge needed — just add/edit entries below.
// ─────────────────────────────────────────────────────────────────────

export type Project = {
  name: string
  desc: string
  year: string                 // e.g. "2025" or "2025–"
  url?: string                 // omit if there is nothing to link to yet
  status?: 'in progress'       // optional; shown as plain text only when meaningful
  image?: string               // optional screenshot, shown on hover (desktop) / below row (mobile)
}

export type Photo = {
  src: string        // Cloudinary URL or local /public path
  alt: string
  ratio?: string     // e.g. "3/4", "4/3", "1/1"
  location?: string
  warmth?: number    // used for warm→cool sorting
}

// ─── SITE CONFIG ─────────────────────────────────────────────────────
export const siteConfig = {
  name: 'Brian Landauer',
  tagline: 'Builder, photographer, curious person.',
  location: 'New York City',
  domain: 'fifthdegree.xyz',
  url: 'https://fifthdegree.xyz',
  email: 'hello@fifthdegree.xyz',
  social: {
    linkedin: 'https://linkedin.com/in/brian-landauer',
    luma: 'https://luma.com/user/usr-Eh8dQi5q7sejAW6',
  },
}

// ─── PROJECTS ────────────────────────────────────────────────────────
// To add a project, copy an entry and paste it at the TOP (newest first).
// Only name, desc and year are required:
//   {
//     name: 'My App',
//     desc: 'One sentence about what it does.',
//     year: '2026',                        // or '2025–' for ongoing
//     url: 'https://example.com',          // optional; row becomes a link
//     status: 'in progress',               // optional; plain text, only if meaningful
//     image: '/projects/my-app.webp',      // optional screenshot (3:2 works best) in /public/projects
//   },
// Entries without an image render as a clean typographic row.
export const projects: Project[] = [
  {
    name: 'FrameCoach',
    desc: 'AI-powered iPhone app for real-time photography composition coaching.',
    year: '2025–',
    status: 'in progress',
  },
  {
    name: 'NYC Thirdspace Community',
    desc: 'A tradfi-crypto bridge community rooted in the Thirdspace concept.',
    year: '2025',
    url: 'https://luma.com/user/usr-Eh8dQi5q7sejAW6',
  },
  {
    name: 'World Map Explorer',
    desc: 'Interactive world map with country exploration and quiz features. Built with Next.js.',
    year: '2025',
  },
]

// ─── PHOTOS ──────────────────────────────────────────────────────────
// Photos live in data/photos.json — manage them at /admin/photos
