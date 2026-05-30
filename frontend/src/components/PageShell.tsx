// frontend/src/components/PageShell.tsx
import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useSettings } from '../context/SettingsContext'

export function PageShell({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const reduce = useReducedMotion()
  const anim = settings.animations && !reduce
  return (
    <motion.main
      initial={anim ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={anim ? { opacity: 0, y: -12 } : undefined}
      transition={{ type: 'spring', stiffness: 140, damping: 22 }}
      style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {children}
    </motion.main>
  )
}
