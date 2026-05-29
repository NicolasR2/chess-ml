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
  animKey: string
}

export function Piece({ code, slide, animKey }: PieceProps) {
  const isWhite = code === code.toUpperCase()
  const glyph = GLYPH[code.toLowerCase()]
  return (
    <motion.div
      key={animKey}
      initial={slide ? { x: `${slide.dx * 100}%`, y: `${slide.dy * 100}%` } : false}
      animate={{ x: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.7 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '76%',
        lineHeight: 1,
        userSelect: 'none',
        pointerEvents: 'none',
        color: isWhite ? 'var(--piece-white)' : 'var(--piece-black)',
        textShadow: isWhite
          ? '0 1px 2px rgba(0,0,0,0.35)'
          : '0 1px 1px rgba(255,255,255,0.12)',
      }}
    >
      {glyph}
    </motion.div>
  )
}
