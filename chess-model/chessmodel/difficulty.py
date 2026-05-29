from dataclasses import dataclass


@dataclass
class DifficultyProfile:
    sims: int = 200
    temperature: float = 0.0
    blunder_rate: float = 0.0
    top_k: int = 0


def _sample(dist, rng):
    """Sample a key from {key: weight}. Falls back to uniform if total <= 0."""
    keys = list(dist.keys())
    total = sum(dist.values())
    if total <= 0:
        return keys[rng.randrange(len(keys))]
    r = rng.random() * total
    acc = 0.0
    for k in keys:
        acc += dist[k]
        if r <= acc:
            return k
    return keys[-1]


def select_move(visits, priors, profile, rng):
    """Pick a move given MCTS visit counts and net priors over legal moves.

    visits: {move: visit_count} from MCTS search.
    priors: {move: probability} over all legal moves (from the evaluator).
    profile: DifficultyProfile.
    rng: a random.Random instance (seed it for reproducibility).
    """
    blunder = profile.blunder_rate > 0.0 and rng.random() < profile.blunder_rate
    if blunder:
        dist = dict(priors)
    elif profile.temperature <= 0.0:
        return max(visits, key=visits.get)
    else:
        inv_t = 1.0 / profile.temperature
        dist = {m: float(n) ** inv_t for m, n in visits.items()}

    if profile.top_k and profile.top_k > 0:
        top = sorted(dist.items(), key=lambda kv: kv[1], reverse=True)[: profile.top_k]
        dist = dict(top)
    return _sample(dist, rng)
