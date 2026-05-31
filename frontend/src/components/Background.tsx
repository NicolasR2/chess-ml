import { motion } from 'framer-motion'
import { useSettings } from '../context/SettingsContext'

// Large, ultra-soft emerald orbs with high-intensity motion: they drift far,
// pulse fast and swing hard in scale/opacity. Controlled by the "Animaciones" toggle.
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
  { size: 560, color: 'rgba(25,195,125,0.38)', top: '-10%', left: '-8%', dx: 240, dy: 170, smin: 0.35, smax: 1.95, dur: 5, delay: 0 },
  { size: 460, color: 'rgba(92,240,160,0.30)', top: '42%', left: '70%', dx: -260, dy: -140, smin: 0.3, smax: 1.9, dur: 4.5, delay: 0.6 },
  { size: 640, color: 'rgba(10,125,79,0.36)', top: '58%', left: '-4%', dx: 220, dy: -200, smin: 0.4, smax: 1.8, dur: 6, delay: 0.3 },
  { size: 380, color: 'rgba(92,240,160,0.28)', top: '2%', left: '60%', dx: -210, dy: 220, smin: 0.25, smax: 2.0, dur: 4, delay: 1 },
  { size: 520, color: 'rgba(25,195,125,0.28)', top: '26%', left: '32%', dx: 180, dy: 180, smin: 0.4, smax: 1.85, dur: 5.5, delay: 0.8 },
  { size: 440, color: 'rgba(60,220,150,0.26)', top: '70%', left: '55%', dx: -190, dy: -200, smin: 0.35, smax: 1.9, dur: 4.8, delay: 0.4 },
]

export function Background() {
  const { settings } = useSettings()
  const anim = settings.animations
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {ORBS.map((o, i) => (
        <motion.div
          key={i}
          initial={{ scale: o.smin, opacity: 0.6 }}
          animate={
            anim
              ? { x: [0, o.dx, 0], y: [0, o.dy, 0], scale: [o.smin, o.smax, o.smin], opacity: [0.35, 1, 0.35] }
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
      ))}
    </div>
  )
}
