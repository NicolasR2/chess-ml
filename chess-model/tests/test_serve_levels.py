from fastapi.testclient import TestClient
from chessmodel.serve import create_app


class StubEngine:
    def __init__(self):
        self.last = None

    def best_move(self, fen, sims=200, profile=None, seed=None):
        self.last = {"sims": sims, "profile": profile, "seed": seed}
        return {"move": "e2e4", "eval": 0.0, "pv": ["e2e4"]}


CONFIG = {
    "model": "m.pt",
    "levels": {
        1000: {"sims": 40, "temperature": 1.0, "blunder_rate": 0.25, "top_k": 0},
        2000: {"sims": 600, "temperature": 0.2, "blunder_rate": 0.01, "top_k": 3},
    },
}


def test_level_resolves_to_profile():
    eng = StubEngine()
    client = TestClient(create_app(eng, config=CONFIG))
    r = client.post("/bestmove", json={"fen": "x", "level": 1900})
    assert r.status_code == 200
    body = r.json()
    assert body["level"] == 2000  # snapped to nearest
    assert eng.last["profile"].sims == 600


def test_levels_endpoint_lists_levels():
    client = TestClient(create_app(StubEngine(), config=CONFIG))
    r = client.get("/levels")
    assert r.status_code == 200
    assert sorted(r.json()["levels"]) == [1000, 2000]


def test_sims_only_request_is_backward_compatible():
    eng = StubEngine()
    client = TestClient(create_app(eng, config=CONFIG))
    r = client.post("/bestmove", json={"fen": "x", "sims": 50})
    assert r.status_code == 200
    assert eng.last["sims"] == 50
    assert eng.last["profile"] is None


def test_health_still_ok():
    client = TestClient(create_app(StubEngine(), config=CONFIG))
    assert client.get("/health").json() == {"status": "ok"}
