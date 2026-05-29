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
