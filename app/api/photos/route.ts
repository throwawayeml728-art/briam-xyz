import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { addPhotoWithWarmth, getPhotos, removePhoto, savePhotoFile, simplifyRatio, verifyAdminPassword } from '@/lib/photos'
import { getAdminPassword, isAuthorized } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(getPhotos())
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const form = await request.formData()
    const file = form.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const alt = String(form.get('alt') || 'Photography').trim() || 'Photography'
    const width = Number(form.get('width'))
    const height = Number(form.get('height'))

    const ext = file.name.split('.').pop() || 'jpg'
    const buffer = Buffer.from(await file.arrayBuffer())
    const src = savePhotoFile(buffer, ext)

    const ratio = width > 0 && height > 0
      ? simplifyRatio(width, height)
      : '3/4'

    const photo = await addPhotoWithWarmth({ src, alt, ratio })
    revalidatePath('/photos')

    return NextResponse.json(photo, { status: 201 })
  } catch (error) {
    console.error('Photo upload failed:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { src } = await request.json()
  if (!src || typeof src !== 'string') {
    return NextResponse.json({ error: 'Missing src' }, { status: 400 })
  }

  const removed = removePhoto(src)
  if (!removed) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  revalidatePath('/photos')
  return NextResponse.json({ ok: true })
}

// For password check from admin UI
export async function PUT(request: NextRequest) {
  const password = getAdminPassword(request)
  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}
