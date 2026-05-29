import os
import numpy as np
import chess
import chess.pgn
from chessmodel.encoding import encode_board, move_to_index


def iter_samples_from_pgn(fileobj, min_elo=2000, max_elo=2400, min_base_seconds=180):
    while True:
        game = chess.pgn.read_game(fileobj)
        if game is None:
            break
        try:
            we = int(game.headers.get("WhiteElo", "0"))
            be = int(game.headers.get("BlackElo", "0"))
        except ValueError:
            continue
        if not (min_elo <= we <= max_elo and min_elo <= be <= max_elo):
            continue
        base = game.headers.get("TimeControl", "").split("+")[0]
        if base.isdigit() and int(base) < min_base_seconds:
            continue
        result = game.headers.get("Result")
        if result == "1-0":
            outcome = 1.0
        elif result == "0-1":
            outcome = -1.0
        elif result == "1/2-1/2":
            outcome = 0.0
        else:
            continue
        board = game.board()
        for move in game.mainline_moves():
            stm_white = board.turn == chess.WHITE
            x = encode_board(board)
            try:
                idx = move_to_index(move)
            except KeyError:
                board.push(move)
                continue
            if outcome == 0.0:
                v = 0.0
            else:
                white_won = outcome == 1.0
                v = 1.0 if (white_won == stm_white) else -1.0
            yield x, idx, v
            board.push(move)


def write_shards(samples, out_dir, shard_size=100_000, prefix="shard"):
    os.makedirs(out_dir, exist_ok=True)
    paths, buf_x, buf_i, buf_v, n = [], [], [], [], 0

    def flush():
        nonlocal buf_x, buf_i, buf_v
        if not buf_x:
            return
        path = os.path.join(out_dir, f"{prefix}_{len(paths):05d}.npz")
        np.savez_compressed(
            path,
            x=np.asarray(buf_x, dtype=np.float32),
            idx=np.asarray(buf_i, dtype=np.int64),
            v=np.asarray(buf_v, dtype=np.float32),
        )
        paths.append(path)
        buf_x, buf_i, buf_v = [], [], []

    for x, idx, v in samples:
        buf_x.append(x)
        buf_i.append(idx)
        buf_v.append(v)
        n += 1
        if n % shard_size == 0:
            flush()
    flush()
    return paths
