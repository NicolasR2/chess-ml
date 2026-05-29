from fastapi import FastAPI
from pydantic import BaseModel
from chessmodel.levelconfig import get_profile


class BestMoveRequest(BaseModel):
    fen: str
    level: int | None = None
    sims: int = 200
    seed: int | None = None


def create_app(engine, config=None):
    app = FastAPI(title="chess-model engine")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.get("/levels")
    def levels():
        lv = sorted(config["levels"].keys()) if config else []
        return {"levels": lv}

    @app.post("/bestmove")
    def bestmove(req: BestMoveRequest):
        if req.level is not None and config is not None:
            resolved, profile = get_profile(config, req.level)
            out = engine.best_move(req.fen, profile=profile, seed=req.seed)
            out["level"] = resolved
            return out
        return engine.best_move(req.fen, sims=req.sims)

    return app


def main():
    import argparse
    import torch_directml
    import uvicorn
    from chessmodel.engine import Engine
    from chessmodel.levelconfig import load_level_config
    ap = argparse.ArgumentParser()
    ap.add_argument("--checkpoint", default="checkpoints/model.pt")
    ap.add_argument("--config", default="configs/level_config.json")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8000)
    args = ap.parse_args()
    engine = Engine.from_checkpoint(args.checkpoint, device=torch_directml.device())
    config = load_level_config(args.config)
    uvicorn.run(create_app(engine, config=config), host=args.host, port=args.port)


if __name__ == "__main__":
    main()
