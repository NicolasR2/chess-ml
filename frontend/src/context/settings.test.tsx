// frontend/src/context/settings.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { SettingsProvider, useSettings } from './SettingsContext'

function Probe() {
  const { settings, setPieceSet } = useSettings()
  return (
    <div>
      <span data-testid="set">{settings.pieceSet}</span>
      <button onClick={() => setPieceSet('neon')}>neon</button>
    </div>
  )
}

beforeEach(() => localStorage.clear())

describe('SettingsContext', () => {
  it('defaults to monolito and persists changes', () => {
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    )
    expect(screen.getByTestId('set').textContent).toBe('monolito')
    act(() => screen.getByText('neon').click())
    expect(screen.getByTestId('set').textContent).toBe('neon')
    expect(localStorage.getItem('chessai.settings')).toContain('neon')
  })
})
