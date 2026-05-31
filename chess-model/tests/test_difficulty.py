import random
from chessmodel.difficulty import DifficultyProfile, select_move


def test_t0_p0_returns_argmax_of_visits():
    visits = {"a": 5, "b": 1, "c": 2}
    priors = {"a": 0.1, "b": 0.8, "c": 0.1}
    prof = DifficultyProfile(sims=10, temperature=0.0, blunder_rate=0.0, top_k=0)
    # rng must not matter when deterministic
    for seed in range(5):
        assert select_move(visits, priors, prof, random.Random(seed)) == "a"


def test_temperature_sampling_matches_distribution():
    visits = {"a": 1, "b": 1}
    priors = {"a": 0.5, "b": 0.5}
    prof = DifficultyProfile(sims=10, temperature=1.0, blunder_rate=0.0, top_k=0)
    rng = random.Random(0)
    counts = {"a": 0, "b": 0}
    for _ in range(4000):
        counts[select_move(visits, priors, prof, rng)] += 1
    # ~50/50 within tolerance
    assert abs(counts["a"] / 4000 - 0.5) < 0.05


def test_blunder_rate_fraction():
    # Non-blunder path is deterministic argmax -> "a".
    # Blunder path (priors, top_k=1) deterministically picks highest prior -> "z".
    visits = {"a": 10, "z": 1}
    priors = {"a": 0.1, "z": 0.9}
    prof = DifficultyProfile(sims=10, temperature=0.0, blunder_rate=0.3, top_k=1)
    rng = random.Random(123)
    z = 0
    for _ in range(4000):
        if select_move(visits, priors, prof, rng) == "z":
            z += 1
    assert abs(z / 4000 - 0.3) < 0.05


def test_top_k_restricts_candidates():
    visits = {"a": 4, "b": 3, "c": 2, "d": 1}
    priors = {"a": 0.25, "b": 0.25, "c": 0.25, "d": 0.25}
    prof = DifficultyProfile(sims=10, temperature=1.0, blunder_rate=0.0, top_k=2)
    rng = random.Random(7)
    seen = set()
    for _ in range(2000):
        seen.add(select_move(visits, priors, prof, rng))
    assert seen <= {"a", "b"}  # only the two most-visited moves


def test_same_seed_is_deterministic():
    visits = {"a": 3, "b": 2, "c": 1}
    priors = {"a": 0.4, "b": 0.4, "c": 0.2}
    prof = DifficultyProfile(sims=10, temperature=0.8, blunder_rate=0.2, top_k=0)
    seq1 = [select_move(visits, priors, prof, random.Random(42)) for _ in range(1)]
    seq2 = [select_move(visits, priors, prof, random.Random(42)) for _ in range(1)]
    assert seq1 == seq2
