import torch
from chessmodel.engine import Engine
from chessmodel.model import ChessNet
from chessmodel.difficulty import DifficultyProfile

START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def _engine():
    net = ChessNet(channels=16, blocks=1)
    return Engine(net, device=torch.device("cpu"))


def test_profile_move_is_legal_uci():
    eng = _engine()
    prof = DifficultyProfile(sims=24, temperature=0.8, blunder_rate=0.3, top_k=4)
    out = eng.best_move(START_FEN, profile=prof, seed=1)
    assert len(out["move"]) in (4, 5)
    assert "eval" in out and "pv" in out


def test_same_seed_same_move():
    eng = _engine()
    prof = DifficultyProfile(sims=24, temperature=1.0, blunder_rate=0.5, top_k=0)
    a = eng.best_move(START_FEN, profile=prof, seed=99)["move"]
    b = eng.best_move(START_FEN, profile=prof, seed=99)["move"]
    assert a == b


def test_sims_only_path_still_works():
    eng = _engine()
    out = eng.best_move(START_FEN, sims=16)
    assert len(out["move"]) in (4, 5)
