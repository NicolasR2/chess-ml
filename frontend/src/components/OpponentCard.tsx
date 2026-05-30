// frontend/src/components/OpponentCard.tsx
import { PIECE_ELEMENTS } from '../pieces'
import { TIERS } from './EloPicker'

export function OpponentCard({ elo, thinking }: { elo: number; thinking: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-3)', display: 'grid', placeItems: 'center' }}>
        <svg viewBox="0 0 45 45" width={26} height={26} style={{ fill: 'var(--accent)' }}>{PIECE_ELEMENTS.k}</svg>
      </div>
      <div>
        <div style={{ fontWeight: 800 }}>Oponente</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{thinking ? 'Pensando…' : TIERS[elo] ?? ''}</div>
      </div>
      <div style={{ marginLeft: 'auto', background: 'var(--bg-3)', borderRadius: 999, padding: '3px 10px', fontWeight: 800, color: 'var(--accent)' }}>{elo}</div>
    </div>
  )
}
