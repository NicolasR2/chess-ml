import { motion, useReducedMotion } from 'framer-motion'
import { useSettings } from '../context/SettingsContext'

// Slow-drifting, heavily-blurred emerald orbs behind all content.
type Orb = { size: number; color: string; top: string; left: string; dx: number; dy: number; dur: number }

const ORBS: Orb[] = [
  { size: 460, color: 'rgba(25,195,125,0.30)', top: '-8%', left: '-6%', dx: 80, dy: 60, dur: 26 },
  { size: 380, color: 'rgba(92,240,160,0.22)', top: '48%', left: '72%', dx: -90, dy: -50, dur: 32 },
  { size: 520, color: 'rgba(10,125,79,0.28)', top: '62%', left: '4%', dx: 70, dy: -70, dur: 38 },
  { size: 300, color: 'rgba(92,240,160,0.18)', top: '6%', left: '62%', dx: -60, dy: 80, dur: 30 },
  { size: 420, color: 'rgba(25,195,125,0.20)', top: '30%', left: '34%', dx: 55, dy: 55, dur: 44 },
]

export function Background() {
  const { settings } = useSettings()
  const reduce = useReducedMotion()
  const animate = settings.animations && !reduce
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {ORBS.map((o, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={animate ? { x: [0, o.dx, 0], y: [0, o.dy, 0], scale: [1, 1.12, 1] } : undefined}
          transition={{ duration: o.dur, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: o.top,
            left: o.left,
            width: o.size,
            height: o.size,
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 50%, ${o.color}, transparent 70%)`,
            filter: 'blur(60px)',
          }}
        />
      ))}
    </div>
  )
}
