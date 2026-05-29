import { motion } from 'framer-motion'

// Solid Unicode chess glyphs (U+265A–F) used for BOTH colors and tinted via CSS,
// giving clean two-tone flat pieces that fit the minimalist aesthetic.
const GLYPH: Record<string, string> = {
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
}

export type PieceProps = {
  /** piece char: uppercase = white, lowercase = black (e.g. "N", "p") */
  code: string
  /** slide-in offset in board squares (from - to), animated to 0 */
  slide?: { dx: number; dy: number }
  selected?: boolean
  animKey: string
}

export function Piece({ code, slide, selected, animKey }: PieceProps) {
  const isWhite = code === code.toUpperCase()
  const glyph = GLYPH[code.toLowerCase()]
  return (
    <motion.div
      key={animKey}
      initial={slide ? { x: `${slide.dx * 100}%`, y: `${slide.dy * 100}%` } : false}
      animate={{ x: 0, y: 0, scale: selected ? 1.14 : 1 }}
      transition={{
        x: { type: 'spring', stiffness: 540, damping: 36, mass: 0.7 },
        y: { type: 'spring', stiffness: 540, damping: 36, mass: 0.7 },
        scale: { type: 'spring', stiffness: 600, damping: 22 },
      }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '90%',
        lineHeight: 1,
        userSelect: 'none',
        pointerEvents: 'none',
        zIndex: selected ? 3 : 2,
        color: isWhite ? 'var(--piece-white)' : 'var(--piece-black)',
        filter: isWhite
          ? 'drop-shadow(0 3px 4px rgba(0,0,0,0.4))'
          : 'drop-shadow(0 3px 4px rgba(0,0,0,0.32))',
      }}
    >
      {glyph}
    </motion.div>
  )
}
