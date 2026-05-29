import { useCallback, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import * as api from '../lib/api'
import type { Color, CreateOpts, GameState, Move, Status } from '../lib/api'

export type UseGame = {
  id: string | null
  fen: string
  turn: Color
  status: Status
  playerColor: Color
  lastMove: Move | null
  history: string[]
  thinking: boolean
  newGame: (opts: CreateOpts) => Promise<void>
  legalMovesFor: (square: string) => string[]
  move: (from: string, to: string, promotion?: string) => Promise<void>
}

export function useGame(): UseGame {
  const chess = useRef(new Chess())
  const [id, setId] = useState<string | null>(null)
  const [fen, setFen] = useState(chess.current.fen())
  const [turn, setTurn] = useState<Color>('white')
  const [status, setStatus] = useState<Status>('ongoing')
  const [playerColor, setPlayerColor] = useState<Color>('white')
  const [lastMove, setLastMove] = useState<Move | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [thinking, setThinking] = useState(false)

  const sync = useCallback(() => {
    setFen(chess.current.fen())
    setTurn(chess.current.turn() === 'w' ? 'white' : 'black')
    setHistory(chess.current.history())
  }, [])

  const newGame = useCallback(
    async (opts: CreateOpts) => {
      const s = await api.createGame(opts)
      setId(s.id)
      setPlayerColor(s.playerColor ?? 'white')
      chess.current.reset()
      // If the AI opened (player is black), apply its move to keep history intact.
      if (s.aiMove) {
        try {
          chess.current.move({
            from: s.aiMove.from,
            to: s.aiMove.to,
            promotion: s.aiMove.promotion as never,
          })
        } catch {
          chess.current.load(s.fen)
        }
      }
      setStatus(s.status)
      setLastMove(s.aiMove ?? null)
      sync()
    },
    [sync],
  )

  const legalMovesFor = useCallback((square: string): string[] => {
    return chess.current
      .moves({ square: square as never, verbose: true })
      .map((m) => (m as { to: string }).to)
  }, [])

  const applyServer = useCallback(
    (s: GameState) => {
      // Apply the AI reply as a real move so chess.js keeps SAN history.
      if (s.aiMove) {
        try {
          chess.current.move({
            from: s.aiMove.from,
            to: s.aiMove.to,
            promotion: s.aiMove.promotion as never,
          })
        } catch {
          chess.current.load(s.fen)
        }
        setLastMove(s.aiMove)
      } else if (chess.current.fen() !== s.fen) {
        // Local and server diverged unexpectedly; trust the server.
        chess.current.load(s.fen)
        if (s.lastMove) setLastMove(s.lastMove)
      }
      setStatus(s.status)
      sync()
    },
    [sync],
  )

  const move = useCallback(
    async (from: string, to: string, promotion?: string) => {
      const snapshot = chess.current.fen()
      try {
        chess.current.move({ from, to, promotion: promotion as never })
        setLastMove({ from, to, promotion })
        sync()
      } catch {
        return // illegal locally; ignore
      }
      if (!id) return
      setThinking(true)
      try {
        const s = await api.postMove(id, { from, to, promotion })
        applyServer(s)
      } catch {
        chess.current.load(snapshot) // server rejected; revert
        sync()
      } finally {
        setThinking(false)
      }
    },
    [id, sync, applyServer],
  )

  return {
    id,
    fen,
    turn,
    status,
    playerColor,
    lastMove,
    history,
    thinking,
    newGame,
    legalMovesFor,
    move,
  }
}
