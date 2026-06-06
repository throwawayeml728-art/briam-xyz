import fs from 'fs'
import path from 'path'
import type { Photo } from '@/data/content'

const PHOTOS_JSON = path.join(process.cwd(), 'data/photos.json')
const PHOTOS_DIR = path.join(process.cwd(), 'public/photos')

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

export function simplifyRatio(width: number, height: number): string {
  const g = gcd(width, height)
  return `${width / g}/${height / g}`
}

export function getPhotos(): Photo[] {
  const raw = fs.readFileSync(PHOTOS_JSON, 'utf8')
  return JSON.parse(raw) as Photo[]
}

export function savePhotos(photos: Photo[]): void {
  fs.writeFileSync(PHOTOS_JSON, `${JSON.stringify(photos, null, 2)}\n`)
}

export function addPhoto(photo: Photo): Photo {
  const photos = getPhotos()
  photos.unshift(photo)
  savePhotos(photos)
  return photo
}

export async function addPhotoWithWarmth(
  photo: Omit<Photo, 'warmth'>,
): Promise<Photo> {
  const { analyzePhotoWarmthFromSrc } = await import('@/lib/photo-warmth')
  const warmth = await analyzePhotoWarmthFromSrc(photo.src)
  const full: Photo = {
    ...photo,
    warmth: Math.round(warmth * 10) / 10,
  }
  return addPhoto(full)
}

export function removePhoto(src: string): boolean {
  const photos = getPhotos()
  const index = photos.findIndex(p => p.src === src)
  if (index === -1) return false

  photos.splice(index, 1)
  savePhotos(photos)

  if (src.startsWith('/photos/')) {
    const filePath = path.join(process.cwd(), 'public', src)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }

  return true
}

export function savePhotoFile(buffer: Buffer, ext: string): string {
  if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true })

  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const filename = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`
  const filePath = path.join(PHOTOS_DIR, filename)
  fs.writeFileSync(filePath, buffer)
  return `/photos/${filename}`
}

export function verifyAdminPassword(password: string | null): boolean {
  const secret = process.env.PHOTO_ADMIN_PASSWORD
  if (!secret) {
    return process.env.NODE_ENV === 'development'
  }
  return password === secret
}
