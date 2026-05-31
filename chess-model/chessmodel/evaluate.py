import argparse
from dataclasses import dataclass

import chess
import chess.engine


@dataclass
class GameResult:
    white: str
    black: str
    result: str  # "1-0", "0-1", "1/2-1/2"


def results_to_pgn(results):
    lines = []
    for r in results:
        lines.append(f'[White "{r.white}"]')
        lines.append(f'[Black "{r.black}"]')
        lines.append(f'[Result "{r.result}"]')
        lines.append("")
        lines.append(r.result)
        lines.append("")
    return "\n".join(lines)


def tally(results, name):
    points, games = 0.0, 0
    for r in results:
        if name not in (r.white, r.black):
            continue
        games += 1
        if r.result == "1/2-1/2":
            points += 0.5
        elif (r.result == "1-0" and r.white == name) or (r.result == "0-1" and r.black == name):
            points += 1.0
    return {"points": points, "games": games}


def play_game(model_move_fn, stockfish, model_is_white, sf_limit):
    board = chess.Board()
    while not board.is_game_over():
        model_turn = (board.turn == chess.WHITE) == model_is_white
        if model_turn:
            uci = model_move_fn(board.fen())
            board.push(chess.Move.from_uci(uci))
        else:
            board.push(stockfish.play(board, sf_limit).move)
    res = board.result()
    white = "model" if model_is_white else "stockfish"
    black = "stockfish" if model_is_white else "model"
    return GameResult(white=white, black=black, result=res)


def main():
    import torch_directml
    from chessmodel.engine import Engine
    ap = argparse.ArgumentParser()
    ap.add_argument("--checkpoint", default="checkpoints/model.pt")
    ap.add_argument("--stockfish", required=True, help="path to stockfish binary")
    ap.add_argument("--games", type=int, default=100)
    ap.add_argument("--sims", type=int, default=200)
    ap.add_argument("--sf-skill", type=int, default=3)
    ap.add_argument("--uci-elo", type=int, default=None,
                    help="anchor Stockfish to this exact ELO (UCI_LimitStrength)")
    ap.add_argument("--out-pgn", default="data/gauntlet.pgn")
    args = ap.parse_args()

    engine = Engine.from_checkpoint(args.checkpoint, device=torch_directml.device())
    sf = chess.engine.SimpleEngine.popen_uci(args.stockfish)
    if args.uci_elo is not None:
        sf.configure({"UCI_LimitStrength": True, "UCI_Elo": args.uci_elo})
        anchor_desc = f"UCI_Elo {args.uci_elo}"
    else:
        sf.configure({"Skill Level": args.sf_skill})
        anchor_desc = f"skill {args.sf_skill}"
    limit = chess.engine.Limit(time=0.1)

    results = []
    for i in range(args.games):
        results.append(play_game(
            lambda fen: engine.best_move(fen, args.sims)["move"],
            sf, model_is_white=(i % 2 == 0), sf_limit=limit))
    sf.quit()

    with open(args.out_pgn, "w") as f:
        f.write(results_to_pgn(results))
    score = tally(results, "model")
    print(f"model scored {score['points']}/{score['games']} vs stockfish {anchor_desc}")
    if args.uci_elo is not None and score["games"] > 0:
        from chessmodel.elo import elo_from_score
        frac = score["points"] / score["games"]
        print(f"estimated model ELO: {elo_from_score(frac, args.uci_elo):.0f}")
    else:
        print("Compute ELO with: ordo -p", args.out_pgn)


if __name__ == "__main__":
    main()
