// frontend/src/components/PieceSvg.tsx
import { motion } from 'framer-motion'
import { useSettings } from '../context/SettingsContext'
import { PIECE_SETS, PIECE_ELEMENTS, type PieceType } from '../pieces'

export type PieceSvgProps = {
  code: string // 'K' white, 'k' black, etc.
  slide?: { dx: number; dy: number }
  selected?: boolean
  animKey: string
}

export function PieceSvg({ code, slide, selected, animKey }: PieceSvgProps) {
  const { settings } = useSettings()
  const set = PIECE_SETS[settings.pieceSet] ?? PIECE_SETS.monolito
  const isWhite = code === code.toUpperCase()
  const t = code.toLowerCase() as PieceType
  const style = isWhite ? set.white : set.black
  const anim = settings.animations
  return (
    <motion.svg
      key={animKey}
      viewBox="0 0 45 45"
      initial={anim && slide ? { x: `${slide.dx * 100}%`, y: `${slide.dy * 100}%` } : false}
      animate={{ x: 0, y: 0, scale: selected ? 1.12 : 1 }}
      exit={anim ? { opacity: 0, scale: 0.4 } : undefined}
      transition={{
        x: { type: 'spring', stiffness: 540, damping: 36, mass: 0.7 },
        y: { type: 'spring', stiffness: 540, damping: 36, mass: 0.7 },
        scale: { type: 'spring', stiffness: 600, damping: 22 },
      }}
      style={{
        position: 'absolute',
        inset: '8%',
        width: '84%',
        height: '84%',
        pointerEvents: 'none',
        zIndex: selected ? 3 : 2,
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        strokeLinejoin: 'round',
        filter: style.filter,
      }}
    >
      {PIECE_ELEMENTS[t]}
    </motion.svg>
  )
}
