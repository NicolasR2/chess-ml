import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createGame, postMove, getLevels } from './api'

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
    const g = await createGame({ mode: 'ai', color: 'white', level: 1500 })
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

  it('createGame sends the level', async () => {
    await createGame({ mode: 'ai', color: 'white', level: 1500 })
    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
    const init = calls[calls.length - 1][1] as RequestInit
    expect(JSON.parse(init.body as string)).toMatchObject({ level: 1500 })
  })

  it('getLevels fetches the ladder', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ levels: [500, 2000] }), { status: 200 }),
    ) as unknown as typeof fetch
    expect(await getLevels()).toEqual([500, 2000])
  })
})
