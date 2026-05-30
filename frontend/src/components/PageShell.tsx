// frontend/src/components/PageShell.tsx
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useSettings } from '../context/SettingsContext'

export function PageShell({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const anim = settings.animations
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
