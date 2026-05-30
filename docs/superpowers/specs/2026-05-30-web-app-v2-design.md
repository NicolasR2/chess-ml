# Web App v2 — Design Spec

**Date:** 2026-05-30
**Status:** Approved (pending written-spec review)
**Sub-project:** web app (frontend + Go backend) — builds on the existing
`feat/web-app` work and integrates the trained `flagship_r3` (~2000 ELO) model.

## Goal

Turn the current single-screen chess UI into a polished, multi-page app that
plays against our trained model across discrete ELO levels (no slider), with a
distinctive look, custom SVG pieces, page navigation, and richer animations.
Document the training process in the repo README.

## Scope separation

This spec covers the **web app v2** (frontend overhaul + thin backend/serving
integration). It deliberately excludes:

- Training the model further or **calibrating** the ELO ladder (separate effort
  with `chess-model/chessmodel/calibrate.py`; here we use the existing seed
  levels as-is).
- Online multiplayer, accounts, server-side game persistence (games stay
  in-memory as today).

## Current state (baseline)

- **Frontend** (`frontend/`, React + Vite + TypeScript, framer-motion): a single
  screen (`App.tsx`) with `Board`, `Sidebar`, `StatusBanner`. Difficulty is a
  **slider over `sims`**. Pieces are Unicode glyphs tinted via CSS. Board
  coordinates are corner `<span>`s that get clipped by the rounded board corners.
  No router. Tests via vitest (`useGame.test`, `api.test`).
- **Backend** (`backend/`, Go + chi): `POST /api/games {mode,color,sims}`,
  `GET /api/games/:id`, `POST /api/games/:id/moves`. `engine.Engine.BestMove(ctx,
  fen, sims)` with a `Model` (HTTP to Python `/bestmove {fen,sims}`) and a
  `fallback` engine. Tests for engine/fallback/handlers/store.
- **Python engine** (`chess-model/`): FastAPI `POST /bestmove {fen, level|sims,
  seed}`, `GET /levels`. Already supports per-level play; serves a checkpoint.

## Architecture — end-to-end ELO (no slider)

```
Frontend (ELO chip) → Go POST /api/games {mode,color,level}
   → engine.BestMove(fen, level) → Python POST /bestmove {fen, level}
   → flagship_r3 weakened by the level profile → move (UCI)
```

Route gameplay through the **existing Go backend** (it owns rules, game state,
and the fallback engine). The frontend never calls Python directly.

### Per-layer changes

**Python (`chess-model/`):**
- Serve `checkpoints/flagship_r3.pt` by default (update `serve.py` default
  `--checkpoint` and `configs/level_config.json` `"model"` field).
- No new endpoints; `/bestmove {fen, level}` and `/levels` already exist.
- Levels use existing **seed** profiles (uncalibrated) — functional, distinct
  strengths; exact ELO is refined later via `calibrate.py` (out of scope).

**Go (`backend/`):**
- `createReq` gains `Level int` (keep `Sims` for backward-compat/fallback).
- `engine.Engine` interface: `BestMove(ctx, fen string, level int) (string, error)`.
  Keep a sims-based path internally where needed; `Model` posts `{fen, level}`
  when level > 0, else `{fen, sims}`.
- `game.Game` stores `Level` (alongside/instead of `Sims`).
- New `GET /api/levels` → proxies the Python `/levels` (with a static fallback
  list `[500,1000,1200,1500,1800,2000,2200]` if the engine is down).
- `fallback` engine keeps working (random/heuristic) when Python is unreachable;
  it ignores level.

**Frontend (`frontend/`):**
- `lib/api.ts`: `CreateOpts` uses `level?: number` (drop `sims` from the UI path);
  add `getLevels()`.
- `useGame`: thread `level` through `newGame`.
- Replace the `sims` slider with the **ELO chip grid**.

## Pages & navigation

Add **react-router-dom**. Animated page transitions (framer-motion
`AnimatePresence`).

