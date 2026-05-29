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
