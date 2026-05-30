# ChessAI

Play chess against a model we trained from scratch to ~2000 ELO. Minimalist,
animated React UI · Go API · Python (PyTorch + DirectML) engine.

## Run it

```bash
# 1. Python engine (serves flagship_r3 on :8000)
cd chess-model && python -m chessmodel.serve

# 2. Go backend (:8080, forwards to the engine)
cd backend && go run ./cmd/server

# 3. Frontend (:5173)
cd frontend && npm install && npm run dev
```

Set `VITE_API_URL` if the backend isn't on `http://127.0.0.1:8080`.

## The model — how it was trained

AlphaZero-style supervised imitation: a ResNet with policy + value heads, trained
to predict moves/outcomes of strong Lichess games (both players 2000–2400, base
time ≥180s), driven by PUCT-MCTS at inference. Trained entirely on an **AMD RX
6700 XT** via `torch-directml` (no CUDA).

- **Data:** 3 Lichess months → ~67M positions, in 100k-position `.npz` shards.
- **Training:** streaming (out-of-core) + warm-started rounds on GPU.
- **Measurement:** gauntlet vs Stockfish (`UCI_Elo` anchors), logistic ELO estimate.

| Model | Data | ELO |
|-------|------|-----|
| baseline | 500k | ~700 |
| flagship_r1 | 10.8M · 3 ep | ~1300 |
| flagship_r2 | 10.8M · 8 ep | ~1665 |
| **flagship_r3** | 67M · +2 ep | **~2000–2120** (40.5/60 vs Stockfish-2000) |

Full account: [`chess-model/docs/training-log.md`](chess-model/docs/training-log.md).

## Difficulty levels

The flagship is weakened at inference (MCTS sims + move-sampling temperature +
blunder rate) to cover an ELO ladder (500–2200), picked in the UI as chips (no
slider). Exact per-level calibration is a separate step (`chess-model/chessmodel/calibrate.py`).

## Structure

- `chess-model/` — Python engine (training, MCTS, FastAPI serving).
- `backend/` — Go API (rules, in-memory games, model + fallback engines).
- `frontend/` — React + Vite + TypeScript UI.

## Credits

Piece sets (Monolito, Contorno, Neón) are original SVG art for this project.
