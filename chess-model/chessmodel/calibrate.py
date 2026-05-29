import argparse
import json

from chessmodel.difficulty import DifficultyProfile
from chessmodel.elo import elo_from_score, stockfish_anchor_options


def measure_elo(profile, play_fn, n_games, anchor_elo):
    """Play n_games via play_fn(profile, model_is_white)->result in {1.0,0.5,0.0}
    and convert the score fraction into an estimated ELO vs anchor_elo."""
    points = 0.0
    for i in range(n_games):
        points += play_fn(profile, i % 2 == 0)
    return elo_from_score(points / n_games, anchor_elo)


def tune_profile(target_elo, candidates, measure_fn):
    """Return the candidate profile whose measured ELO is closest to target."""
    return min(candidates, key=lambda p: abs(measure_fn(p) - target_elo))


def _candidate_grid(target_elo):
    """Seed grid of profiles to try for a given target. Weaker targets get
    fewer sims, higher temperature, and a higher blunder rate."""
    if target_elo < 1000:
        sims_opts, temp_opts, blunder_opts = [12, 24, 48], [1.4, 1.0], [0.5, 0.35]
    elif target_elo < 1600:
        sims_opts, temp_opts, blunder_opts = [80, 160], [0.8, 0.5], [0.15, 0.07]
    else:
        sims_opts, temp_opts, blunder_opts = [320, 600, 800], [0.3, 0.1], [0.03, 0.0]
    grid = []
    for s in sims_opts:
        for t in temp_opts:
            for b in blunder_opts:
                grid.append(DifficultyProfile(sims=s, temperature=t,
                                              blunder_rate=b, top_k=0))
    return grid


def main():
    import chess
    import chess.engine
    import torch_directml
    from chessmodel.engine import Engine

    ap = argparse.ArgumentParser()
    ap.add_argument("--checkpoint", default="checkpoints/model.pt")
    ap.add_argument("--stockfish", required=True)
    ap.add_argument("--out", default="configs/level_config.json")
    ap.add_argument("--levels", default="500,1000,1200,1500,1800,2000,2200")
    ap.add_argument("--games", type=int, default=20)
    args = ap.parse_args()

    engine = Engine.from_checkpoint(args.checkpoint, device=torch_directml.device())
    sf = chess.engine.SimpleEngine.popen_uci(args.stockfish)
    targets = [int(x) for x in args.levels.split(",")]
    out = {"model": args.checkpoint, "levels": {}}

    for target in targets:
        opts = stockfish_anchor_options(target)
        depth = opts.pop("depth", None)
        sf.configure({k: v for k, v in opts.items()})
        limit = chess.engine.Limit(depth=depth) if depth else chess.engine.Limit(time=0.1)

        def play_fn(profile, model_is_white, _target=target, _limit=limit):
            board = chess.Board()
            while not board.is_game_over():
                model_turn = (board.turn == chess.WHITE) == model_is_white
                if model_turn:
                    uci = engine.best_move(board.fen(), profile=profile)["move"]
                    board.push(chess.Move.from_uci(uci))
                else:
                    board.push(sf.play(board, _limit).move)
            res = board.result()
            if res == "1/2-1/2":
                return 0.5
            won = (res == "1-0") == model_is_white
            return 1.0 if won else 0.0

        best = tune_profile(
            target,
            _candidate_grid(target),
            lambda p: measure_elo(p, play_fn, args.games, target),
        )
        out["levels"][str(target)] = {
            "sims": best.sims, "temperature": best.temperature,
            "blunder_rate": best.blunder_rate, "top_k": best.top_k,
        }
        print(f"level {target}: {out['levels'][str(target)]}")

    sf.quit()
    with open(args.out, "w") as f:
        json.dump(out, f, indent=2)
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
