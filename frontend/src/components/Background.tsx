import { motion } from 'framer-motion'
import { useSettings } from '../context/SettingsContext'

// Large, ultra-soft emerald orbs that clearly drift, grow and shrink (breathing)
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
  { size: 560, color: 'rgba(25,195,125,0.34)', top: '-10%', left: '-8%', dx: 130, dy: 90, smin: 0.55, smax: 1.6, dur: 8, delay: 0 },
  { size: 460, color: 'rgba(92,240,160,0.26)', top: '42%', left: '70%', dx: -150, dy: -70, smin: 0.5, smax: 1.55, dur: 10, delay: 1.1 },
  { size: 640, color: 'rgba(10,125,79,0.32)', top: '58%', left: '-4%', dx: 120, dy: -110, smin: 0.6, smax: 1.5, dur: 12, delay: 0.5 },
  { size: 380, color: 'rgba(92,240,160,0.24)', top: '2%', left: '60%', dx: -110, dy: 120, smin: 0.45, smax: 1.65, dur: 7, delay: 1.8 },
  { size: 520, color: 'rgba(25,195,125,0.24)', top: '26%', left: '32%', dx: 90, dy: 90, smin: 0.6, smax: 1.45, dur: 11, delay: 1.4 },
  { size: 440, color: 'rgba(60,220,150,0.22)', top: '70%', left: '55%', dx: -90, dy: -100, smin: 0.55, smax: 1.5, dur: 9, delay: 0.8 },
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
              ? { x: [0, o.dx, 0], y: [0, o.dy, 0], scale: [o.smin, o.smax, o.smin], opacity: [0.45, 0.95, 0.45] }
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
            // soft multi-stop falloff + heavy blur = very smooth edges
            background: `radial-gradient(circle at 50% 50%, ${o.color} 0%, ${o.color} 18%, transparent 72%)`,
            filter: 'blur(90px)',
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  )
}
