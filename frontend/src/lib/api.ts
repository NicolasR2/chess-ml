const BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8080'

export type Color = 'white' | 'black'
export type Status = 'ongoing' | 'check' | 'checkmate' | 'stalemate' | 'draw'

export type Move = { from: string; to: string; promotion?: string }

export type GameState = {
  id: string
  fen: string
  turn: Color
  status: Status
  playerColor?: Color
  history?: string[]
  lastMove?: Move
  aiMove?: Move
}

export type CreateOpts = {
  mode: 'ai' | 'local'
  color: 'white' | 'black' | 'random'
  level?: number
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
  return res.json() as Promise<T>
}

export function createGame(opts: CreateOpts): Promise<GameState> {
  return fetch(`${BASE}/api/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  }).then(asJson<GameState>)
}

export function getGame(id: string): Promise<GameState> {
  return fetch(`${BASE}/api/games/${id}`).then(asJson<GameState>)
}

export function postMove(id: string, move: Move): Promise<GameState> {
  return fetch(`${BASE}/api/games/${id}/moves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(move),
  }).then(asJson<GameState>)
}

export function getLevels(): Promise<number[]> {
  return fetch(`${BASE}/api/levels`)
    .then(asJson<{ levels: number[] }>)
    .then((r) => r.levels)
}
