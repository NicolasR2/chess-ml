import math
from chessmodel.elo import elo_from_score, stockfish_anchor_options


def test_even_score_equals_anchor():
    assert abs(elo_from_score(0.5, 1500) - 1500) < 1e-6


def test_higher_score_higher_elo():
    # score 0.75 vs anchor 1500 -> 1500 + 400*log10(3)
    expected = 1500 + 400 * math.log10(3)
    assert abs(elo_from_score(0.75, 1500) - expected) < 1e-6


def test_extremes_are_clamped_not_infinite():
    assert math.isfinite(elo_from_score(0.0, 1500))
    assert math.isfinite(elo_from_score(1.0, 1500))


def test_anchor_uses_uci_elo_when_high():
    opts = stockfish_anchor_options(1800)
    assert opts["UCI_LimitStrength"] is True
    assert opts["UCI_Elo"] == 1800


def test_anchor_uses_skill_level_when_low():
    opts = stockfish_anchor_options(800)
    assert "UCI_Elo" not in opts
    assert "Skill Level" in opts
    assert "depth" in opts  # reduced search for sub-1320 targets