| Route | Page | Contents |
|-------|------|----------|
| `/` | **Menu** | Split layout: left = brand + animated board backdrop; right = cards: *Jugar vs IA*, *Local*, *Ajustes*, *El modelo*. |
| `/play` | **Vs IA** | Quick setup (color + **ELO chip grid**) → game screen. |
| `/local` | **Local** | Two players, same device (no AI). Reuses the game screen. |
| `/settings` | **Ajustes** | Piece set, board theme, toggles (coordinates, animations). Persisted to localStorage. |
| `/about` | **El modelo** | In-app training summary + ELO progress table (friendly version of `chess-model/docs/training-log.md`). |

State: `useGame` stays the source of truth for a game. A new `SettingsContext`
(piece set, board theme, animation/coords toggles) is read by `Board`/`Piece`
and persisted to localStorage.

## Pieces (SVG) & board

- Rewrite `Piece` to render **SVG** (not Unicode glyphs). A `pieces/` module
  exports sets, each a map of the 6 types (k,q,r,b,n,p) to SVG path data on a
  `0 0 45 45` viewBox. Color (white/black) applied via `fill`/`stroke` per theme.
- **Sets shipped:**
  - **Monolito** (signature) — solid two-tone silhouettes with a thin edge stroke
    (the approved direction). New, authored in-repo.
  - **Contorno** — monoline (stroke-only) variant of the same paths.
  - **Clásico** — an open-licensed Staunton SVG set, with attribution in `/about`
    and a `NOTICE`/credit file.
- **No emojis anywhere** — avatars use a piece silhouette; icons are inline SVG.
- **Board coordinate fix:** render files/ranks in an **outer margin grid** that
  shares the board's column/row tracks (rank labels left, file labels bottom), so
  the rounded board corners never clip them. The board grid keeps `overflow:
  hidden` + `border-radius`; coordinates live outside it.

## Animations (framer-motion)

- **Page transitions** between menu/play/settings/about.
- **Pieces:** slide from→to (keep existing), select scale, **capture** (captured
  piece fades/shrinks), **castling** (king+rook), **promotion** (pop).
- **Board:** last-move and legal-move highlights (keep), **check** pulse on the
  king, **game-over** overlay (win/draw/loss).
- **UI:** card hover (lift + sheen), ELO chip selection (shared-layout
  indicator), AI "thinking" indicator.
- Respect `prefers-reduced-motion` (degrade to minimal/instant).

## Settings (localStorage)

`SettingsContext` persists: `pieceSet` ("monolito"|"contorno"|"clasico"),
`boardTheme` (a few palettes), `showCoordinates` (bool), `animations` (bool).
Defaults: monolito, emerald theme, coordinates on, animations on.

## README (repo root)

Rewrite `README.md`:
- What the app is + how to run the 3 parts (Python engine, Go backend, frontend)
  with ports.
- **Training summary**: approach (supervised imitation of 2000–2400 games +
  MCTS), data (3 Lichess months, ~67M positions), 3 streaming/warm-started GPU
  rounds on AMD/DirectML, and the **ELO progress table** (~700 → ~1300 → ~1665 →
  ~2000–2120), linking to `chess-model/docs/training-log.md`.
- Stack, repo layout, and attribution for the classic piece set.

## Testing

Keep existing suites green; add focused tests. No GPU/network/real-Stockfish.

- **Frontend (vitest):** `api.test` asserts `level` is sent and `getLevels()`
  parses; a `Piece` render test per set (correct SVG for a code); a
  `SettingsContext` test (persists/reads localStorage, mocked). Mock `fetch`.
- **Go:** update `handlers_test`/`model_test` for the `level` field; `Model`
  posts `{fen, level}`; `/api/levels` returns the list (with fallback when the
  engine is down). Fallback engine still covered.
- **Python:** existing 43 tests stay green (serving by `level` already tested).

## Out of scope

- ELO calibration, further training (separate `chess-model` efforts).
- Accounts, online multiplayer, persistent storage, saved games.
- A full custom SVG set beyond the three above (knight/bishop get refined during
  implementation but stay within the Monolito direction).
