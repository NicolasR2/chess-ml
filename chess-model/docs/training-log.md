# Flagship Training Log — reaching ~2000 ELO

How the chess model was trained from scratch to ~2000 ELO on an AMD RX 6700 XT
(GPU, via PyTorch + DirectML, device `privateuseone:0`).

## Approach

AlphaZero-style **supervised imitation**: a ResNet with a policy head (move
prediction) and a value head (position evaluation), trained to predict the moves
and outcomes of strong human games, then driven by PUCT-MCTS at inference.

- **Board encoding:** 18 planes of 8×8 (12 piece planes + side-to-move + 4
  castling + en-passant). See `chessmodel/encoding.py`.
- **Move vocabulary:** deterministic enumeration of all from→to(+promotion)
  combinations → `POLICY_SIZE = 4544`.
- **Network:** `ChessNet(channels=64, blocks=6)` → `(policy_logits, value)`.
- **Loss:** `CrossEntropy(policy) + value_weight · MSE(value)`.

## Data

Lichess monthly databases (`.pgn.zst`), streamed and filtered to games where
**both players are rated 2000–2400** and the **base time control ≥ 180s**. Each
position in a qualifying game becomes a sample `(encoded_board, move_index,
outcome_from_side_to_move)`. Samples are written to compressed `.npz` shards of
100k positions each.

| Month | Shards | Positions |
|-------|-------:|----------:|
| 2016-02 (`shards_full`) | 108 | 10.8M |
| 2016-07 (`shards_2016_07`) | 277 | 27.7M |
| 2017-02 (`shards_2017_02`) | 285 | 28.5M |
| **Total** | **670** | **~67M** |

Preprocessing (python-chess parsing) is CPU-bound and slow — roughly an hour per
~100 shards.

## Training rounds

Each round trains on GPU and saves a CPU checkpoint. Rounds 1→3 use **streaming**
(`train_streaming`) so the 67M-position dataset never has to fit in RAM, and
**warm-start** (`--init-checkpoint`) so each round continues from the previous.

| Round | Checkpoint | Init from | Data | Epochs | Batch | Loss (first→last) |
|-------|-----------|-----------|------|-------:|------:|-------------------|
| baseline | `model.pt` | scratch | 500k (5 shards) | 10 | 512 | 4.63 → 1.45 |
| r1 | `flagship_r1.pt` | scratch | 10.8M | 3 | 1024 | 3.14 → 2.56 |
| r2 | `flagship_r2.pt` | r1 | 10.8M | 5 | 1024 | 2.49 → 2.34 |
| r3 | `flagship_r3.pt` | r2 | **67M** | 2 | 2048 | 2.42 → 2.37 |

Approx. wall-clock on the RX 6700 XT: ~45 min/epoch at 10.8M, ~2–3 h/epoch at 67M.

> The baseline overfit a tiny dataset (loss 1.45 but weak play). From r1 on,
> loss is measured on much larger/more varied data, so absolute loss is not
> directly comparable across rounds — ELO is the real metric.

## ELO measurement

Gauntlet vs Stockfish (`chessmodel/evaluate.py`), alternating colors, Stockfish
limited with `UCI_LimitStrength` + `UCI_Elo` (or Skill Level below 1320). Model
ELO is estimated from the score with the logistic formula
`anchor + 400·log10(score/(1−score))` (`chessmodel/elo.py`).

| Model | Result | Est. ELO |
|-------|--------|---------:|
| baseline | 1.0/20 vs Skill 0 | ~700 |
| flagship_r1 | 12.5/20 vs Skill 0 | ~1300 |
| flagship_r2 | 9.0/20 vs UCI_Elo 1700 | ~1665 |
| flagship_r3 | 11.5/20 vs UCI_Elo 1800 | ~1853 |
| flagship_r3 | 16.0/24 vs UCI_Elo 2000 | ~2120 |
| **flagship_r3** | **40.5/60 vs UCI_Elo 2000** | **~2127** |

**flagship_r3 holds a winning record (67.5%) over 60 games against Stockfish set
to 2000 ELO → the ~2000 goal is met.**

### Measurement caveats

- Stockfish's `UCI_Elo` limiter at 0.1s/move is not perfectly calibrated; the
  vs-1800 and vs-2000 estimates disagree by more than ideal, consistent with
  small-sample noise (±~90–190 ELO) plus limiter imprecision.
- Single-anchor logistic estimate, not a full ordo/bayeselo rating. Treat the
  number as ~1900–2120; the 60-game vs-2000 run is the most reliable point.
- To tighten: larger gauntlets at several anchors and compute ELO with `ordo`.

## How to reproduce

```bash
cd chess-model
# 1. Download a month and preprocess to shards
curl -L -o data/lichess_2016-02.pgn.zst \
  https://database.lichess.org/standard/lichess_db_standard_rated_2016-02.pgn.zst
python -m chessmodel.preprocess --pgn-zst data/lichess_2016-02.pgn.zst --out-dir data/shards_2016_02

# 2. Train (streaming; warm-start optional). Multiple shard globs are comma-separated.
python -m chessmodel.train \
  --shards "data/shards_2016_02/*.npz" \
  --epochs 3 --batch-size 1024 --chunk-shards 8 \
  --out checkpoints/flagship.pt
# continue: add --init-checkpoint checkpoints/flagship.pt

# 3. Measure ELO vs Stockfish
python -m chessmodel.evaluate --checkpoint checkpoints/flagship.pt \
  --stockfish tools/stockfish/stockfish-windows-x86-64-avx2.exe \
  --games 60 --sims 120 --uci-elo 2000
```

## Next steps

- **Calibrate the multi-ELO ladder** (`chessmodel/calibrate.py`) against
  Stockfish using flagship_r3, regenerating `configs/level_config.json` for the
  500–2200 opponents. (Recommended improvement first: add a move cap /
  adjudication so weak-vs-weak games can't drag on.)
- **Promote** flagship_r3 as the served model.
- Optional: more months / a larger network (channels 128) to push ELO higher.
