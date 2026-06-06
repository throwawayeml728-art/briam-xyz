'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Photo } from '@/data/content'

const PASSWORD_KEY = 'photo-admin-password'

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export default function AdminPhotosPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [altText, setAltText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const authHeaders = useCallback((pw: string) => ({
    'x-admin-password': pw,
  }), [])

  const verifyPassword = useCallback(async (pw: string) => {
    const res = await fetch('/api/photos', {
      method: 'PUT',
      headers: authHeaders(pw),
    })
    return res.ok
  }, [authHeaders])

  const loadPhotos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/photos')
      if (res.ok) setPhotos(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const stored = sessionStorage.getItem(PASSWORD_KEY)
    if (!stored) {
      setChecking(false)
      return
    }
    verifyPassword(stored).then(ok => {
      if (ok) {
        setPassword(stored)
        setAuthed(true)
        loadPhotos()
      } else {
        sessionStorage.removeItem(PASSWORD_KEY)
      }
      setChecking(false)
    })
  }, [verifyPassword, loadPhotos])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const ok = await verifyPassword(password)
    if (!ok) {
      setMessage('Wrong password')
      return
    }
    sessionStorage.setItem(PASSWORD_KEY, password)
    setAuthed(true)
    loadPhotos()
  }

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (list.length === 0) return

    setUploading(true)
    setMessage(null)

    try {
      for (const file of list) {
        const { width, height } = await getImageDimensions(file)
        const form = new FormData()
        form.append('file', file)
        form.append('alt', altText || file.name.replace(/\.[^.]+$/, ''))
        form.append('width', String(width))
        form.append('height', String(height))

        const res = await fetch('/api/photos', {
          method: 'POST',
          headers: authHeaders(password),
          body: form,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Upload failed')
        }
      }

      setAltText('')
      await loadPhotos()
      setMessage(`Uploaded ${list.length} photo${list.length > 1 ? 's' : ''}`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (src: string, alt: string) => {
    if (!confirm(`Delete "${alt}"? This removes the file permanently.`)) return

    setMessage(null)
    const res = await fetch('/api/photos', {
      method: 'DELETE',
      headers: { ...authHeaders(password), 'Content-Type': 'application/json' },
      body: JSON.stringify({ src }),
    })

    if (!res.ok) {
      setMessage('Delete failed')
      return
    }

    setPhotos(prev => prev.filter(p => p.src !== src))
    setMessage('Photo deleted')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (uploading) return
    uploadFiles(e.dataTransfer.files)
  }

  if (checking) {
    return (
      <main className="admin-page">
        <p className="admin-muted">Loading…</p>
      </main>
    )
  }

  if (!authed) {
    return (
      <main className="admin-page">
        <div className="admin-card">
          <h1 className="admin-title">Photo admin</h1>
          <p className="admin-muted">Enter your admin password to upload or delete photos.</p>
          <form onSubmit={handleLogin} className="admin-form">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="admin-input"
              autoFocus
            />
            <button type="submit" className="admin-btn admin-btn--primary">
              Sign in
            </button>
          </form>
          {message && <p className="admin-error">{message}</p>}
          <Link href="/photos" className="admin-link">← Back to gallery</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Photo admin</h1>
          <p className="admin-muted">{photos.length} photos · changes save to disk locally</p>
        </div>
        <div className="admin-header-actions">
          <Link href="/photos" className="admin-link">View gallery</Link>
          <button
            type="button"
            className="admin-btn"
            onClick={() => {
              sessionStorage.removeItem(PASSWORD_KEY)
              setAuthed(false)
              setPassword('')
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <section
        className={`admin-dropzone${dragOver ? ' admin-dropzone--active' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={e => e.target.files && uploadFiles(e.target.files)}
        />
        {uploading ? (
          <p>Uploading…</p>
        ) : (
          <>
            <p className="admin-dropzone-title">Drop photos here or click to browse</p>
            <p className="admin-muted">PNG, JPG, WebP · added to top of gallery</p>
          </>
        )}
      </section>

      <div className="admin-upload-meta">
        <label className="admin-label">
          Caption (optional, applies to next upload)
          <input
            type="text"
            value={altText}
            onChange={e => setAltText(e.target.value)}
            placeholder="e.g. Monument Valley at dawn"
            className="admin-input"
          />
        </label>
      </div>

      {message && <p className="admin-message">{message}</p>}

      {loading ? (
        <p className="admin-muted">Loading photos…</p>
      ) : (
        <div className="admin-grid">
          {photos.map(photo => (
            <div key={photo.src} className="admin-photo-card">
              <div className="admin-photo-thumb" style={{ aspectRatio: photo.ratio || '3/4' }}>
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="200px"
                  className="admin-photo-image"
                />
                <button
                  type="button"
                  className="admin-photo-delete"
                  aria-label={`Delete ${photo.alt}`}
                  onClick={() => handleDelete(photo.src, photo.alt)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
