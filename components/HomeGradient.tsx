'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'

const BLOBS = [
  { wrap: 'sky', blob: 'sky', x: 120, y: 90 },
  { wrap: 'azure', blob: 'azure', x: 180, y: 140 },
  { wrap: 'cyan', blob: 'cyan', x: 150, y: 120 },
  { wrap: 'glow', blob: 'glow', x: 220, y: 180 },
  { wrap: 'deep', blob: 'deep', x: 60, y: 45 },
] as const

function BlobLayer({
  wrap,
  blob,
  springX,
  springY,
  strengthX,
  strengthY,
}: {
  wrap: string
  blob: string
  springX: MotionValue<number>
  springY: MotionValue<number>
  strengthX: number
  strengthY: number
}) {
  const x = useTransform(springX, [-0.5, 0.5], [-strengthX, strengthX])
  const y = useTransform(springY, [-0.5, 0.5], [-strengthY, strengthY])

  return (
    <motion.div
      className={`home-gradient-blob-wrap home-gradient-blob-wrap--${wrap}`}
      style={{ x, y }}
    >
      <div className={`home-gradient-blob home-gradient-blob--${blob}`} />
    </motion.div>
  )
}

export default function HomeGradient() {
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const ambientRef = useRef({ x: 0, y: 0 })
  const manualRef = useRef({ x: 0, y: 0 })

  const springX = useSpring(pointerX, { stiffness: 50, damping: 18, mass: 0.6 })
  const springY = useSpring(pointerY, { stiffness: 50, damping: 18, mass: 0.6 })

  const setPointer = useCallback((clientX: number, clientY: number) => {
    manualRef.current = {
      x: clientX / window.innerWidth - 0.5,
      y: clientY / window.innerHeight - 0.5,
    }
    pointerX.set(manualRef.current.x + ambientRef.current.x)
    pointerY.set(manualRef.current.y + ambientRef.current.y)
  }, [pointerX, pointerY])

  const resetPointer = useCallback(() => {
    manualRef.current = { x: 0, y: 0 }
    pointerX.set(ambientRef.current.x)
    pointerY.set(ambientRef.current.y)
  }, [pointerX, pointerY])

  useEffect(() => {
    let frame = 0
    let raf = 0

    const tick = () => {
      frame += 1
      const t = frame / 60
      ambientRef.current = {
        x: Math.sin(t * 0.35) * 0.14,
        y: Math.cos(t * 0.28) * 0.12,
      }
      pointerX.set(manualRef.current.x + ambientRef.current.x)
      pointerY.set(manualRef.current.y + ambientRef.current.y)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [pointerX, pointerY])

  useEffect(() => {
    const onMove = (e: MouseEvent) => setPointer(e.clientX, e.clientY)
    const onTouch = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (touch) setPointer(touch.clientX, touch.clientY)
    }
    const onLeave = () => resetPointer()

    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('mouseout', onLeave)
    window.addEventListener('touchend', onLeave)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('mouseout', onLeave)
      window.removeEventListener('touchend', onLeave)
    }
  }, [setPointer, resetPointer])

  return (
    <main className="home-gradient-page">
      <div className="home-gradient" aria-hidden="true">
        {BLOBS.map(({ wrap, blob, x, y }) => (
          <BlobLayer
            key={wrap}
            wrap={wrap}
            blob={blob}
            springX={springX}
            springY={springY}
            strengthX={x}
            strengthY={y}
          />
        ))}
      </div>

      <div className="home-gradient-grain" aria-hidden="true">
        <svg width="100%" height="100%" preserveAspectRatio="none">
          <filter id="home-noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="4"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#home-noise)" />
        </svg>
      </div>
    </main>
  )
}
