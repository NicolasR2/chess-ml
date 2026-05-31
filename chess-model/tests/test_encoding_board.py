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
