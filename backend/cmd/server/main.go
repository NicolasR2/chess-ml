package main

import (
	"log"
	"net/http"
	"os"

	"github.com/NicolasR2/chess-ai/backend/internal/api"
	"github.com/NicolasR2/chess-ai/backend/internal/engine"
	"github.com/NicolasR2/chess-ai/backend/internal/game"
)

func main() {
	var eng engine.Engine
	if os.Getenv("CHESS_ENGINE") == "model" {
		url := os.Getenv("MODEL_URL")
		if url == "" {
			url = "http://127.0.0.1:8000"
		}
		eng = engine.NewModel(url, nil)
		log.Printf("engine: model (%s)", url)
	} else {
		eng = engine.NewFallback(3)
		log.Printf("engine: fallback (alpha-beta)")
	}

	addr := os.Getenv("ADDR")
	if addr == "" {
		addr = ":8080"
	}
	r := api.NewRouter(game.NewStore(), eng)
	log.Printf("listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, r))
}
