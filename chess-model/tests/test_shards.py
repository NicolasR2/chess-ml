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
