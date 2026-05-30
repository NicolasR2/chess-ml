// frontend/src/pages/MenuPage.tsx
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PageShell } from '../components/PageShell'
import { PIECE_ELEMENTS } from '../pieces'

const items: [string, string, string][] = [
  ['/play', 'Jugar vs IA', 'Elige un nivel de ELO y juega contra el modelo'],
  ['/local', 'Local', 'Dos jugadores en este dispositivo'],
  ['/settings', 'Ajustes', 'Fichas, tablero y animaciones'],
  ['/about', 'El modelo', 'Cómo se entrenó (≈2000 ELO)'],
]

export function MenuPage() {
  return (
    <PageShell>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 32, padding: 48, alignItems: 'center', minHeight: '100vh', maxWidth: 1100, margin: '0 auto' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, margin: 0, lineHeight: 1 }}>ChessAI</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 18 }}>Juega contra un modelo entrenado desde cero.</p>
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', width: 'min(60vmin, 360px)', aspectRatio: '1', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            {Array.from({ length: 64 }).map((_, i) => {
              const dark = (Math.floor(i / 8) + i) % 2 === 0
              return <div key={i} style={{ background: dark ? 'var(--dark-sq)' : 'var(--light-sq)' }} />
            })}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map(([to, title, sub], idx) => (
            <motion.div key={to} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * idx, type: 'spring', stiffness: 140, damping: 20 }} whileHover={{ y: -3 }}>
              <Link to={to} style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', background: 'var(--panel)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius)', padding: 18, color: 'var(--text)', boxShadow: 'var(--shadow)' }}>
                <svg viewBox="0 0 45 45" width={28} height={28} style={{ fill: 'var(--accent)' }}>{PIECE_ELEMENTS.n}</svg>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>{sub}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
