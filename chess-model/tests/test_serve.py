from fastapi.testclient import TestClient
from chessmodel.serve import create_app


class StubEngine:
    def best_move(self, fen, sims=200):
        return {"move": "e2e4", "eval": 0.1, "pv": ["e2e4"]}


def test_bestmove_endpoint():
    app = create_app(StubEngine())
    client = TestClient(app)
    r = client.post("/bestmove", json={"fen": "any-fen", "sims": 50})
    assert r.status_code == 200
    body = r.json()
    assert body["move"] == "e2e4"
    assert "eval" in body and "pv" in body


def test_health_endpoint():
    app = create_app(StubEngine())
    client = TestClient(app)
    assert client.get("/health").json() == {"status": "ok"}
