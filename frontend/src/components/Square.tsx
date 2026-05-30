import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export type SquareProps = {
  square: string
  dark: boolean
  isSelected: boolean
  isLast: boolean
  isLegal: boolean
  isCapture: boolean
  isCheck: boolean
  onClick: () => void
  children?: ReactNode
}

export function Square({
  square,
  dark,
  isSelected,
  isLast,
  isLegal,
  isCapture,
  isCheck,
  onClick,
  children,
}: SquareProps) {
  return (
    <div
      data-square={square}
      onClick={onClick}
      style={{
        position: 'relative',
        aspectRatio: '1 / 1',
        background: dark ? 'var(--dark-sq)' : 'var(--light-sq)',
        cursor: 'pointer',
        overflow: 'hidden',
        containerType: 'inline-size',
      }}
    >
      {(isSelected || isLast) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: isSelected ? 'var(--accent-soft)' : 'var(--last)',
          }}
        />
      )}

      {isCheck && (
        <motion.div
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: 0,
            boxShadow: 'inset 0 0 0 4px var(--check)',
            borderRadius: 'var(--radius-sq)',
          }}
        />
      )}

      {isLegal && !isCapture && (
        <div style={dotCenter}>
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.85 }}
            transition={{ type: 'spring', stiffness: 600, damping: 28 }}
            style={{
              width: '28%',
              height: '28%',
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 10px var(--accent-glow)',
            }}
          />
        </div>
      )}

      {isLegal && isCapture && (
        <div style={dotCenter}>
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              width: '84%',
              height: '84%',
              borderRadius: '50%',
              boxShadow: 'inset 0 0 0 5px var(--accent)',
            }}
          />
        </div>
      )}

      {children}
    </div>
  )
}

const dotCenter: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
}
