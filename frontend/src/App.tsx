import { useGame } from './hooks/useGame'
import { Board } from './components/Board'
import { Sidebar } from './components/Sidebar'
import { StatusBanner } from './components/StatusBanner'

export default function App() {
  const game = useGame()
  const started = game.id !== null
  const isPlayerTurn = game.turn === game.playerColor

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 24px 48px',
        gap: 24,
      }}
    >
      <header style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 30, letterSpacing: -0.5 }}>
          Chess<span style={{ color: 'var(--accent)' }}>AI</span>
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-dim)', fontSize: 14 }}>
          Minimalista · fluido · tu propio motor
        </p>
      </header>

      <div style={{ minHeight: 48 }}>
        <StatusBanner status={game.status} />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 28,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <Board
          fen={game.fen}
          orientation={game.playerColor}
          lastMove={game.lastMove}
          inCheck={game.status === 'check'}
          turn={game.turn}
          interactive={started && isPlayerTurn && game.status !== 'checkmate' && !game.thinking}
          legalMovesFor={game.legalMovesFor}
          onMove={game.move}
        />
        <Sidebar
          history={game.history}
          turn={game.turn}
          thinking={game.thinking}
          onNewGame={game.newGame}
        />
      </div>
    </div>
  )
}
