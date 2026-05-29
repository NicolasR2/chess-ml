from fastapi import FastAPI
from pydantic import BaseModel


class BestMoveRequest(BaseModel):
    fen: str
    sims: int = 200


def create_app(engine):
    app = FastAPI(title="chess-model engine")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.post("/bestmove")
    def bestmove(req: BestMoveRequest):
        return engine.best_move(req.fen, req.sims)

    return app


def main():
    import argparse
    import torch_directml
    import uvicorn
    from chessmodel.engine import Engine
    ap = argparse.ArgumentParser()
    ap.add_argument("--checkpoint", default="checkpoints/model.pt")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8000)
    args = ap.parse_args()
    engine = Engine.from_checkpoint(args.checkpoint, device=torch_directml.device())
    uvicorn.run(create_app(engine), host=args.host, port=args.port)


if __name__ == "__main__":
    main()
