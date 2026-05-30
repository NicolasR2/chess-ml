// frontend/src/pieces/index.ts
import { PIECE_ELEMENTS, PIECE_TYPES, type PieceType } from './elements'
export { PIECE_ELEMENTS, PIECE_TYPES }
export type { PieceType }

export type PieceStyle = {
  fill: string
  stroke: string
  strokeWidth: number
  filter?: string
}

export type PieceSet = { name: string; white: PieceStyle; black: PieceStyle }

export const PIECE_SETS: Record<string, PieceSet> = {
  monolito: {
    name: 'Monolito',
    white: { fill: 'var(--piece-white)', stroke: '#0a2c1c', strokeWidth: 1.2 },
    black: { fill: 'var(--piece-black)', stroke: '#000', strokeWidth: 0.8 },
  },
  contorno: {
    name: 'Contorno',
    white: { fill: 'none', stroke: 'var(--piece-white)', strokeWidth: 2 },
    black: { fill: 'none', stroke: 'var(--piece-black)', strokeWidth: 2 },
  },
  neon: {
    name: 'Neón',
    white: { fill: 'var(--piece-white)', stroke: 'var(--accent)', strokeWidth: 1, filter: 'drop-shadow(0 0 5px var(--accent-glow))' },
    black: { fill: 'var(--piece-black)', stroke: 'var(--accent-2)', strokeWidth: 1, filter: 'drop-shadow(0 0 5px rgba(25,195,125,0.5))' },
  },
}
