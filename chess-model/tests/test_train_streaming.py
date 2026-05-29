import numpy as np
import torch
from chessmodel.train import train_streaming
from chessmodel.model import ChessNet
from chessmodel.encoding import PLANE_COUNT, POLICY_SIZE


def _make_shard(path, n, seed):
    rng = np.random.default_rng(seed)
    np.savez_compressed(
        path,
        x=rng.standard_normal((n, PLANE_COUNT, 8, 8)).astype(np.float32),
        idx=rng.integers(0, POLICY_SIZE, size=n).astype(np.int64),
        v=rng.uniform(-1, 1, size=n).astype(np.float32),
    )


def test_streaming_reduces_loss_over_chunks(tmp_path):
    paths = []
    for i in range(3):
        p = tmp_path / f"shard_{i:05d}.npz"
        _make_shard(p, n=64, seed=i)
        paths.append(str(p))
    net = ChessNet(channels=16, blocks=1)
    first, last = train_streaming(
        net, paths, device=torch.device("cpu"),
        epochs=6, batch_size=16, lr=1e-3, chunk_shards=2, seed=0,
    )
    assert last < first


def test_streaming_skips_corrupt_shard(tmp_path):
    good = tmp_path / "shard_00000.npz"
    _make_shard(good, n=64, seed=1)
    bad = tmp_path / "shard_00001.npz"
    bad.write_bytes(b"not a real npz file")
    net = ChessNet(channels=16, blocks=1)
    # must not raise, and must still train on the good shard
    first, last = train_streaming(
        net, [str(good), str(bad)], device=torch.device("cpu"),
        epochs=2, batch_size=16, lr=1e-3, chunk_shards=1, seed=0,
    )
    assert first is not None and last is not None
