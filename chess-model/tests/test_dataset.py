import io
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
