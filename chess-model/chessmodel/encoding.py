import numpy as np
import chess

PLANE_COUNT = 18

_PIECE_TO_PLANE = {
    (chess.PAWN, chess.WHITE): 0, (chess.KNIGHT, chess.WHITE): 1,
    (chess.BISHOP, chess.WHITE): 2, (chess.ROOK, chess.WHITE): 3,
    (chess.QUEEN, chess.WHITE): 4, (chess.KING, chess.WHITE): 5,
    (chess.PAWN, chess.BLACK): 6, (chess.KNIGHT, chess.BLACK): 7,
    (chess.BISHOP, chess.BLACK): 8, (chess.ROOK, chess.BLACK): 9,
    (chess.QUEEN, chess.BLACK): 10, (chess.KING, chess.BLACK): 11,
}


def encode_board(board: chess.Board) -> np.ndarray:
    planes = np.zeros((PLANE_COUNT, 8, 8), dtype=np.float32)
    for sq, piece in board.piece_map().items():
        r, f = chess.square_rank(sq), chess.square_file(sq)
        planes[_PIECE_TO_PLANE[(piece.piece_type, piece.color)], r, f] = 1.0
    if board.turn == chess.WHITE:
        planes[12, :, :] = 1.0
    if board.has_kingside_castling_rights(chess.WHITE):
        planes[13, :, :] = 1.0
    if board.has_queenside_castling_rights(chess.WHITE):
        planes[14, :, :] = 1.0
    if board.has_kingside_castling_rights(chess.BLACK):
        planes[15, :, :] = 1.0
    if board.has_queenside_castling_rights(chess.BLACK):
        planes[16, :, :] = 1.0
    if board.ep_square is not None:
        planes[17, chess.square_rank(board.ep_square), chess.square_file(board.ep_square)] = 1.0
    return planes


def _generate_all_moves():
    moves, seen = [], set()
    for from_sq in chess.SQUARES:
        for to_sq in chess.SQUARES:
            if from_sq == to_sq:
                continue
            base = chess.Move(from_sq, to_sq)
            if base.uci() not in seen:
                seen.add(base.uci())
                moves.append(base)
            fr, tr = chess.square_rank(from_sq), chess.square_rank(to_sq)
            if (fr == 6 and tr == 7) or (fr == 1 and tr == 0):
                for promo in (chess.QUEEN, chess.ROOK, chess.BISHOP, chess.KNIGHT):
                    m = chess.Move(from_sq, to_sq, promotion=promo)
                    if m.uci() not in seen:
                        seen.add(m.uci())
                        moves.append(m)
    return moves


ALL_MOVES = _generate_all_moves()
MOVE_TO_IDX = {m.uci(): i for i, m in enumerate(ALL_MOVES)}
POLICY_SIZE = len(ALL_MOVES)


def move_to_index(move: chess.Move) -> int:
    return MOVE_TO_IDX[move.uci()]


def index_to_move(idx: int) -> chess.Move:
    return ALL_MOVES[idx]
