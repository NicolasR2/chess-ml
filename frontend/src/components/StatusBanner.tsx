import { AnimatePresence, motion } from 'framer-motion'
import type { Status } from '../lib/api'

const LABELS: Record<Status, string | null> = {
  ongoing: null,
  check: '¡Jaque!',
  checkmate: 'Jaque mate',
  stalemate: 'Tablas por ahogado',
  draw: 'Tablas',
}

export function StatusBanner({ status }: { status: Status }) {
  const label = LABELS[status]
  const isEnd = status === 'checkmate' || status === 'stalemate' || status === 'draw'
  return (
    <AnimatePresence>
      {label && (
        <motion.div
          key={status}
          initial={{ opacity: 0, y: -12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          style={{
            padding: '12px 22px',
            borderRadius: 'var(--radius)',
            fontWeight: 700,
            fontSize: isEnd ? 20 : 15,
            color: isEnd ? '#0c1a10' : 'var(--text)',
            background: isEnd ? 'var(--accent)' : 'var(--panel-2)',
            boxShadow: 'var(--shadow)',
            textAlign: 'center',
          }}
        >
          {label}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
