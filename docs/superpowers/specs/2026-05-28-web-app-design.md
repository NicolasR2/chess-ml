# Diseño: Aplicación web de ajedrez (frontend + backend Go) — sub-proyectos 2 y 3

**Fecha:** 2026-05-28
**Estado:** Aprobado en brainstorming
**Goal:** Construir una app web para jugar ajedrez con frontend React+Vite minimalista (estilo *Chess in the Park* de Discord: verdes llamativos + blanco, bordes redondeados, animation-first) y un backend en Go que sea la fuente de verdad de las reglas y sirva al rival. El modelo (sub-proyecto 1) se enchufa después vía HTTP; esta fase incluye un rival fallback para que la app sea jugable ya.

## Contexto y alcance

La aplicación completa son tres sub-proyectos (ver `2026-05-28-chess-model-design.md`):

1. **Modelo de ajedrez** (Python, GPU) — en progreso en rama `feat/chess-model`.
2. **Backend Go** — *este documento*.
3. **Frontend React + Vite** — *este documento*.

El modelo expone `POST /bestmove {fen, sims}` → `{move, eval, pv}`. El backend Go consumirá ese endpoint cuando exista.

## Arquitectura general

Monorepo. Junto a `chess-model/`:

```
chess-ai/
  chess-model/   # sub-proyecto 1 (Python)
  backend/       # API Go
  frontend/      # React + Vite + TS
```

Flujo de datos:

1. React muestra el tablero y, con `chess.js`, calcula jugadas legales y aplica la jugada de forma **optimista** (UX fluida) animándola.
2. React manda el movimiento al backend Go.
3. Go **valida** contra el estado autoritativo (`notnil/chess`), lo aplica y, si es modo IA y es turno del rival, **computa la respuesta** (fallback o modelo) y la devuelve.
4. Si Go discrepa de la jugada del cliente, React revierte al estado del servidor.

## Backend Go

- **Router:** `go-chi/chi` con middleware de CORS y logging.
- **Reglas/estado:** `notnil/chess` como fuente de verdad. Partidas en memoria: `map[string]*Game` protegido por `sync.RWMutex`.
- **Identificadores:** UUID por partida.

### Endpoints

| Método | Ruta | Body | Respuesta |
|--------|------|------|-----------|
| GET | `/api/health` | — | `{status:"ok"}` |
| POST | `/api/games` | `{mode:"ai"\|"local", color:"white"\|"black"\|"random", sims:int}` | `{id, fen, turn, playerColor}` |
| GET | `/api/games/{id}` | — | `{fen, turn, status, history}` |
| POST | `/api/games/{id}/moves` | `{from, to, promotion?}` | `{fen, turn, status, lastMove, aiMove?}` |

- `turn` ∈ `"white"|"black"`. `status` ∈ `"ongoing"|"check"|"checkmate"|"stalemate"|"draw"`.
- `lastMove`/`aiMove` en formato `{from, to, promotion?}` (UCI-friendly).
- Errores: `400` move ilegal o cuerpo inválido, `404` partida inexistente, `409` no es tu turno / partida terminada.
- En modo IA, si tras la jugada del humano le toca al rival, la respuesta incluye `aiMove` ya aplicado y el `fen`/`status` resultante.

### Rival (interfaz `Engine`)

```go
type Engine interface {
    BestMove(ctx context.Context, fen string, sims int) (move string, err error)
}
```

- **`FallbackEngine`** — minimax con poda alfa-beta poco profundo (prof. 2–3), evaluación de material + movilidad simple. Garantiza jugadas legales. Default de esta fase. Jugable hoy.
- **`ModelEngine`** — cliente HTTP a `POST {MODEL_URL}/bestmove {fen,sims}` → toma `move`. Para cuando el modelo esté entrenado.
- **Selección por entorno:** `CHESS_ENGINE=fallback|model` (default `fallback`), `MODEL_URL` (default `http://127.0.0.1:8000`).

### Estructura backend

```
backend/
  cmd/server/main.go      # arranque, lee env, monta router
  internal/api/           # handlers + router (chi) + DTOs
  internal/game/          # store en memoria + envoltura notnil/chess
  internal/engine/        # interfaz Engine + fallback + model client
  go.mod
```

## Frontend React

- **Stack:** Vite + React + TypeScript. `chess.js` para legalidad/estado en cliente. `framer-motion` para animaciones.
- **Hook `useGame`:** envuelve una instancia de `chess.js` y el cliente API; expone `fen`, `legalMovesFor(square)`, `move(from,to,promotion)`, `status`, `lastMove`, `newGame(opts)`. Aplica optimista y reconcilia con la respuesta de Go (incluida `aiMove`).
- **Cliente API:** módulo `api.ts` con `createGame`, `getGame`, `postMove`.

### Componentes

- `App` — layout, provee estado de partida.
- `Board` — grid 8×8; orienta según color del jugador; gestiona selección y drag.
- `Square` — casilla; muestra resaltados (selección, última jugada, punto de jugada legal, pulso de jaque).
- `Piece` — pieza SVG; `layoutId` estable por pieza para que Framer Motion anime el desplazamiento.
- `Sidebar` — nueva partida (modo, color, dificultad/sims), lista de jugadas (SAN), estado.
- `StatusBanner` — jaque/mate/tablas, fin de partida.

### Animaciones (Framer Motion)

- **Desliz de pieza:** `layout`/`layoutId` por pieza.
- **Captura:** fade-out de la pieza capturada.
- **Última jugada:** resaltado suave de casillas origen/destino.
- **Jugadas legales:** puntos que aparecen con spring al seleccionar.
- **Jaque:** pulso en la casilla del rey.

## Estética (estilo *Chess in the Park*)

- Bordes redondeados en todo; sin marcos puntiagudos. Paleta en variables CSS.
- Casillas claras: `#F4F7F2` (blanco/crema). Casillas oscuras: verde llamativo `#5DAE5D`.
- Acento / puntos legales / realces: verde Discord `#57F287`.
- Fondo: verde-carbón oscuro suave. Transiciones suaves globales.
- Piezas: set SVG plano y limpio incluido en el repo.

### Estructura frontend

```
frontend/
  index.html
  vite.config.ts
  src/
    main.tsx, App.tsx
    components/  # Board, Square, Piece, Sidebar, StatusBanner
    hooks/useGame.ts
    lib/api.ts
    assets/pieces/   # SVG de piezas
    styles/          # variables y base
```

## Testing

- **Go:** unit tests de handlers (validación de move, turnos, fin de partida), legalidad del `FallbackEngine`, y `ModelEngine` con `net/http/httptest`.
- **Front:** Vitest + Testing Library para `useGame` (aplicar/revertir, reconciliar `aiMove`) y lógica de componentes. La animación no se testea; sí la lógica.

## Riesgos

- **Reconciliación optimista compleja:** mitigación manteniendo la respuesta de Go como verdad y revirtiendo ante discrepancia.
- **`layoutId` y re-render:** IDs de pieza estables para evitar saltos de animación.
- **Estado en memoria se pierde al reiniciar:** aceptable en esta fase; persistencia queda fuera de alcance.

## Fuera de alcance

- Entrenamiento del modelo (sub-proyecto 1).
- Persistencia de partidas, cuentas/usuarios, multijugador en red, reloj/tiempos.
- Despliegue (se aborda con las skills de deploy más adelante).

## Git

Rama `feat/web-app` desde `master`. Commits incrementales (spec, backend, frontend) y push a `origin`.
