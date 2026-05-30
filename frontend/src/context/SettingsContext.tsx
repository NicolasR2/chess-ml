// frontend/src/context/SettingsContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type PieceSet = 'monolito' | 'contorno' | 'neon'
export type BoardTheme = 'emerald' | 'slate' | 'amber'

export type Settings = {
  pieceSet: PieceSet
  boardTheme: BoardTheme
  showCoordinates: boolean
  animations: boolean
}

const DEFAULTS: Settings = {
  pieceSet: 'monolito',
  boardTheme: 'emerald',
  showCoordinates: true,
  animations: true,
}

const KEY = 'chessai.settings'

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

type Ctx = {
  settings: Settings
  setPieceSet: (v: PieceSet) => void
  setBoardTheme: (v: BoardTheme) => void
  setShowCoordinates: (v: boolean) => void
  setAnimations: (v: boolean) => void
}

const SettingsCtx = createContext<Ctx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(settings))
  }, [settings])
  const patch = (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p }))
  return (
    <SettingsCtx.Provider
      value={{
        settings,
        setPieceSet: (v) => patch({ pieceSet: v }),
        setBoardTheme: (v) => patch({ boardTheme: v }),
        setShowCoordinates: (v) => patch({ showCoordinates: v }),
        setAnimations: (v) => patch({ animations: v }),
      }}
    >
      {children}
    </SettingsCtx.Provider>
  )
}

export function useSettings(): Ctx {
  const c = useContext(SettingsCtx)
  if (!c) throw new Error('useSettings must be used within SettingsProvider')
  return c
}
