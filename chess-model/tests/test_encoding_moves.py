import chess
from chessmodel.encoding import move_to_index, index_to_move, POLICY_SIZE


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
