# Chess Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Train a custom chess engine (policy+value net + MCTS) to ~2000 ELO on an AMD GPU via torch-directml, served as a Python API for a Go backend.

**Architecture:** Supervised learning of a small ResNet (policy head over a fixed move vocabulary + scalar value head) on filtered Lichess games, then PUCT-MCTS at inference. Strength measured by a gauntlet vs calibrated Stockfish.

**Tech Stack:** Python 3.10+, PyTorch 2.4.1 + torch-directml 0.2.5, python-chess, zstandard, numpy, FastAPI, pytest, Stockfish (eval), ordo (ELO calc).

**Working directory for all tasks:** `C:\Users\nicop\Downloads\chess-ai\chess-model`
**Package name:** `chessmodel` (maps to the spec's `src/`). Run `pytest` from the working directory.

> Note: inference uses `model.train(False)` to put BatchNorm/Dropout in inference mode (equivalent to PyTorch's eval mode) — written this way deliberately.

---

### Task 0: Project setup

**Files:**
- Create: `chess-model/requirements.txt`
- Create: `chess-model/chessmodel/__init__.py` (empty)
- Create: `chess-model/tests/__init__.py` (empty)
- Create: `chess-model/.gitignore`
- Create: `chess-model/pytest.ini`

- [ ] **Step 1: Create directory layout and empty package files**

```bash
cd C:\Users\nicop\Downloads\chess-ai\chess-model
mkdir chessmodel tests data checkpoints configs
ni chessmodel\__init__.py -ItemType File
ni tests\__init__.py -ItemType File
```

- [ ] **Step 2: Write `requirements.txt`**

```
torch==2.4.1
torch-directml==0.2.5
python-chess==1.999
zstandard==0.22.0
numpy==1.26.4
fastapi==0.111.0
uvicorn==0.30.1
pytest==8.2.0
httpx==0.27.0
```

- [ ] **Step 3: Write `.gitignore`**

```
__pycache__/
*.pyc
data/*.pgn
data/*.zst
data/*.npz
checkpoints/*.pt
.venv/
```

- [ ] **Step 4: Write `pytest.ini`**

```ini
[pytest]
testpaths = tests
```

- [ ] **Step 5: Install deps and verify directml**

Run: `pip install -r requirements.txt`
Then run: `python -c "import torch_directml; print(torch_directml.device())"`
Expected: prints `privateuseone:0`

- [ ] **Step 6: Commit**

```bash
git add chess-model/requirements.txt chess-model/.gitignore chess-model/pytest.ini chess-model/chessmodel/__init__.py chess-model/tests/__init__.py
git commit -m "chore: scaffold chess-model project"
```

---

### Task 1: Board encoding

**Files:**
- Create: `chessmodel/encoding.py`
- Test: `tests/test_encoding_board.py`

- [ ] **Step 1: Write the failing test**

```python
import numpy as np
import chess
from chessmodel.encoding import encode_board, PLANE_COUNT

def test_encode_startpos_shape_and_pawns():
    board = chess.Board()
    x = encode_board(board)
    assert x.shape == (PLANE_COUNT, 8, 8)
    assert x.dtype == np.float32
    # white pawns are plane 0 on rank 2 (index 1)
    assert x[0, 1, :].sum() == 8
    # black pawns are plane 6 on rank 7 (index 6)
    assert x[6, 6, :].sum() == 8
    # white to move -> plane 12 all ones
    assert x[12].sum() == 64

def test_encode_side_to_move_flips():
    board = chess.Board()
    board.push_san("e4")
    x = encode_board(board)
    assert x[12].sum() == 0  # black to move
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_encoding_board.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'chessmodel.encoding'`

- [ ] **Step 3: Write minimal implementation**

```python
import numpy as np
import chess

PLANE_COUNT = 18

_PIECE_TO_PLANE = {
    (chess.PAWN, chess.WHITE): 0, (chess.KNIGHT, chess.WHITE): 1,
    (chess.BISHOP, chess.WHITE): 2, (chess.ROOK, chess.WHITE): 3,
    (chess.QUEEN, chess.WHITE): 4, (chess.KING, chess.WHITE): 5,
    (chess.PAWN, chess.BLACK): 6, (chess.KNIGHT, chess.BLACK): 7,
    (chess.BISHOP, chess.BLACK): 8, (chess.ROOK, chess.BLACK): 9,
    (chess.QUEEN, chess.BLACK): 10, (chess.KING, chess.BLACK): 11,
}

def encode_board(board: chess.Board) -> np.ndarray:
    planes = np.zeros((PLANE_COUNT, 8, 8), dtype=np.float32)
    for sq, piece in board.piece_map().items():
        r, f = chess.square_rank(sq), chess.square_file(sq)
        planes[_PIECE_TO_PLANE[(piece.piece_type, piece.color)], r, f] = 1.0
    if board.turn == chess.WHITE:
        planes[12, :, :] = 1.0
    if board.has_kingside_castling_rights(chess.WHITE):  planes[13, :, :] = 1.0
    if board.has_queenside_castling_rights(chess.WHITE): planes[14, :, :] = 1.0
    if board.has_kingside_castling_rights(chess.BLACK):  planes[15, :, :] = 1.0
    if board.has_queenside_castling_rights(chess.BLACK): planes[16, :, :] = 1.0
    if board.ep_square is not None:
        planes[17, chess.square_rank(board.ep_square), chess.square_file(board.ep_square)] = 1.0
    return planes
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_encoding_board.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add chessmodel/encoding.py tests/test_encoding_board.py
git commit -m "feat: board-to-tensor encoding"
```

---

### Task 2: Move vocabulary (policy index)

**Files:**
- Modify: `chessmodel/encoding.py` (append)
- Test: `tests/test_encoding_moves.py`

- [ ] **Step 1: Write the failing test**

```python
import chess
from chessmodel.encoding import (
    move_to_index, index_to_move, POLICY_SIZE
)

def test_policy_size_reasonable():
    assert 4000 < POLICY_SIZE < 5000

def test_roundtrip_all_legal_startpos():
    board = chess.Board()
    for m in board.legal_moves:
        idx = move_to_index(m)
        assert 0 <= idx < POLICY_SIZE
        assert index_to_move(idx).uci() == m.uci()

def test_roundtrip_promotion():
    board = chess.Board("8/P7/8/8/8/8/8/k6K w - - 0 1")
    promo_moves = [m for m in board.legal_moves if m.promotion]
    assert promo_moves
    for m in promo_moves:
        assert index_to_move(move_to_index(m)).uci() == m.uci()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_encoding_moves.py -v`
Expected: FAIL with `ImportError: cannot import name 'move_to_index'`

- [ ] **Step 3: Append minimal implementation to `chessmodel/encoding.py`**

```python
def _generate_all_moves():
    moves, seen = [], set()
    for from_sq in chess.SQUARES:
        for to_sq in chess.SQUARES:
            if from_sq == to_sq:
                continue
            base = chess.Move(from_sq, to_sq)
            if base.uci() not in seen:
                seen.add(base.uci()); moves.append(base)
            fr, tr = chess.square_rank(from_sq), chess.square_rank(to_sq)
            if (fr == 6 and tr == 7) or (fr == 1 and tr == 0):
                for promo in (chess.QUEEN, chess.ROOK, chess.BISHOP, chess.KNIGHT):
                    m = chess.Move(from_sq, to_sq, promotion=promo)
                    if m.uci() not in seen:
                        seen.add(m.uci()); moves.append(m)
    return moves

ALL_MOVES = _generate_all_moves()
MOVE_TO_IDX = {m.uci(): i for i, m in enumerate(ALL_MOVES)}
POLICY_SIZE = len(ALL_MOVES)

def move_to_index(move: chess.Move) -> int:
    return MOVE_TO_IDX[move.uci()]

def index_to_move(idx: int) -> chess.Move:
    return ALL_MOVES[idx]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_encoding_moves.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add chessmodel/encoding.py tests/test_encoding_moves.py
git commit -m "feat: fixed move vocabulary for policy head"
```

---

### Task 3: ResNet policy+value model

**Files:**
- Create: `chessmodel/model.py`
- Test: `tests/test_model.py`

- [ ] **Step 1: Write the failing test**

```python
import torch
from chessmodel.model import ChessNet
from chessmodel.encoding import PLANE_COUNT, POLICY_SIZE

def test_forward_shapes_and_value_range():
    net = ChessNet(channels=16, blocks=2)
    net.train(False)
    x = torch.randn(4, PLANE_COUNT, 8, 8)
    policy, value = net(x)
    assert policy.shape == (4, POLICY_SIZE)
    assert value.shape == (4, 1)
    assert torch.all(value <= 1.0) and torch.all(value >= -1.0)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_model.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'chessmodel.model'`

- [ ] **Step 3: Write minimal implementation**

```python
import torch
import torch.nn as nn
from chessmodel.encoding import PLANE_COUNT, POLICY_SIZE

class _ResBlock(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.c1 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.b1 = nn.BatchNorm2d(c)
        self.c2 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.b2 = nn.BatchNorm2d(c)

    def forward(self, x):
        y = torch.relu(self.b1(self.c1(x)))
        y = self.b2(self.c2(y))
        return torch.relu(x + y)

class ChessNet(nn.Module):
    def __init__(self, channels=64, blocks=6, policy_size=POLICY_SIZE):
        super().__init__()
        self.stem = nn.Sequential(
            nn.Conv2d(PLANE_COUNT, channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(channels), nn.ReLU())
        self.res = nn.Sequential(*[_ResBlock(channels) for _ in range(blocks)])
        self.p_conv = nn.Sequential(
            nn.Conv2d(channels, 32, 1, bias=False), nn.BatchNorm2d(32), nn.ReLU())
        self.p_fc = nn.Linear(32 * 8 * 8, policy_size)
        self.v_conv = nn.Sequential(
            nn.Conv2d(channels, 32, 1, bias=False), nn.BatchNorm2d(32), nn.ReLU())
        self.v_fc1 = nn.Linear(32 * 8 * 8, 256)
        self.v_fc2 = nn.Linear(256, 1)

    def forward(self, x):
        x = self.res(self.stem(x))
        p = self.p_fc(self.p_conv(x).flatten(1))
        v = torch.relu(self.v_fc1(self.v_conv(x).flatten(1)))
        v = torch.tanh(self.v_fc2(v))
        return p, v
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_model.py -v`
Expected: PASS (1 passed)

- [ ] **Step 5: Commit**

```bash
git add chessmodel/model.py tests/test_model.py
git commit -m "feat: ResNet policy+value network"
```

---

### Task 4: Dataset sample extraction from PGN

**Files:**
- Create: `chessmodel/dataset.py`
- Test: `tests/test_dataset.py`

- [ ] **Step 1: Write the failing test**

```python
import io
import numpy as np
from chessmodel.dataset import iter_samples_from_pgn
from chessmodel.encoding import PLANE_COUNT

PGN_IN_RANGE = """[Event "Rated Blitz game"]
[White "a"]
[Black "b"]
[Result "1-0"]
[WhiteElo "2100"]
[BlackElo "2150"]
[TimeControl "300+3"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0
"""

PGN_OUT_OF_RANGE = """[Event "x"]
[White "a"]
[Black "b"]
[Result "1-0"]
[WhiteElo "1200"]
[BlackElo "1250"]
[TimeControl "300+3"]

1. e4 e5 1-0
"""

def test_extracts_samples_in_range():
    samples = list(iter_samples_from_pgn(io.StringIO(PGN_IN_RANGE)))
    assert len(samples) > 0
    x, idx, v = samples[0]
    assert x.shape == (PLANE_COUNT, 8, 8)
    assert isinstance(idx, int)
    assert v in (-1.0, 0.0, 1.0)
    # white wins; first sample is white to move -> value +1
    assert v == 1.0

def test_skips_out_of_range():
    samples = list(iter_samples_from_pgn(io.StringIO(PGN_OUT_OF_RANGE)))
    assert samples == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_dataset.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'chessmodel.dataset'`

- [ ] **Step 3: Write minimal implementation**

```python
import chess
import chess.pgn
from chessmodel.encoding import encode_board, move_to_index

def iter_samples_from_pgn(fileobj, min_elo=2000, max_elo=2400, min_base_seconds=180):
    while True:
        game = chess.pgn.read_game(fileobj)
        if game is None:
            break
        try:
            we = int(game.headers.get("WhiteElo", "0"))
            be = int(game.headers.get("BlackElo", "0"))
        except ValueError:
            continue
        if not (min_elo <= we <= max_elo and min_elo <= be <= max_elo):
            continue
        base = game.headers.get("TimeControl", "").split("+")[0]
        if base.isdigit() and int(base) < min_base_seconds:
            continue
        result = game.headers.get("Result")
        if result == "1-0":
            outcome = 1.0
        elif result == "0-1":
            outcome = -1.0
        elif result == "1/2-1/2":
            outcome = 0.0
        else:
            continue
        board = game.board()
        for move in game.mainline_moves():
            stm_white = board.turn == chess.WHITE
            x = encode_board(board)
            try:
                idx = move_to_index(move)
            except KeyError:
                board.push(move)
                continue
            if outcome == 0.0:
                v = 0.0
            else:
                white_won = outcome == 1.0
                v = 1.0 if (white_won == stm_white) else -1.0
            yield x, idx, v
            board.push(move)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_dataset.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add chessmodel/dataset.py tests/test_dataset.py
git commit -m "feat: extract training samples from PGN with rating/time filters"
```

---

### Task 5: Shard writer + Lichess download/preprocess script

**Files:**
- Modify: `chessmodel/dataset.py` (append `write_shards`)
- Create: `chessmodel/preprocess.py`
- Test: `tests/test_shards.py`

- [ ] **Step 1: Write the failing test**

```python
import io
import numpy as np
from chessmodel.dataset import write_shards, iter_samples_from_pgn

PGN = """[Event "x"]
[White "a"]
[Black "b"]
[Result "1-0"]
[WhiteElo "2100"]
[BlackElo "2150"]
[TimeControl "300+3"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0
"""

def test_write_shards_creates_npz(tmp_path):
    samples = iter_samples_from_pgn(io.StringIO(PGN))
    paths = write_shards(samples, out_dir=str(tmp_path), shard_size=4, prefix="t")
    assert len(paths) >= 1
    d = np.load(paths[0])
    assert d["x"].shape[1:] == (18, 8, 8)
    assert d["x"].shape[0] == d["idx"].shape[0] == d["v"].shape[0]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_shards.py -v`
Expected: FAIL with `ImportError: cannot import name 'write_shards'`

- [ ] **Step 3: Append `write_shards` to `chessmodel/dataset.py`**

```python
import os
import numpy as np

def write_shards(samples, out_dir, shard_size=100_000, prefix="shard"):
    os.makedirs(out_dir, exist_ok=True)
    paths, buf_x, buf_i, buf_v, n = [], [], [], [], 0

    def flush():
        nonlocal buf_x, buf_i, buf_v
        if not buf_x:
            return
        path = os.path.join(out_dir, f"{prefix}_{len(paths):05d}.npz")
        np.savez_compressed(
            path,
            x=np.asarray(buf_x, dtype=np.float32),
            idx=np.asarray(buf_i, dtype=np.int64),
            v=np.asarray(buf_v, dtype=np.float32),
        )
        paths.append(path)
        buf_x, buf_i, buf_v = [], [], []

    for x, idx, v in samples:
        buf_x.append(x); buf_i.append(idx); buf_v.append(v); n += 1
        if n % shard_size == 0:
            flush()
    flush()
    return paths
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_shards.py -v`
Expected: PASS (1 passed)

- [ ] **Step 5: Write `chessmodel/preprocess.py` (CLI to stream a .pgn.zst into shards)**

```python
import argparse
import io
import zstandard as zstd
from chessmodel.dataset import iter_samples_from_pgn, write_shards

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pgn-zst", required=True)
    ap.add_argument("--out-dir", default="data/shards")
    ap.add_argument("--shard-size", type=int, default=100_000)
    args = ap.parse_args()

    dctx = zstd.ZstdDecompressor()
    with open(args.pgn_zst, "rb") as fh:
        stream = dctx.stream_reader(fh)
        text = io.TextIOWrapper(stream, encoding="utf-8", errors="ignore")
        samples = iter_samples_from_pgn(text)
        paths = write_shards(samples, args.out_dir, args.shard_size)
    print(f"Wrote {len(paths)} shards to {args.out_dir}")

if __name__ == "__main__":
    main()
```

- [ ] **Step 6: Manual download + smoke run (verification)**

Download one monthly file from https://database.lichess.org/ (standard rated games), e.g. `lichess_db_standard_rated_YYYY-MM.pgn.zst`, into `data/`.
Run: `python -m chessmodel.preprocess --pgn-zst data\lichess_db_standard_rated_YYYY-MM.pgn.zst --out-dir data\shards --shard-size 50000`
Expected: prints `Wrote N shards ...` and `data/shards/shard_00000.npz` exists.

- [ ] **Step 7: Commit**

```bash
git add chessmodel/dataset.py chessmodel/preprocess.py tests/test_shards.py
git commit -m "feat: shard writer and lichess preprocess CLI"
```

---

### Task 6: Training loop (torch-directml)

**Files:**
- Create: `chessmodel/train.py`
- Create: `tests/test_train_smoke.py`

- [ ] **Step 1: Write the failing test (CPU smoke: loss decreases on tiny synthetic data)**

```python
import numpy as np
import torch
from chessmodel.train import train_on_arrays
from chessmodel.model import ChessNet
from chessmodel.encoding import PLANE_COUNT, POLICY_SIZE

def test_train_reduces_loss_cpu():
    rng = np.random.default_rng(0)
    n = 64
    x = rng.standard_normal((n, PLANE_COUNT, 8, 8)).astype(np.float32)
    idx = rng.integers(0, POLICY_SIZE, size=n).astype(np.int64)
    v = rng.uniform(-1, 1, size=n).astype(np.float32)
    net = ChessNet(channels=16, blocks=1)
    first, last = train_on_arrays(net, x, idx, v, device=torch.device("cpu"),
                                  epochs=5, batch_size=16, lr=1e-3)
    assert last < first
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_train_smoke.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'chessmodel.train'`

- [ ] **Step 3: Write implementation**

```python
import argparse
import glob
import numpy as np
import torch
import torch.nn as nn
from chessmodel.model import ChessNet

def train_on_arrays(net, x, idx, v, device, epochs=1, batch_size=256, lr=1e-3,
                    value_weight=1.0):
    net.to(device)
    opt = torch.optim.Adam(net.parameters(), lr=lr)
    ce = nn.CrossEntropyLoss()
    mse = nn.MSELoss()
    x_t = torch.from_numpy(x); idx_t = torch.from_numpy(idx); v_t = torch.from_numpy(v)
    n = x_t.shape[0]
    first_loss = last_loss = None
    for epoch in range(epochs):
        net.train(True)
        perm = torch.randperm(n)
        total, batches = 0.0, 0
        for s in range(0, n, batch_size):
            b = perm[s:s + batch_size]
            xb = x_t[b].to(device); ib = idx_t[b].to(device); vb = v_t[b].to(device)
            p, val = net(xb)
            loss = ce(p, ib) + value_weight * mse(val.squeeze(1), vb)
            opt.zero_grad(); loss.backward(); opt.step()
            total += loss.item(); batches += 1
        epoch_loss = total / max(batches, 1)
        if first_loss is None:
            first_loss = epoch_loss
        last_loss = epoch_loss
        print(f"epoch {epoch+1}/{epochs} loss={epoch_loss:.4f}")
    return first_loss, last_loss

def _load_shards(shard_glob):
    xs, ids, vs = [], [], []
    for path in sorted(glob.glob(shard_glob)):
        d = np.load(path)
        xs.append(d["x"]); ids.append(d["idx"]); vs.append(d["v"])
    return np.concatenate(xs), np.concatenate(ids), np.concatenate(vs)

def main():
    import torch_directml
    ap = argparse.ArgumentParser()
    ap.add_argument("--shards", default="data/shards/*.npz")
    ap.add_argument("--epochs", type=int, default=10)
    ap.add_argument("--batch-size", type=int, default=512)
    ap.add_argument("--channels", type=int, default=64)
    ap.add_argument("--blocks", type=int, default=6)
    ap.add_argument("--out", default="checkpoints/model.pt")
    args = ap.parse_args()
    device = torch_directml.device()
    print(f"device={device}")
    x, idx, v = _load_shards(args.shards)
    print(f"samples={x.shape[0]}")
    net = ChessNet(channels=args.channels, blocks=args.blocks)
    train_on_arrays(net, x, idx, v, device, epochs=args.epochs,
                    batch_size=args.batch_size)
    torch.save({"channels": args.channels, "blocks": args.blocks,
                "state_dict": net.state_dict()}, args.out)
    print(f"saved {args.out}")

if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_train_smoke.py -v`
Expected: PASS (1 passed)

- [ ] **Step 5: GPU smoke run on real shards (verification)**

Run: `python -m chessmodel.train --shards "data\shards\*.npz" --epochs 1 --batch-size 256`
Expected: prints `device=privateuseone:0`, a decreasing `loss=...` line, and `saved checkpoints/model.pt`. Batches should process in well under a second each (if multiple seconds, GPU fallback — re-check the directml device per the training-with-amd-gpu skill).

- [ ] **Step 6: Commit**

```bash
git add chessmodel/train.py tests/test_train_smoke.py
git commit -m "feat: directml training loop with combined policy+value loss"
```

---

### Task 7: PUCT MCTS

**Files:**
- Create: `chessmodel/mcts.py`
- Test: `tests/test_mcts.py`

- [ ] **Step 1: Write the failing test (finds mate-in-1 with a value-neutral stub)**

```python
import chess
from chessmodel.mcts import MCTS

def flat_evaluator(board):
    legal = list(board.legal_moves)
    priors = {m: 1.0 / len(legal) for m in legal} if legal else {}
    return priors, 0.0  # non-terminal value is neutral

def test_finds_mate_in_one():
    board = chess.Board("6k1/5ppp/8/8/8/8/8/R6K w - - 0 1")
    mcts = MCTS(flat_evaluator, c_puct=1.5)
    best = mcts.best_move(board, sims=200)
    assert best.uci() == "a1a8"  # Ra8#
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_mcts.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'chessmodel.mcts'`

- [ ] **Step 3: Write implementation**

```python
import math

class _Node:
    def __init__(self, prior=0.0):
        self.P = prior
        self.N = 0
        self.W = 0.0
        self.children = {}

    @property
    def Q(self):
        return self.W / self.N if self.N > 0 else 0.0

    def expand(self, priors):
        for move, p in priors.items():
            if move not in self.children:
                self.children[move] = _Node(p)

    def select(self, c_puct):
        best_score, best_move, best_child = -1e18, None, None
        for move, child in self.children.items():
            u = child.Q + c_puct * child.P * math.sqrt(self.N) / (1 + child.N)
            if u > best_score:
                best_score, best_move, best_child = u, move, child
        return best_move, best_child

def _terminal_value(board):
    # value from the perspective of the side to move at this board
    if board.is_checkmate():
        return -1.0
    return 0.0

class MCTS:
    def __init__(self, evaluator, c_puct=1.5):
        self.evaluator = evaluator
        self.c_puct = c_puct

    def search(self, board, sims):
        root = _Node()
        priors, _ = self.evaluator(board)
        root.expand(priors)
        for _ in range(sims):
            self._simulate(board.copy(), root)
        return {move: child.N for move, child in root.children.items()}

    def best_move(self, board, sims):
        visits = self.search(board, sims)
        return max(visits, key=visits.get)

    def _simulate(self, board, node):
        path = [node]
        while node.children and not board.is_game_over():
            move, node = node.select(self.c_puct)
            board.push(move)
            path.append(node)
        if board.is_game_over():
            value = _terminal_value(board)
        else:
            priors, value = self.evaluator(board)
            node.expand(priors)
        for n in reversed(path):
            value = -value
            n.N += 1
            n.W += value
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_mcts.py -v`
Expected: PASS (1 passed)

- [ ] **Step 5: Commit**

```bash
git add chessmodel/mcts.py tests/test_mcts.py
git commit -m "feat: PUCT MCTS with negamax backup and terminal handling"
```

---

### Task 8: Engine (net evaluator + best move from FEN)

**Files:**
- Create: `chessmodel/engine.py`
- Test: `tests/test_engine.py`

- [ ] **Step 1: Write the failing test**

```python
import torch
from chessmodel.engine import Engine
from chessmodel.model import ChessNet

START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

def test_best_move_returns_legal_uci():
    net = ChessNet(channels=16, blocks=1)
    engine = Engine(net, device=torch.device("cpu"))
    out = engine.best_move(START_FEN, sims=32)
    assert "move" in out and len(out["move"]) in (4, 5)
    assert "eval" in out and "pv" in out

def test_loads_from_checkpoint(tmp_path):
    net = ChessNet(channels=16, blocks=1)
    path = tmp_path / "m.pt"
    torch.save({"channels": 16, "blocks": 1, "state_dict": net.state_dict()}, path)
    engine = Engine.from_checkpoint(str(path), device=torch.device("cpu"))
    out = engine.best_move(START_FEN, sims=16)
    assert len(out["move"]) in (4, 5)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_engine.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'chessmodel.engine'`

- [ ] **Step 3: Write implementation**

```python
import chess
import numpy as np
import torch
from chessmodel.encoding import encode_board, move_to_index
from chessmodel.model import ChessNet
from chessmodel.mcts import MCTS

class NetEvaluator:
    def __init__(self, model, device):
        self.model = model.to(device)
        self.device = device

    def __call__(self, board):
        x = torch.from_numpy(encode_board(board)).unsqueeze(0).to(self.device)
        self.model.train(False)
        with torch.no_grad():
            logits, value = self.model(x)
        logits = logits[0].cpu().numpy()
        value = float(value[0].cpu().numpy())
        legal = list(board.legal_moves)
        if not legal:
            return {}, value
        ls = np.array([logits[move_to_index(m)] for m in legal], dtype=np.float64)
        ls -= ls.max()
        e = np.exp(ls)
        e /= e.sum()
        priors = {m: float(p) for m, p in zip(legal, e)}
        return priors, value

class Engine:
    def __init__(self, model, device, c_puct=1.5):
        self.evaluator = NetEvaluator(model, device)
        self.mcts = MCTS(self.evaluator, c_puct)

    @classmethod
    def from_checkpoint(cls, path, device, c_puct=1.5):
        ckpt = torch.load(path, map_location=device)
        net = ChessNet(channels=ckpt["channels"], blocks=ckpt["blocks"])
        net.load_state_dict(ckpt["state_dict"])
        return cls(net, device, c_puct)

    def best_move(self, fen, sims=200):
        board = chess.Board(fen)
        visits = self.mcts.search(board, sims)
        best = max(visits, key=visits.get)
        _, value = self.evaluator(board)
        return {"move": best.uci(), "eval": value, "pv": [best.uci()]}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_engine.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add chessmodel/engine.py tests/test_engine.py
git commit -m "feat: net-backed engine producing best move from FEN"
```

---

### Task 9: FastAPI serving

**Files:**
- Create: `chessmodel/serve.py`
- Test: `tests/test_serve.py`

- [ ] **Step 1: Write the failing test (uses a stub engine via the app factory)**

```python
from fastapi.testclient import TestClient
from chessmodel.serve import create_app

class StubEngine:
    def best_move(self, fen, sims=200):
        return {"move": "e2e4", "eval": 0.1, "pv": ["e2e4"]}

def test_bestmove_endpoint():
    app = create_app(StubEngine())
    client = TestClient(app)
    r = client.post("/bestmove", json={"fen": "any-fen", "sims": 50})
    assert r.status_code == 200
    body = r.json()
    assert body["move"] == "e2e4"
    assert "eval" in body and "pv" in body

def test_health_endpoint():
    app = create_app(StubEngine())
    client = TestClient(app)
    assert client.get("/health").json() == {"status": "ok"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_serve.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'chessmodel.serve'`

- [ ] **Step 3: Write implementation**

```python
from fastapi import FastAPI
from pydantic import BaseModel

class BestMoveRequest(BaseModel):
    fen: str
    sims: int = 200

def create_app(engine):
    app = FastAPI(title="chess-model engine")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.post("/bestmove")
    def bestmove(req: BestMoveRequest):
        return engine.best_move(req.fen, req.sims)

    return app

def main():
    import argparse
    import torch_directml
    import uvicorn
    from chessmodel.engine import Engine
    ap = argparse.ArgumentParser()
    ap.add_argument("--checkpoint", default="checkpoints/model.pt")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8000)
    args = ap.parse_args()
    engine = Engine.from_checkpoint(args.checkpoint, device=torch_directml.device())
    uvicorn.run(create_app(engine), host=args.host, port=args.port)

if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_serve.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add chessmodel/serve.py tests/test_serve.py
git commit -m "feat: FastAPI /bestmove serving with app factory"
```

---

### Task 10: ELO evaluation gauntlet vs Stockfish

**Files:**
- Create: `chessmodel/evaluate.py`
- Test: `tests/test_evaluate.py`

- [ ] **Step 1: Write the failing test (PGN writing + result tally are unit-testable without Stockfish)**

```python
from chessmodel.evaluate import GameResult, results_to_pgn, tally

def test_results_to_pgn_and_tally():
    results = [
        GameResult(white="model", black="sf-1", result="1-0"),
        GameResult(white="sf-1", black="model", result="1-0"),
        GameResult(white="model", black="sf-1", result="1/2-1/2"),
    ]
    pgn = results_to_pgn(results)
    assert pgn.count("[Result") == 3
    score = tally(results, "model")
    # model: win + loss + draw -> 1.0 + 0.0 + 0.5 = 1.5 of 3
    assert score["points"] == 1.5
    assert score["games"] == 3
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_evaluate.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'chessmodel.evaluate'`

- [ ] **Step 3: Write implementation**

```python
import argparse
from dataclasses import dataclass

import chess
import chess.engine

@dataclass
class GameResult:
    white: str
    black: str
    result: str  # "1-0", "0-1", "1/2-1/2"

def results_to_pgn(results):
    lines = []
    for r in results:
        lines.append(f'[White "{r.white}"]')
        lines.append(f'[Black "{r.black}"]')
        lines.append(f'[Result "{r.result}"]')
        lines.append("")
        lines.append(r.result)
        lines.append("")
    return "\n".join(lines)

def tally(results, name):
    points, games = 0.0, 0
    for r in results:
        if name not in (r.white, r.black):
            continue
        games += 1
        if r.result == "1/2-1/2":
            points += 0.5
        elif (r.result == "1-0" and r.white == name) or (r.result == "0-1" and r.black == name):
            points += 1.0
    return {"points": points, "games": games}

def play_game(model_move_fn, stockfish, model_is_white, sf_limit):
    board = chess.Board()
    while not board.is_game_over():
        model_turn = (board.turn == chess.WHITE) == model_is_white
        if model_turn:
            uci = model_move_fn(board.fen())
            board.push(chess.Move.from_uci(uci))
        else:
            board.push(stockfish.play(board, sf_limit).move)
    res = board.result()
    white = "model" if model_is_white else "stockfish"
    black = "stockfish" if model_is_white else "model"
    return GameResult(white=white, black=black, result=res)

def main():
    import torch_directml
    from chessmodel.engine import Engine
    ap = argparse.ArgumentParser()
    ap.add_argument("--checkpoint", default="checkpoints/model.pt")
    ap.add_argument("--stockfish", required=True, help="path to stockfish binary")
    ap.add_argument("--games", type=int, default=100)
    ap.add_argument("--sims", type=int, default=200)
    ap.add_argument("--sf-skill", type=int, default=3)
    ap.add_argument("--out-pgn", default="data/gauntlet.pgn")
    args = ap.parse_args()

    engine = Engine.from_checkpoint(args.checkpoint, device=torch_directml.device())
    sf = chess.engine.SimpleEngine.popen_uci(args.stockfish)
    sf.configure({"Skill Level": args.sf_skill})
    limit = chess.engine.Limit(time=0.1)

    results = []
    for i in range(args.games):
        results.append(play_game(
            lambda fen: engine.best_move(fen, args.sims)["move"],
            sf, model_is_white=(i % 2 == 0), sf_limit=limit))
    sf.quit()

    with open(args.out_pgn, "w") as f:
        f.write(results_to_pgn(results))
    score = tally(results, "model")
    print(f"model scored {score['points']}/{score['games']} vs stockfish skill {args.sf_skill}")
    print("Compute ELO with: ordo -p", args.out_pgn)

if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_evaluate.py -v`
Expected: PASS (1 passed)

- [ ] **Step 5: Full gauntlet + ELO (verification — requires trained model, Stockfish binary, and `ordo`)**

Download Stockfish (https://stockfishchess.org/download/) to `data/stockfish.exe`. Download/build `ordo` (https://github.com/michiguel/Ordo).
Run: `python -m chessmodel.evaluate --checkpoint checkpoints\model.pt --stockfish data\stockfish.exe --games 200 --sims 400 --sf-skill 3`
Then: `ordo -p data\gauntlet.pgn -a 2000 -A "stockfish"` (anchor Stockfish at its known calibrated rating) to print the model's ELO.
**Goal gate:** iterate (more data, bigger net via `--channels/--blocks`, more `--sims`, higher `--sf-skill`) until the model's computed ELO is stably >= 2000.

- [ ] **Step 6: Commit**

```bash
git add chessmodel/evaluate.py tests/test_evaluate.py
git commit -m "feat: gauntlet vs stockfish and result tally for ELO calc"
```

---

## Iteration loop to reach 2000 ELO

After the pipeline works end-to-end on one month of data:
1. Preprocess more months (Task 5) to grow the dataset.
2. Retrain larger nets (`--channels 128 --blocks 10`) for more epochs (Task 6).
3. Increase MCTS `--sims` at inference (Task 8/10) — biggest single strength lever.
4. Re-run the gauntlet (Task 10) and recompute ELO until stably >= 2000.

Each retrain produces a new `checkpoints/model.pt`; keep the best by gauntlet ELO.
