# chess-ai

A chess web app where you play against a custom-trained model. Three sub-projects:

1. **chess-model** (Python) — the engine: a trained neural net + MCTS, served over
   HTTP. **Status: working; flagship plays at ~2000 ELO.**
2. **backend** (Go) — game/API server (not started yet).
3. **frontend** (React + Vite) — minimalist, rounded, animation-first UI
   (in progress on branch `feat/web-app`).

## Repo layout & branches

- `master` — base (specs + plans).
- `feat/chess-model` — the model sub-project (PR #1). All model work lands here.
- `feat/web-app` — the frontend sub-project (separate, in progress).

Specs/plans live in `docs/superpowers/`. Training details: `chess-model/docs/training-log.md`.

> **Worktree note:** the model code only exists on `feat/chess-model`. If the
> working tree is checked out on `feat/web-app`, switching branches removes the
> model source. To run/train the model without disturbing frontend work, use an
> isolated worktree:
> `git worktree add .verify-chessmodel feat/chess-model` and run from there.
> Trained checkpoints and data live in `chess-model/{checkpoints,data}` (gitignored,
> untracked) so they survive branch switches.

## chess-model

Package: `chess-model/chessmodel/`. Run commands from the `chess-model/` directory.

- `encoding.py` — board → 18×8×8 planes; move ↔ index (`POLICY_SIZE = 4544`).
- `model.py` — `ChessNet(channels, blocks)` → `(policy_logits, value)`.
- `dataset.py` / `preprocess.py` — stream Lichess `.pgn.zst`, filter (both players
  2000–2400, base TC ≥180s), write 100k-position `.npz` shards.
- `train.py` — `train_on_arrays`, `train_streaming` (chunked, scales beyond RAM),
  `init_from_checkpoint` (warm start). CLI `--shards` accepts comma-separated globs.
- `mcts.py` — PUCT-MCTS. `engine.py` — `Engine.best_move(fen, sims|profile, seed)`.
- `difficulty.py` — `DifficultyProfile` + `select_move` (temperature, blunder rate,
  top-k) to weaken the flagship into lower ELO levels.
- `levelconfig.py` + `configs/level_config.json` — ELO ladder (500–2200) → profiles.
- `calibrate.py` — tune per-level knobs vs Stockfish (`measure_elo`, `tune_profile`).
- `elo.py` — `elo_from_score`, `stockfish_anchor_options`.
- `serve.py` — FastAPI: `POST /bestmove {fen, level|sims, seed}`, `GET /levels`.
- `evaluate.py` — gauntlet vs Stockfish; `--uci-elo` anchors and prints an ELO estimate.

### Multi-ELO design

One strong flagship net, weakened at inference (sims + temperature + blunder rate +
top-k) to cover the whole 500–2200 ladder. Stockfish is used **only** to
measure/calibrate ELO, never to play the user. See
`docs/superpowers/specs/2026-05-29-multi-elo-design.md`.

### Current model status

flagship_r3 ≈ **2000–2120 ELO** (40.5/60 vs Stockfish UCI_Elo 2000). Trained on 67M
positions from 3 Lichess months over 3 warm-started rounds. Full account in
`chess-model/docs/training-log.md`. The 500–2200 ladder still needs real calibration
with this flagship (`calibrate.py`).

## GPU / DirectML (critical)

Training runs on an **AMD RX 6700 XT via `torch-directml`** — NOT CUDA, NOT ROCm.

- Every training/inference script: `import torch_directml; device = torch_directml.device()`
  → `privateuseone:0`. Do **not** call `torch.cuda.*` (unsupported).
- The Python env is the global Python 3.12 (Microsoft Store build) that already has
  `torch==2.4.1`, `torch-directml==0.2.5`, `chess`, `zstandard`, `fastapi`. The
  process shows up as **`python3.12.exe`** (not `python`) in tasklist.
- An Adam `aten::lerp` CPU-fallback warning is expected and harmless.

### Gotchas learned the hard way

- **Save checkpoints on CPU.** DirectML tensors don't survive
  `torch.load(weights_only=True)`. `train.py` moves the net to CPU before saving.
- **Load with `map_location="cpu"`**, then move the net to the device.
  `torch.load(map_location=<directml device>)` crashes inside torch-directml.
- **`train.py` streams shards** (`train_streaming`, `--chunk-shards`). Don't load all
  shards into one array — 67M positions ≈ 49 GB decompressed. ~32 GB RAM total.
- **python-chess** is imported as `chess` (PyPI package name is `chess`).

## Testing

`cd chess-model && python -m pytest -q`. All tests run **without a GPU or a real
Stockfish** (tiny CPU `ChessNet(16,1)` + stubs). Keep them GPU-free. Currently 43 tests.

## Workflow

TDD with the superpowers skills (brainstorm → spec → plan → execute → finish).
Commit messages end with the Co-Authored-By trailer.
