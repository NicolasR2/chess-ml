import { useMemo, useState } from 'react'
import type { Color, Move } from '../lib/api'
import { Square } from './Square'
import { PieceSvg } from './PieceSvg'
import { useSettings } from '../context/SettingsContext'

type BoardProps = {
  fen: string
  orientation: Color
  lastMove: Move | null
  inCheck: boolean
  turn: Color
  interactive: boolean
  legalMovesFor: (square: string) => string[]
  onMove: (from: string, to: string, promotion?: string) => void
}

type Cell = { square: string; piece: string | null; dark: boolean }

function parseFen(fen: string): Record<string, string> {
  const placement = fen.split(' ')[0]
  const map: Record<string, string> = {}
  const ranks = placement.split('/')
  for (let r = 0; r < 8; r++) {
    const rankNum = 8 - r
    let file = 0
    for (const ch of ranks[r]) {
      if (/\d/.test(ch)) {
        file += Number(ch)
      } else {
        const square = String.fromCharCode(97 + file) + rankNum
        map[square] = ch
        file++
      }
    }
  }
  return map
}

function toDisplay(square: string, orientation: Color) {
  const f = square.charCodeAt(0) - 97
  const r = Number(square[1]) - 1
  if (orientation === 'white') return { row: 7 - r, col: f }
  return { row: r, col: 7 - f }
}

export function Board({
  fen,
  orientation,
  lastMove,
  inCheck,
  turn,
  interactive,
  legalMovesFor,
  onMove,
}: BoardProps) {
  const pieces = useMemo(() => parseFen(fen), [fen])
  const [selected, setSelected] = useState<string | null>(null)
  const legal = useMemo(
    () => (selected ? legalMovesFor(selected) : []),
    [selected, legalMovesFor],
  )

  const kingSquare = useMemo(() => {
    if (!inCheck) return null
    const want = turn === 'white' ? 'K' : 'k'
    return Object.keys(pieces).find((sq) => pieces[sq] === want) ?? null
  }, [inCheck, turn, pieces])

  const cells: Cell[] = []
  const ranks = orientation === 'white' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]
  const files = orientation === 'white' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]
  for (const rank of ranks) {
    for (const f of files) {
      const square = String.fromCharCode(97 + f) + rank
      const dark = (f + (rank - 1)) % 2 === 0
      cells.push({ square, piece: pieces[square] ?? null, dark })
    }
  }

  function handleClick(square: string) {
    if (!interactive) return
    const piece = pieces[square]
    if (selected && legal.includes(square)) {
      const movingPiece = pieces[selected]
      let promotion: string | undefined
      if (movingPiece?.toLowerCase() === 'p' && (square[1] === '8' || square[1] === '1')) {
        promotion = 'q'
      }
      onMove(selected, square, promotion)
      setSelected(null)
      return
    }
    if (piece) {
      const isWhitePiece = piece === piece.toUpperCase()
      if ((turn === 'white') === isWhitePiece) {
        setSelected(square)
        return
      }
    }
    setSelected(null)
  }

  const { settings } = useSettings()
  const rankLabels = orientation === 'white' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]
  const fileLabels = orientation === 'white'
    ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '18px min(78vmin, 640px)',
        gridTemplateRows: 'min(78vmin, 640px) 18px',
        gap: 4,
      }}
    >
      {settings.showCoordinates && (
        <div style={{ gridColumn: 1, gridRow: 1, display: 'grid', gridTemplateRows: 'repeat(8, 1fr)' }}>
          {rankLabels.map((r) => (
            <span key={r} style={coordStyle}>{r}</span>
          ))}
        </div>
      )}
      <div
        style={{
          gridColumn: 2,
          gridRow: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          aspectRatio: '1 / 1',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow)',
        }}
      >
        {cells.map((cell) => {
          const isLast = !!lastMove && (lastMove.from === cell.square || lastMove.to === cell.square)
          const isLegal = legal.includes(cell.square)
          const isCapture = isLegal && !!cell.piece
          let slide: { dx: number; dy: number } | undefined
          let animKey = `${cell.square}-${cell.piece}`
          if (cell.piece && lastMove && lastMove.to === cell.square) {
            const from = toDisplay(lastMove.from, orientation)
            const to = toDisplay(lastMove.to, orientation)
            slide = { dx: from.col - to.col, dy: from.row - to.row }
            animKey = `${lastMove.from}-${lastMove.to}-${cell.piece}`
          }
          return (
            <Square
              key={cell.square}
              square={cell.square}
              dark={cell.dark}
              isSelected={selected === cell.square}
              isLast={isLast}
              isLegal={isLegal}
              isCapture={isCapture}
              isCheck={kingSquare === cell.square}
              onClick={() => handleClick(cell.square)}
            >
              {cell.piece && <PieceSvg code={cell.piece} slide={slide} animKey={animKey} />}
            </Square>
          )
        })}
      </div>
      {settings.showCoordinates && (
        <div style={{ gridColumn: 2, gridRow: 2, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)' }}>
          {fileLabels.map((f) => (
            <span key={f} style={coordStyle}>{f}</span>
          ))}
        </div>
      )}
    </div>
  )
}

const coordStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-dim)',
}
