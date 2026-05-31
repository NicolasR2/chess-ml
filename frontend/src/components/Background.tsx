import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import { useSettings } from '../context/SettingsContext'

// Soft emerald orbs. IDLE: slow, calm drift + breathing (both directions).
// ON CLICK (menu or board move): a brief fast burst, then they settle again.
type Orb = {
  size: number
  color: string
  top: string
  left: string
  dx: number
  dy: number
  smin: number
  smax: number
  grow: boolean
  dur: number // idle cycle length (seconds) — large = calm
  delay: number
}

const ORBS: Orb[] = [
  { size: 440, color: 'rgba(25,195,125,0.40)', top: '-6%', left: '-6%', dx: 560, dy: 320, smin: 0.45, smax: 1.7, grow: true, dur: 24, delay: 0 },
  { size: 360, color: 'rgba(92,240,160,0.32)', top: '40%', left: '68%', dx: -600, dy: -300, smin: 0.4, smax: 1.7, grow: false, dur: 27, delay: 0.6 },
  { size: 520, color: 'rgba(10,125,79,0.38)', top: '56%', left: '-4%', dx: 520, dy: -380, smin: 0.5, smax: 1.6, grow: true, dur: 30, delay: 0.3 },
  { size: 300, color: 'rgba(92,240,160,0.30)', top: '4%', left: '58%', dx: -520, dy: 420, smin: 0.35, smax: 1.8, grow: false, dur: 21, delay: 1 },
  { size: 420, color: 'rgba(25,195,125,0.30)', top: '24%', left: '30%', dx: 440, dy: 380, smin: 0.5, smax: 1.6, grow: true, dur: 26, delay: 0.8 },
  { size: 360, color: 'rgba(60,220,150,0.28)', top: '68%', left: '52%', dx: -480, dy: -420, smin: 0.4, smax: 1.7, grow: false, dur: 23, delay: 0.4 },
]

// roam through several spread-out points (not a simple there-and-back)
function roam(d: number) {
  return [0, d, -d * 0.8, d * 0.5, 0]
}

function OrbView({ o, anim, boost }: { o: Orb; anim: boolean; boost: number }) {
  const controls = useAnimationControls()
  const idleScale = o.grow
    ? [o.smin, o.smax, o.smin, o.smax, o.smin]
    : [o.smax, o.smin, o.smax, o.smin, o.smax]

  const startIdle = () =>
    controls.start(
      { x: roam(o.dx), y: roam(o.dy), scale: idleScale, opacity: [0.4, 0.95, 0.55, 0.9, 0.4] },
      { duration: o.dur, repeat: Infinity, ease: [0.45, 0, 0.55, 1], delay: o.delay },
    )

  // idle loop (and react to the animations toggle)
  useEffect(() => {
    if (anim) startIdle()
    else controls.start({ x: 0, y: 0, scale: 1, opacity: 0.85 }, { duration: 0.4 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim])

  // burst on each click, then settle back into the calm idle loop
  useEffect(() => {
    if (!anim || boost === 0) return
    let cancelled = false
    ;(async () => {
      await controls.start(
        { x: [null, o.dx * 0.5, 0], y: [null, o.dy * 0.5, 0], scale: [null, 1.7, 1], opacity: [null, 1, 0.7] },
        { duration: 0.7, ease: 'easeOut' },
      )
      if (!cancelled) startIdle()
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boost])

  return (
    <motion.div
      initial={{ scale: o.grow ? o.smin : o.smax, opacity: 0.6 }}
      animate={controls}
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
}

export function Background() {
  const { settings } = useSettings()
  const anim = settings.animations
  const nextId = useRef(0)
  const [boost, setBoost] = useState(0)
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])

  useEffect(() => {
    if (!anim) return
    const onDown = (e: PointerEvent) => {
      const id = nextId.current++
      setRipples((rs) => [...rs, { id, x: e.clientX, y: e.clientY }])
      window.setTimeout(() => setRipples((rs) => rs.filter((r) => r.id !== id)), 900)
      setBoost((b) => b + 1) // triggers the fast burst in every orb
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [anim])

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {ORBS.map((o, i) => (
        <OrbView key={i} o={o} anim={anim} boost={boost} />
      ))}

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
