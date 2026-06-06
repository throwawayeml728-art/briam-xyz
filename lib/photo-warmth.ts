import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import type { Photo } from '@/data/content'

function pixelWarmth(r: number, g: number, b: number): number | null {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const sat = max === 0 ? 0 : (max - min) / max
  if (sat < 0.08) return null

  let h: number
  if (max === min) h = 0
  else {
    const d = max - min
    if (max === r) h = 60 * (((g - b) / d) % 6)
    else if (max === g) h = 60 * ((b - r) / d + 2)
    else h = 60 * ((r - g) / d + 4)
    if (h < 0) h += 360
  }

  const warmAngle = 25
  const diff = Math.abs(((h - warmAngle + 180) % 360) - 180)
  const hueWarmth = 180 - diff
  return hueWarmth * (0.4 + sat) + (r - b) * 0.15
}

export async function analyzePhotoWarmth(filePath: string): Promise<number> {
  const { data, info } = await sharp(filePath)
    .resize(120, 120, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  let sum = 0
  let n = 0

  for (let y = 0; y < height; y++) {
    const yWeight = y / height > 0.2 ? 1.4 : 0.5
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3
      const warmth = pixelWarmth(data[i], data[i + 1], data[i + 2])
      if (warmth !== null) {
        sum += warmth * yWeight
        n += yWeight
      }
    }
  }

  return n > 0 ? sum / n : 0
}

export async function analyzePhotoWarmthFromSrc(src: string): Promise<number> {
  const filePath = path.join(process.cwd(), 'public', src.replace(/^\//, ''))
  if (!fs.existsSync(filePath)) return 0
  return analyzePhotoWarmth(filePath)
}

export async function withWarmth(photo: Photo): Promise<Photo> {
  if (photo.warmth !== undefined) return photo
  const warmth = await analyzePhotoWarmthFromSrc(photo.src)
  return { ...photo, warmth: Math.round(warmth * 10) / 10 }
}
