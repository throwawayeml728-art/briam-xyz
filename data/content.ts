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
  image?: string               // optional preview, e.g. /projects/my-app.webp (3:2)
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
//     url: 'https://example.com',          // optional; whole card becomes a link
//     status: 'in progress',               // optional; plain text, only if meaningful
//     image: '/projects/my-app.webp',      // optional preview, shown 3:2 (cropped from top); 1440x900 WebP in /public/projects
//   },
// Each project renders as a card: preview, name, year, description. The whole card links to url if set.
// Entries without an image get a typographic fallback tile (large initial) automatically.
export const projects: Project[] = [
  {
    name: 'Dog Thanksgiving NYC',
    desc: 'A five-course, dog-safe Thanksgiving tasting menu in New York City.',
    year: '2026',
    url: 'https://dogsgivin3g.vercel.app',
    image: '/projects/dogsgivin3g.webp',
  },
  {
    name: 'Meridian',
    desc: 'A map quiz for learning where every country is.',
    year: '2026',
    url: 'https://mapquiz-meridian.vercel.app',
    image: '/projects/meridian.webp',
  },
  {
    name: 'Biblical Map',
    desc: 'An interactive map of biblical characters, studies and books across time periods.',
    year: '2026',
    url: 'https://biblical-map-sigma.vercel.app',
    image: '/projects/biblical-map.webp',
  },
]

// ─── PHOTOS ──────────────────────────────────────────────────────────
// Photos live in data/photos.json — manage them at /admin/photos
