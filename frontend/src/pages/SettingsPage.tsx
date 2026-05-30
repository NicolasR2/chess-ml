// frontend/src/pages/SettingsPage.tsx
import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { useSettings, type PieceSet } from '../context/SettingsContext'
import { PIECE_SETS, PIECE_ELEMENTS } from '../pieces'

const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow)' }

export function SettingsPage() {
  const { settings, setPieceSet, setShowCoordinates, setAnimations } = useSettings()
  return (
    <PageShell>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Link to="/" style={{ color: 'var(--text-dim)' }}>← Menú</Link>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, margin: 0 }}>Ajustes</h2>
        <div style={panel}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-dim)', marginBottom: 12 }}>Estilo de fichas</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {Object.entries(PIECE_SETS).map(([key, set]) => {
              const on = settings.pieceSet === key
              const st = set.white
              return (
                <button key={key} onClick={() => setPieceSet(key as PieceSet)} style={{ flex: 1, padding: 14, borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: on ? '2px solid var(--accent)' : '1px solid var(--panel-border)', background: 'var(--bg-2)', color: 'var(--text)' }}>
                  <svg viewBox="0 0 45 45" width={40} height={40} style={{ fill: st.fill, stroke: st.stroke, strokeWidth: st.strokeWidth, strokeLinejoin: 'round', filter: st.filter }}>{PIECE_ELEMENTS.n}</svg>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{set.name}</div>
                </button>
              )
            })}
          </div>
        </div>
        <div style={panel}>
          <Toggle label="Coordenadas" value={settings.showCoordinates} onChange={setShowCoordinates} />
          <Toggle label="Animaciones" value={settings.animations} onChange={setAnimations} />
        </div>
      </div>
    </PageShell>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', cursor: 'pointer' }}>
      <span>{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
    </label>
  )
}
