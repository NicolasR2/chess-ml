import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import { useSettings } from '../context/SettingsContext'

// Large, ultra-soft emerald orbs that roam across the screen, breathe in BOTH
// directions (some grow, some shrink) and react to user clicks. Controlled by
// the in-app "Animaciones" toggle.
type Orb = {
  size: number
  color: string
  top: string
  left: string
  dx: number
  dy: number
  smin: number
  smax: number
  grow: boolean // true: small->big->...  false: big->small->... (reverse)
  dur: number
  delay: number
}

const ORBS: Orb[] = [
  { size: 560, color: 'rgba(25,195,125,0.38)', top: '-10%', left: '-8%', dx: 240, dy: 170, smin: 0.35, smax: 1.95, grow: true, dur: 5, delay: 0 },
  { size: 460, color: 'rgba(92,240,160,0.30)', top: '42%', left: '70%', dx: -260, dy: -140, smin: 0.3, smax: 1.9, grow: false, dur: 4.5, delay: 0.6 },
  { size: 640, color: 'rgba(10,125,79,0.36)', top: '58%', left: '-4%', dx: 220, dy: -200, smin: 0.4, smax: 1.8, grow: true, dur: 6, delay: 0.3 },
  { size: 380, color: 'rgba(92,240,160,0.28)', top: '2%', left: '60%', dx: -210, dy: 220, smin: 0.25, smax: 2.0, grow: false, dur: 4, delay: 1 },
  { size: 520, color: 'rgba(25,195,125,0.28)', top: '26%', left: '32%', dx: 180, dy: 180, smin: 0.4, smax: 1.85, grow: true, dur: 5.5, delay: 0.8 },
  { size: 440, color: 'rgba(60,220,150,0.26)', top: '70%', left: '55%', dx: -190, dy: -200, smin: 0.35, smax: 1.9, grow: false, dur: 4.8, delay: 0.4 },
]

// roam through several points instead of a simple there-and-back
function roam(d: number) {
  return [0, d, -d * 0.7, d * 0.45, 0]
}

export function Background() {
  const { settings } = useSettings()
  const anim = settings.animations
  const field = useAnimationControls()
  const nextId = useRef(0)
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])

  useEffect(() => {
    if (!anim) return
    const onDown = (e: PointerEvent) => {
      const id = nextId.current++
      setRipples((rs) => [...rs, { id, x: e.clientX, y: e.clientY }])
      window.setTimeout(() => setRipples((rs) => rs.filter((r) => r.id !== id)), 900)
      // whole orb field reacts with a quick pop
      field.start({ scale: [1, 1.18, 1], transition: { duration: 0.6, ease: 'easeOut' } })
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [anim, field])

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <motion.div animate={field} style={{ position: 'absolute', inset: 0 }}>
        {ORBS.map((o, i) => {
          const scale = o.grow
            ? [o.smin, o.smax, o.smin, o.smax, o.smin]
            : [o.smax, o.smin, o.smax, o.smin, o.smax]
          return (
            <motion.div
              key={i}
              initial={{ scale: o.grow ? o.smin : o.smax, opacity: 0.6 }}
              animate={
                anim
                  ? { x: roam(o.dx), y: roam(o.dy), scale, opacity: [0.35, 1, 0.5, 0.95, 0.35] }
                  : { scale: 1, opacity: 0.85 }
              }
              transition={{ duration: o.dur, repeat: anim ? Infinity : 0, ease: [0.45, 0, 0.55, 1], delay: o.delay }}
              style={{
                position: 'absolute',
                top: o.top,
                left: o.left,
                width: o.size,
                height: o.size,
                borderRadius: '50%',
                background: `radial-gradient(circle at 50% 50%, ${o.color} 0%, ${o.color} 18%, transparent 72%)`,
                filter: 'blur(90px)',
                willChange: 'transform, opacity',
              }}
            />
          )
        })}
      </motion.div>

      <AnimatePresence>
        {ripples.map((r) => (
          <motion.div
            key={r.id}
            initial={{ scale: 0, opacity: 0.55 }}
            animate={{ scale: 1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: r.x,
              top: r.y,
              width: 360,
              height: 360,
              marginLeft: -180,
              marginTop: -180,
              borderRadius: '50%',
              border: '2px solid var(--accent)',
              boxShadow: '0 0 40px var(--accent-glow)',
              filter: 'blur(2px)',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
