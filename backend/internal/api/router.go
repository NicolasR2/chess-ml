package api

import (
	"net/http"

	"github.com/NicolasR2/chess-ai/backend/internal/engine"
	"github.com/NicolasR2/chess-ai/backend/internal/game"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func NewRouter(store *game.Store, eng engine.Engine) http.Handler {
	h := &Handlers{store: store, engine: eng}
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type"},
	}))
	r.Get("/api/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	r.Get("/api/levels", h.levels)
	r.Post("/api/games", h.createGame)
	r.Get("/api/games/{id}", h.getGame)
	r.Post("/api/games/{id}/moves", h.postMove)
	return r
}
