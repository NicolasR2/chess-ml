// frontend/src/pages/PlayPage.tsx
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PageShell } from '../components/PageShell'
import { EloPicker } from '../components/EloPicker'
import { GameView } from '../components/GameView'
import { getLevels } from '../lib/api'

const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius)', padding: 22, boxShadow: 'var(--shadow)' }

export function PlayPage() {
  const [levels, setLevels] = useState<number[]>([500, 1000, 1200, 1500, 1800, 2000, 2200])
  const [elo, setElo] = useState(1500)
  const [color, setColor] = useState<'white' | 'black' | 'random'>('white')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    getLevels().then(setLevels).catch(() => {})
  }, [])

  if (started) return <PageShell><GameView opts={{ mode: 'ai', color, level: elo }} elo={elo} /></PageShell>

  return (
    <PageShell>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '56px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, margin: 0 }}>Nueva partida</h2>
        <div style={panel}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-dim)', marginBottom: 10 }}>Nivel (ELO)</div>
          <EloPicker levels={levels} value={elo} onChange={setElo} />
        </div>
        <div style={panel}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-dim)', marginBottom: 10 }}>Color</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['white', 'black', 'random'] as const).map((c) => (
              <button key={c} onClick={() => setColor(c)} style={{ flex: 1, padding: 10, borderRadius: 'var(--radius-sm)', border: '1px solid var(--panel-border)', background: color === c ? 'var(--accent)' : 'transparent', color: color === c ? '#04120b' : 'var(--text)', fontWeight: 700, cursor: 'pointer' }}>
                {c === 'white' ? 'Blancas' : c === 'black' ? 'Negras' : 'Aleatorio'}
              </button>
            ))}
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStarted(true)} style={{ padding: 16, border: 'none', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(120deg, var(--accent-2), var(--accent))', color: '#04120b', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
          Empezar
        </motion.button>
      </div>
    </PageShell>
  )
}
