// frontend/src/components/EloPicker.tsx
import { motion } from 'framer-motion'

export const TIERS: Record<number, string> = {
  500: 'Principiante', 1000: 'Casual', 1200: 'Aficionado', 1500: 'Intermedio',
  1800: 'Avanzado', 2000: 'Experto', 2200: 'Maestro',
}

export function EloPicker({ levels, value, onChange }: { levels: number[]; value: number; onChange: (elo: number) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))', gap: 8 }}>
      {levels.map((elo) => {
        const on = elo === value
        return (
          <motion.button
            key={elo}
            onClick={() => onChange(elo)}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
            style={{ position: 'relative', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-sm)', padding: '10px 8px', cursor: 'pointer', background: 'transparent', color: on ? '#04120b' : 'var(--text)', fontWeight: 700 }}
          >
            {on && (
              <motion.span layoutId="elo-active" transition={{ type: 'spring', stiffness: 500, damping: 36 }} style={{ position: 'absolute', inset: 0, background: 'var(--accent)', borderRadius: 'var(--radius-sm)', zIndex: 0 }} />
            )}
            <span style={{ position: 'relative', zIndex: 1, display: 'block', fontSize: 18 }}>{elo}</span>
            <span style={{ position: 'relative', zIndex: 1, display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.85 }}>{TIERS[elo] ?? ''}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
