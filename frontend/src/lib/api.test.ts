import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createGame, postMove } from './api'

beforeEach(() => {
  globalThis.fetch = vi.fn(
    async () =>
      new Response(
        JSON.stringify({ id: 'g1', fen: 'FEN', turn: 'white', status: 'ongoing' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
  ) as unknown as typeof fetch
})

describe('api client', () => {
  it('createGame POSTs to /api/games', async () => {
    const g = await createGame({ mode: 'ai', color: 'white', sims: 200 })
    expect(g.id).toBe('g1')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/games'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('postMove POSTs the move to the game', async () => {
    await postMove('g1', { from: 'e2', to: 'e4' })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/games/g1/moves'),
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
