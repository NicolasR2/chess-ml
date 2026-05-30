import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGame } from './useGame'
import * as api from '../lib/api'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

beforeEach(() => {
  vi.spyOn(api, 'createGame').mockResolvedValue({
    id: 'g1', fen: START, turn: 'white', status: 'ongoing', playerColor: 'white',
  })
  vi.spyOn(api, 'postMove').mockResolvedValue({
    id: 'g1', fen: AFTER_E4, turn: 'black', status: 'ongoing',
  })
})

describe('useGame', () => {
  it('starts a game and lists legal moves for e2', async () => {
    const { result } = renderHook(() => useGame())
    await act(async () => {
      await result.current.newGame({ mode: 'local', color: 'white' })
    })
    expect(result.current.legalMovesFor('e2')).toContain('e4')
  })

  it('applies a move optimistically and reconciles with server', async () => {
    const { result } = renderHook(() => useGame())
    await act(async () => {
      await result.current.newGame({ mode: 'local', color: 'white' })
    })
    await act(async () => {
      await result.current.move('e2', 'e4')
    })
    expect(result.current.turn).toBe('black')
    expect(result.current.lastMove).toEqual({ from: 'e2', to: 'e4', promotion: undefined })
  })

  it('reverts when the server rejects the move', async () => {
    vi.spyOn(api, 'postMove').mockRejectedValueOnce(new Error('400'))
    const { result } = renderHook(() => useGame())
    await act(async () => {
      await result.current.newGame({ mode: 'local', color: 'white' })
    })
    await act(async () => {
      await result.current.move('e2', 'e4')
    })
    // reverted back to white to move
    expect(result.current.turn).toBe('white')
  })
})
