import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Color, CreateOpts } from '../lib/api'

type SidebarProps = {
  history: string[]
  turn: Color
  thinking: boolean
  onNewGame: (opts: CreateOpts) => void
}

const panel: React.CSSProperties = {
  background: 'var(--panel)',
  borderRadius: 'var(--radius)',
  padding: 18,
  boxShadow: 'var(--shadow)',
}

export function Sidebar({ history, turn, thinking, onNewGame }: SidebarProps) {
  const [mode, setMode] = useState<'ai' | 'local'>('ai')
  const [color, setColor] = useState<'white' | 'black' | 'random'>('white')
  const [sims, setSims] = useState(200)

  const pairs: [string, string?][] = []
  for (let i = 0; i < history.length; i += 2) {
    pairs.push([history[i], history[i + 1]])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 280 }}>
      <div style={panel}>
        <h2 style={{ margin: '0 0 14px', fontSize: 18 }}>Nueva partida</h2>

        <Field label="Modo">
          <Segment
            group="mode"
            value={mode}
            options={[
              ['ai', 'vs IA'],
              ['local', 'Local'],
            ]}
            onChange={(v) => setMode(v as 'ai' | 'local')}
          />
        </Field>

        <Field label="Color">
          <Segment
            group="color"
            value={color}
            options={[
              ['white', 'Blancas'],
              ['black', 'Negras'],
              ['random', 'Aleatorio'],
            ]}
            onChange={(v) => setColor(v as typeof color)}
          />
        </Field>

        {mode === 'ai' && (
          <Field label={`Fuerza · ${sims} sims`}>
            <input
              type="range"
              min={50}
              max={800}
              step={50}
              value={sims}
              onChange={(e) => setSims(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </Field>
        )}

        <StartButton onClick={() => onNewGame({ mode, color, sims })} />
      </div>

      <div style={{ ...panel, flex: 1, minHeight: 160 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>Jugadas</h2>
          <TurnDot turn={turn} thinking={thinking} />
        </div>
        <div style={{ maxHeight: 280, overflowY: 'auto', fontVariantNumeric: 'tabular-nums' }}>
          {pairs.length === 0 && (
            <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Aún no hay jugadas.</p>
          )}
          {pairs.map((p, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr 1fr',
                gap: 6,
                padding: '4px 6px',
                borderRadius: 8,
                background: i % 2 ? 'transparent' : 'var(--bg-2)',
                fontSize: 14,
              }}
            >
              <span style={{ color: 'var(--text-dim)' }}>{i + 1}.</span>
              <span>{p[0]}</span>
              <span>{p[1] ?? ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StartButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      initial={false}
      whileHover="hover"
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      style={{
        position: 'relative',
        width: '100%',
        marginTop: 8,
        padding: '14px 18px',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'linear-gradient(120deg, var(--accent-2), var(--accent))',
        color: '#04120b',
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 16,
        letterSpacing: 0.2,
        boxShadow: '0 10px 30px rgba(15, 120, 75, 0.45)',
      }}
    >
      {/* sweeping sheen on hover */}
      <motion.span
        variants={{
          hover: { x: ['-120%', '120%'], opacity: [0, 1, 0] },
        }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: '40%',
          background:
            'linear-gradient(100deg, transparent, rgba(255,255,255,0.55), transparent)',
          transform: 'skewX(-18deg)',
          pointerEvents: 'none',
        }}
      />
      <motion.span
        variants={{ hover: { gap: 12 } }}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          zIndex: 1,
        }}
      >
        Empezar
        <motion.span
          variants={{ hover: { x: 4 } }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          style={{ fontSize: 18, lineHeight: 1 }}
        >
          ♞
        </motion.span>
      </motion.span>
    </motion.button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: 'block',
          marginBottom: 6,
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function Segment({
  group,
  value,
  options,
  onChange,
}: {
  group: string
  value: string
  options: [string, string][]
  onChange: (v: string) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        background: 'var(--bg-2)',
        padding: 4,
        borderRadius: 'var(--radius-sm)',
      }}
    >
      {options.map(([val, label]) => (
        <motion.button
          key={val}
          onClick={() => onChange(val)}
          whileTap={{ scale: 0.93 }}
          transition={{ type: 'spring', stiffness: 500, damping: 26 }}
          style={{
            flex: 1,
            position: 'relative',
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            padding: '8px 4px',
            fontWeight: 600,
            color: value === val ? '#0c1a10' : 'var(--text-dim)',
          }}
        >
          {value === val && (
            <motion.span
              layoutId={`seg-active-${group}`}
              transition={{ type: 'spring', stiffness: 500, damping: 36 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--accent)',
                borderRadius: 9,
                zIndex: 0,
              }}
            />
          )}
          <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
        </motion.button>
      ))}
    </div>
  )
}

function TurnDot({ turn, thinking }: { turn: Color; thinking: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <motion.span
        animate={thinking ? { scale: [1, 1.35, 1] } : { scale: 1 }}
        transition={{ duration: 0.9, repeat: thinking ? Infinity : 0 }}
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: turn === 'white' ? 'var(--piece-white)' : 'var(--piece-black)',
          boxShadow: '0 0 0 2px var(--accent-soft)',
        }}
      />
      <span style={{ color: 'var(--text-dim)' }}>
        {thinking ? 'Pensando…' : turn === 'white' ? 'Blancas' : 'Negras'}
      </span>
    </div>
  )
}
