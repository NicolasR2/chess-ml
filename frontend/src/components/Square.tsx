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
  fileLabel?: string
  rankLabel?: string
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
  fileLabel,
  rankLabel,
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
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 28 }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '26%',
            height: '26%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: 'var(--accent)',
            opacity: 0.85,
          }}
        />
      )}

      {isLegal && isCapture && (
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            position: 'absolute',
            inset: '8%',
            borderRadius: '50%',
            boxShadow: 'inset 0 0 0 5px var(--accent)',
          }}
        />
      )}

      {fileLabel && (
        <span style={labelStyle(dark, { right: 4, bottom: 2 })}>{fileLabel}</span>
      )}
      {rankLabel && (
        <span style={labelStyle(dark, { left: 4, top: 2 })}>{rankLabel}</span>
      )}

      {children}
    </div>
  )
}

function labelStyle(
  dark: boolean,
  pos: { left?: number; right?: number; top?: number; bottom?: number },
): React.CSSProperties {
  return {
    position: 'absolute',
    ...pos,
    fontSize: '11px',
    fontWeight: 700,
    pointerEvents: 'none',
    color: dark ? 'var(--light-sq)' : 'var(--dark-sq)',
    opacity: 0.7,
  }
}
