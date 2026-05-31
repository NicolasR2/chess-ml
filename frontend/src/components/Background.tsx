import { motion } from 'framer-motion'
import { useSettings } from '../context/SettingsContext'

// Drifting, heavily-blurred emerald orbs that visibly grow and shrink (breathing)
// behind all content. Controlled by the in-app "Animaciones" toggle.
type Orb = {
  size: number
  color: string
  top: string
  left: string
  dx: number
  dy: number
  smin: number
  smax: number
  dur: number
  delay: number
}

const ORBS: Orb[] = [
  { size: 420, color: 'rgba(25,195,125,0.32)', top: '-6%', left: '-6%', dx: 70, dy: 50, smin: 0.75, smax: 1.35, dur: 9, delay: 0 },
  { size: 340, color: 'rgba(92,240,160,0.24)', top: '46%', left: '72%', dx: -80, dy: -40, smin: 0.7, smax: 1.4, dur: 11, delay: 1.2 },
  { size: 480, color: 'rgba(10,125,79,0.30)', top: '60%', left: '2%', dx: 60, dy: -60, smin: 0.8, smax: 1.3, dur: 13, delay: 0.6 },
  { size: 280, color: 'rgba(92,240,160,0.20)', top: '4%', left: '62%', dx: -50, dy: 70, smin: 0.65, smax: 1.45, dur: 8, delay: 2 },
  { size: 380, color: 'rgba(25,195,125,0.22)', top: '28%', left: '34%', dx: 45, dy: 45, smin: 0.8, smax: 1.25, dur: 10, delay: 1.6 },
]

export function Background() {
  const { settings } = useSettings()
  const anim = settings.animations
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {ORBS.map((o, i) => (
        <motion.div
          key={i}
          initial={{ scale: o.smin, opacity: 0.7 }}
          animate={
            anim
              ? { x: [0, o.dx, 0], y: [0, o.dy, 0], scale: [o.smin, o.smax, o.smin], opacity: [0.6, 1, 0.6] }
              : { scale: 1, opacity: 0.8 }
          }
          transition={{ duration: o.dur, repeat: anim ? Infinity : 0, ease: 'easeInOut', delay: o.delay }}
          style={{
            position: 'absolute',
            top: o.top,
            left: o.left,
            width: o.size,
            height: o.size,
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 50%, ${o.color}, transparent 70%)`,
            filter: 'blur(55px)',
          }}
        />
      ))}
    </div>
  )
}
