from chessmodel.calibrate import measure_elo, tune_profile
from chessmodel.difficulty import DifficultyProfile


def test_measure_elo_from_play_fn():
    # play_fn returns 1.0 (win), 0.0 (loss) alternating -> score 0.5 -> ~anchor
    results = iter([1.0, 0.0, 1.0, 0.0])

    def play_fn(profile, model_is_white):
        return next(results)

    elo = measure_elo(DifficultyProfile(), play_fn, n_games=4, anchor_elo=1500)
    assert abs(elo - 1500) < 1e-6


def test_tune_profile_picks_closest_to_target():
    candidates = [
        DifficultyProfile(sims=10, blunder_rate=0.4),
        DifficultyProfile(sims=50, blunder_rate=0.1),
        DifficultyProfile(sims=200, blunder_rate=0.0),
    ]
    # stub: measured elo is a simple function of sims
    def measure_fn(profile):
        return 500 + profile.sims * 8  # -> 580, 900, 2100

    best = tune_profile(target_elo=900, candidates=candidates, measure_fn=measure_fn)
    assert best.sims == 50
