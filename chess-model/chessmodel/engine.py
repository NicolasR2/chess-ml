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
        value = float(value.reshape(-1)[0].item())
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
        ckpt = torch.load(path, map_location="cpu", weights_only=True)
        net = ChessNet(channels=ckpt["channels"], blocks=ckpt["blocks"])
        net.load_state_dict(ckpt["state_dict"])
        return cls(net, device, c_puct)

    def best_move(self, fen, sims=200):
        board = chess.Board(fen)
        visits = self.mcts.search(board, sims)
        best = max(visits, key=visits.get)
        _, value = self.evaluator(board)
        return {"move": best.uci(), "eval": value, "pv": [best.uci()]}
