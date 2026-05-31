import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import { useSettings } from '../context/SettingsContext'

// Soft emerald orbs that roam far across the screen, breathe in BOTH directions
// (some grow, some shrink) and react to every user click (menu, board moves, etc.).
// Controlled by the in-app "Animaciones" toggle.
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
  { size: 440, color: 'rgba(25,195,125,0.40)', top: '-6%', left: '-6%', dx: 620, dy: 360, smin: 0.35, smax: 1.95, grow: true, dur: 6, delay: 0 },
  { size: 360, color: 'rgba(92,240,160,0.32)', top: '40%', left: '68%', dx: -680, dy: -320, smin: 0.3, smax: 1.9, grow: false, dur: 7, delay: 0.5 },
  { size: 520, color: 'rgba(10,125,79,0.38)', top: '56%', left: '-4%', dx: 560, dy: -420, smin: 0.4, smax: 1.85, grow: true, dur: 8, delay: 0.3 },
  { size: 300, color: 'rgba(92,240,160,0.30)', top: '4%', left: '58%', dx: -560, dy: 460, smin: 0.25, smax: 2.0, grow: false, dur: 5.5, delay: 1 },
  { size: 420, color: 'rgba(25,195,125,0.30)', top: '24%', left: '30%', dx: 480, dy: 420, smin: 0.4, smax: 1.85, grow: true, dur: 7.5, delay: 0.8 },
  { size: 360, color: 'rgba(60,220,150,0.28)', top: '68%', left: '52%', dx: -520, dy: -460, smin: 0.35, smax: 1.95, grow: false, dur: 6.5, delay: 0.4 },
]

// roam through several spread-out points (not a simple there-and-back)
function roam(d: number) {
  return [0, d, -d * 0.8, d * 0.5, 0]
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
      // whole orb field reacts with a quick pop on every click
      field.start({ scale: [1, 1.22, 1], transition: { duration: 0.55, ease: 'easeOut' } })
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [anim, field])

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <motion.div animate={field} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
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
                  ? { x: roam(o.dx), y: roam(o.dy), scale, opacity: [0.4, 1, 0.55, 0.95, 0.4] }
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
                background: `radial-gradient(circle at 50% 50%, ${o.color} 0%, ${o.color} 16%, transparent 72%)`,
                filter: 'blur(80px)',
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
              width: 380,
              height: 380,
              marginLeft: -190,
              marginTop: -190,
              borderRadius: '50%',
              border: '2px solid var(--accent)',
              boxShadow: '0 0 50px var(--accent-glow)',
              filter: 'blur(2px)',
              pointerEvents: 'none',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
