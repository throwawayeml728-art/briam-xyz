import type { Photo } from '@/data/content'

export function sortPhotosByWarmth(photos: Photo[]): Photo[] {
  return [...photos].sort((a, b) => (b.warmth ?? 0) - (a.warmth ?? 0))
}

export function shufflePhotos(photos: Photo[], seed: number): Photo[] {
  const result = [...photos]
  let state = seed >>> 0

  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

export function orderPhotos(
  photos: Photo[],
  colorSort: boolean,
  shuffleSeed: number,
): Photo[] {
  if (colorSort) return sortPhotosByWarmth(photos)
  return shufflePhotos(photos, shuffleSeed)
}
