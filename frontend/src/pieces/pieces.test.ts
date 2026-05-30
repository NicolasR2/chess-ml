// frontend/src/pieces/pieces.test.ts
import { describe, it, expect } from 'vitest'
import { PIECE_SETS, PIECE_TYPES, PIECE_ELEMENTS } from './index'

describe('piece sets', () => {
  it('defines an element for every piece type', () => {
    for (const t of PIECE_TYPES) {
      expect(PIECE_ELEMENTS[t]).toBeTruthy()
    }
  })
  it('exposes monolito, contorno, neon', () => {
    expect(Object.keys(PIECE_SETS).sort()).toEqual(['contorno', 'monolito', 'neon'])
  })
})
