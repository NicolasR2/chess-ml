import json
from chessmodel.difficulty import DifficultyProfile


def load_level_config(path):
    """Load and validate a level config. Raises ValueError on malformed input."""
    try:
        with open(path) as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"invalid level config JSON: {e}") from e
    if "levels" not in data or not data["levels"]:
        raise ValueError("level config missing non-empty 'levels'")
    levels = {}
    for k, v in data["levels"].items():
        levels[int(k)] = {
            "sims": int(v["sims"]),
            "temperature": float(v["temperature"]),
            "blunder_rate": float(v["blunder_rate"]),
            "top_k": int(v.get("top_k", 0)),
        }
    return {"model": data.get("model"), "levels": levels}


def nearest_level(config, level):
    return min(config["levels"].keys(), key=lambda L: abs(L - level))


def get_profile(config, level):
    """Return (resolved_level, DifficultyProfile) for the nearest configured level."""
    resolved = nearest_level(config, level)
    p = config["levels"][resolved]
    return resolved, DifficultyProfile(
        sims=p["sims"],
        temperature=p["temperature"],
        blunder_rate=p["blunder_rate"],
        top_k=p["top_k"],
    )
