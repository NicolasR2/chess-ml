import math

UCI_ELO_MIN = 1320  # Stockfish UCI_Elo cannot go below this


def elo_from_score(score, anchor_elo, eps=0.01):
    """Estimate a player's ELO from its score fraction vs an anchor of known ELO."""
    s = min(max(score, eps), 1.0 - eps)
    return anchor_elo + 400.0 * math.log10(s / (1.0 - s))


def stockfish_anchor_options(target_elo):
    """UCI options to make Stockfish play near target_elo.

    For target_elo >= UCI_ELO_MIN use UCI_LimitStrength/UCI_Elo (precise).
    Below that, Stockfish cannot limit by ELO, so use a low Skill Level with a
    shallow fixed depth (returned under the 'depth' key for the caller to apply
    as a search limit).
    """
    if target_elo >= UCI_ELO_MIN:
        return {"UCI_LimitStrength": True, "UCI_Elo": int(target_elo)}
    # crude sub-1320 ladder: lower target -> lower skill + shallower depth
    skill = max(0, min(20, round((target_elo - 250) / 55)))
    depth = 1 if target_elo < 700 else (3 if target_elo < 1000 else 5)
    return {"Skill Level": int(skill), "depth": int(depth)}
