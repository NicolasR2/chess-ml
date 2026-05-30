// frontend/src/components/GameView.tsx
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Board } from './Board'
import { OpponentCard } from './OpponentCard'
import { StatusBanner } from './StatusBanner'
import { useGame } from '../hooks/useGame'
import type { CreateOpts } from '../lib/api'

const panel: React.CSSProperties = { background: 'var(--panel)', borderRadius: 'var(--radius)', padding: 16, boxShadow: 'var(--shadow)', border: '1px solid var(--panel-border)' }
const btn: React.CSSProperties = { flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--panel-border)', background: 'transparent', color: 'var(--text)', fontWeight: 700, cursor: 'pointer' }

export function GameView({ opts, elo }: { opts: CreateOpts; elo?: number }) {
  const game = useGame()
  const navigate = useNavigate()
  const started = useRef(false)
  useEffect(() => {
    if (!started.current) {
      started.current = true
      void game.newGame(opts)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isPlayerTurn = opts.mode === 'local' || game.turn === game.playerColor
  const interactive = game.id !== null && isPlayerTurn && game.status !== 'checkmate' && !game.thinking
  const over = game.status === 'checkmate' || game.status === 'stalemate' || game.status === 'draw'

  const pairs: [string, string?][] = []
  for (let i = 0; i < game.history.length; i += 2) pairs.push([game.history[i], game.history[i + 1]])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px', gap: 20 }}>
      <div style={{ minHeight: 40 }}><StatusBanner status={game.status} /></div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Board
          fen={game.fen}
          orientation={game.playerColor}
          lastMove={game.lastMove}
          inCheck={game.status === 'check'}
          turn={game.turn}
          interactive={interactive}
          legalMovesFor={game.legalMovesFor}
          onMove={game.move}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 250 }}>
          {opts.mode === 'ai' && elo != null && <div style={panel}><OpponentCard elo={elo} thinking={game.thinking} /></div>}
          <div style={{ ...panel, flex: 1, minHeight: 150 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-dim)', marginBottom: 8 }}>Jugadas</div>
            <div style={{ maxHeight: 260, overflowY: 'auto', fontVariantNumeric: 'tabular-nums' }}>
              {pairs.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Aún no hay jugadas.</p>}
              {pairs.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr', gap: 6, padding: '4px 6px', borderRadius: 8, background: i % 2 ? 'transparent' : 'var(--bg-2)', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-dim)' }}>{i + 1}.</span><span>{p[0]}</span><span>{p[1] ?? ''}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/')} style={btn}>Menú</button>
            <button onClick={() => game.newGame(opts)} style={{ ...btn, background: 'var(--accent)', color: '#04120b', border: 'none', fontWeight: 800 }}>Nueva</button>
          </div>
        </div>
      </div>
      {over && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(3,12,8,0.6)', backdropFilter: 'blur(4px)', zIndex: 10 }}>
          <motion.div initial={{ scale: 0.85, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }} style={{ background: 'var(--panel-solid)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius)', padding: 32, textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>{game.status === 'checkmate' ? 'Jaque mate' : 'Tablas'}</h2>
            <button onClick={() => game.newGame(opts)} style={{ marginTop: 16, padding: '12px 20px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: '#04120b', fontWeight: 800, cursor: 'pointer' }}>Jugar otra</button>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
