# Multi-ELO Opponents — Design Spec

**Date:** 2026-05-29
**Status:** Approved (pending written-spec review)
**Sub-project:** chess-model (extension)

## Goal

Offer multiple difficulty opponents in the chess web app — an ELO ladder of
**500, 1000, 1200, 1500, 1800, 2000, 2200** — instead of a single 2000-level
model. Every opponent is powered by **one strong flagship network** weakened at
inference time. Stockfish is used **only** to measure/calibrate ELO, never to
play against the user.

## Scope Separation

Two independent concerns are deliberately kept apart:

- **(A) The multi-level mechanism** — inference-time weakening, calibration, and
  per-level serving. Works with *any* checkpoint, including the current ~700-ELO
  model. **This spec covers (A).** It can be built and tested now.
- **(B) Training the flagship to ≥2000** — the long-running effort already
  underway (more Lichess months, more epochs). Not part of this spec. When a
  stronger checkpoint lands, calibration is simply re-run to regenerate the
  level config.

This separation means the feature is fully buildable today; the quality of the
high levels improves automatically as (B) progresses, with no code changes.

## Measured Baseline

A 20-game gauntlet of the current checkpoint vs Stockfish Skill 0 scored
**1.0/20 (~5%)**, placing the current model at roughly **600-900 ELO** (wide
margin, small sample). It is a fine low-level opponent today but far from 2000;
the flagship-training effort (B) continues in parallel.

## Architecture

```
App → Go backend → Python engine    POST /bestmove {fen, level}
                        │
                        ├─ profile = level_config.levels[level]
                        └─ MCTS(sims, temperature, blunder_rate, top_k, seed) → move

Offline (manual):  calibrate.py  → vs Stockfish → level_config.json (committed)
```

Components, each with one responsibility:

| Unit | Responsibility |
|------|----------------|
| `difficulty.py` | `DifficultyProfile` dataclass + move-selection policy (temperature sampling, blunder injection, top-k) given MCTS visit counts and net priors |
| `mcts.py` (modify) | Accept `sims` per call; expose visit counts to the selection policy |
| `engine.py` (modify) | `best_move(fen, profile, seed=None)` applies the profile; existing `best_move(fen, sims=...)` path preserved |
| `levelconfig.py` | Load/validate `level_config.json`; nearest-level lookup |
| `calibrate.py` | Tune knobs per target ELO vs Stockfish; write `level_config.json` |
| `elo.py` | ELO-from-score logistic formula + Stockfish anchor helpers |
| `serve.py` (modify) | `/bestmove` accepts `level`; resolves profile; backward-compatible with raw `sims` |

## Weakening Mechanism

The engine accepts a `DifficultyProfile`:

- **`sims`** — MCTS simulation count. Coarse strength control.
- **`temperature` (T)** — sample the move from the visit distribution `N^(1/T)`
  instead of argmax. `T == 0.0` → argmax (deterministic, strongest). Higher T
  spreads probability across MCTS-explored (good) moves only.
- **`blunder_rate` (p)** — with probability `p`, bypass the search result and
  pick a move sampled from a softmax over the net policy across **all legal
  moves** (including bad ones). This injects human-like mistakes that
  temperature alone cannot, and is the primary lever for reaching ≤1000.
- **`top_k`** — when sampling (temperature or blunder), restrict to the k
  best candidates (`0` = no restriction). Prevents absurd moves at mid levels.
- **`seed`** — optional RNG seed for reproducibility; tests pin it.

With `temperature == 0.0`, `blunder_rate == 0.0`, the engine is fully
deterministic and identical to current behavior.

### Move-selection algorithm (in `difficulty.py`)

Given MCTS visit counts `{move: N}` and net priors `{move: P}`:

1. Draw `r ~ U(0,1)` from the seeded RNG.
2. If `r < blunder_rate`: candidate distribution = softmax over net priors of all
   legal moves; else: distribution = `N^(1/T)` over visited moves
   (if `T == 0`, return `argmax(N)` directly).
3. If `top_k > 0`: keep the `top_k` highest-weighted candidates, renormalize.
4. Sample one move from the resulting distribution.

## Level Config

`configs/level_config.json` (committed), produced by calibration:

