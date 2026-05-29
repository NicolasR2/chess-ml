import { motion } from 'framer-motion'
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
        padding: '48px 24px',
        gap: 24,
        justifyContent: 'center',
      }}
    >
      <div style={{ minHeight: 48 }}>
        <StatusBanner status={game.status} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.05 }}
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
      </motion.div>
    </div>
  )
}
