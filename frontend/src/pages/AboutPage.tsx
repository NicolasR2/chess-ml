// frontend/src/pages/AboutPage.tsx
import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'

const rows: [string, string, string][] = [
  ['baseline', '500k pos', '~700'],
  ['flagship_r1', '10.8M · 3 ép', '~1300'],
  ['flagship_r2', '10.8M · 8 ép', '~1665'],
  ['flagship_r3', '67M · +2 ép', '~2000-2120'],
]

const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius)', padding: 22, boxShadow: 'var(--shadow)' }

export function AboutPage() {
  return (
    <PageShell>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Link to="/" style={{ color: 'var(--text-dim)' }}>← Menú</Link>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, margin: 0 }}>El modelo</h2>
        <div style={panel}>
          <p style={{ color: 'var(--text)' }}>Red ResNet (policy + value) estilo AlphaZero, entrenada por imitación supervisada de partidas de Lichess (2000–2400) y guiada por búsqueda MCTS. Entrenada desde cero en una GPU AMD (RX 6700 XT, DirectML).</p>
          <p style={{ color: 'var(--text-dim)' }}>Datos: 3 meses de Lichess, ~67M posiciones. 3 rondas con streaming y warm-start. ELO medido por gauntlet vs Stockfish.</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead><tr style={{ textAlign: 'left', color: 'var(--text-dim)', fontSize: 13 }}><th>Modelo</th><th>Datos</th><th>ELO</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r[0]} style={{ borderTop: '1px solid var(--panel-border)' }}>
                  <td style={{ padding: '8px 0', fontWeight: 700 }}>{r[0]}</td>
                  <td style={{ color: 'var(--text-dim)' }}>{r[1]}</td>
                  <td style={{ fontWeight: 800, color: 'var(--accent)' }}>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  )
}
