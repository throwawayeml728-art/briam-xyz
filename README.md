# fifthdegree.xyz

Personal portfolio site for Brian Landauer. Built with Next.js 14, Tailwind CSS, and Framer Motion.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Editing content

**Everything you need to edit lives in one file: `data/content.ts`**

- Add a new clipping → add an entry to `clippings[]` in `data/content.ts`
- Add a project → add an entry to `projects[]`
- Add photos → use the admin UI at `/admin/photos` (or edit `data/photos.json` directly)

No design knowledge needed. The site re-renders automatically.

## Managing photos

Go to [http://localhost:3000/admin/photos](http://localhost:3000/admin/photos) to upload or delete photos.

1. Copy `.env.local.example` to `.env.local` and set `PHOTO_ADMIN_PASSWORD`
2. Drag photos onto the upload zone (or click to browse)
3. Optionally add a caption before uploading
4. Delete photos with the button on each thumbnail

**Local dev:** uploads save to `public/photos/` and update `data/photos.json`. Commit and push those changes to deploy.

**Note:** On Vercel, the admin UI won't persist uploads to disk (serverless). Use it locally, then commit the new files. Cloudinary integration can be added later for in-browser production uploads.

## Adding photos (manual / Cloudinary)

1. Create a free account at [cloudinary.com](https://cloudinary.com)
2. Upload your photos to the Media Library
3. Copy the URL (format: `https://res.cloudinary.com/YOUR_CLOUD/image/upload/...`)
4. Paste it into the `src` field in `data/content.ts`

## Deploying to Vercel

```bash
npm install -g vercel
vercel
```

Then in Vercel dashboard → Settings → Domains → add `fifthdegree.xyz`.
Point your domain's DNS to Vercel's nameservers (or add an A record).

## Stack

- **Next.js 14** — App Router
- **Framer Motion** — scroll-triggered animations
- **Tailwind CSS** — utility styling
- **Cloudinary** — photo hosting (free tier: 25GB)
- **Vercel** — deployment
