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