```json
{
  "model": "checkpoints/model.pt",
  "levels": {
    "500":  {"sims": 16,  "temperature": 1.2, "blunder_rate": 0.45, "top_k": 0},
    "1000": {"sims": 40,  "temperature": 1.0, "blunder_rate": 0.25, "top_k": 0},
    "1200": {"sims": 80,  "temperature": 0.8, "blunder_rate": 0.15, "top_k": 8},
    "1500": {"sims": 160, "temperature": 0.6, "blunder_rate": 0.07, "top_k": 6},
    "1800": {"sims": 320, "temperature": 0.4, "blunder_rate": 0.03, "top_k": 4},
    "2000": {"sims": 600, "temperature": 0.2, "blunder_rate": 0.01, "top_k": 3},
    "2200": {"sims": 800, "temperature": 0.0, "blunder_rate": 0.0,  "top_k": 0}
  }
}
```

Values above are seed defaults; calibration overwrites them. Levels are strings
(JSON keys); the loader parses them to ints for nearest-level lookup.

## Calibration

`calibrate.py` (run offline/manually; output committed):

- For each target ELO:
  - Configure the Stockfish anchor:
    - target ≥ 1320: `UCI_LimitStrength=true`, `UCI_Elo=target`.
    - target < 1320: `Skill Level` low + reduced depth/time (UCI_Elo cannot go
      below ~1320).
  - Play an N-game gauntlet (alternating colors) of the weakened flagship vs the
    anchor.
  - Compute the model's measured ELO from the score via `elo.py`.
  - Adjust knobs (grid/bisection over `sims`/`temperature`/`blunder_rate`) until
    `|measured - target| <= margin`.
  - Write the resulting profile into `level_config.json`.

ordo remains an optional external step for multi-opponent ELO; the built-in
single-anchor logistic estimate is sufficient for the ladder.

## ELO From Score (`elo.py`)

`elo_from_score(score, anchor_elo)`:

```
elo = anchor_elo + 400 * log10(score / (1 - score))
```

Clamp `score` away from 0 and 1 (e.g. to `[0.01, 0.99]`) to avoid infinities
with small samples.

## Serving API

`POST /bestmove`:

- Body `{ "fen": str, "level": int (optional), "sims": int (optional), "seed": int (optional) }`.
- If `level` present: resolve profile via nearest-level lookup; respond with the
  chosen move plus the `level` actually used.
- If only `sims` present (no `level`): current deterministic behavior.
- Response: `{ "move", "eval", "pv", "level"? }`.

`GET /levels` → the available ELO levels (for the frontend difficulty picker).

## Error Handling

- Unknown/out-of-range `level` → snap to nearest available level; report it in
  the response.
- Missing/invalid `level_config.json` → fall back to a built-in default profile
  (deterministic, full-strength) and log a warning.
- Stockfish binary missing (calibration only) → clear error; serving never needs
  Stockfish.

## Testing

All tests run without a GPU or a real Stockfish binary (use stubs):

- **Temperature sampling**: over many seeded draws, empirical move frequencies
  match `N^(1/T)` within tolerance; `T == 0` returns argmax deterministically.
- **Blunder injection**: over many seeded draws, fraction of "blunder-path"
  selections ≈ `blunder_rate` within tolerance.
- **top_k**: never selects a move outside the top-k set.
- **Determinism**: same seed + same inputs → identical move; `T==0, p==0` →
  identical to pre-existing engine output.
- **Config loader**: parses levels, nearest-level lookup, rejects malformed JSON.
- **ELO formula**: known score/anchor pairs produce expected ELO; clamping at
  extremes.
- **Calibration loop**: with a stub evaluator and a stub "Stockfish" whose
  strength is a fixed function, the tuner converges a knob toward the target.
- **Serving**: `/bestmove` with `level` uses the right profile (stub engine
  records the profile it received); `/levels` lists configured levels;
  backward-compatible `sims` path still works.

## Out of Scope

- Training the flagship to ≥2000 (concern B; existing ongoing effort).
- Frontend difficulty picker UI (frontend sub-project; this spec only exposes
  `GET /levels` and the `level` parameter).
- Multiple trained anchor models (decided against; single flagship + weakening).
