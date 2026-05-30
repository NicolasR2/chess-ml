package api

import (
	"context"
	"encoding/json"
	"math/rand"
	"net/http"
	"time"

	"github.com/NicolasR2/chess-ai/backend/internal/engine"
	"github.com/NicolasR2/chess-ai/backend/internal/game"
	"github.com/go-chi/chi/v5"
)

type Handlers struct {
	store  *game.Store
	engine engine.Engine
}

type createReq struct {
	Mode  string `json:"mode"`
	Color string `json:"color"`
	Level int    `json:"level"`
}

type moveDTO struct {
	From      string `json:"from"`
	To        string `json:"to"`
	Promotion string `json:"promotion,omitempty"`
}

type gameState struct {
	ID          string   `json:"id"`
	FEN         string   `json:"fen"`
	Turn        string   `json:"turn"`
	Status      string   `json:"status"`
	PlayerColor string   `json:"playerColor,omitempty"`
	History     []string `json:"history,omitempty"`
	LastMove    *moveDTO `json:"lastMove,omitempty"`
	AIMove      *moveDTO `json:"aiMove,omitempty"`
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func gameOver(status string) bool {
	return status == "checkmate" || status == "stalemate" || status == "draw"
}

func (h *Handlers) createGame(w http.ResponseWriter, r *http.Request) {
	var req createReq
	_ = json.NewDecoder(r.Body).Decode(&req)
	color := req.Color
	if color == "random" || color == "" {
		if rand.Intn(2) == 0 {
			color = "white"
		} else {
			color = "black"
		}
	}
	g := h.store.New(color)
	g.Mode = req.Mode
	g.Level = req.Level
	resp := gameState{ID: g.ID(), FEN: g.FEN(), Turn: g.Turn(), Status: g.Status(), PlayerColor: color}
	// If AI mode and it is the AI's turn first (player is black), let the AI open.
	if g.Mode == "ai" && g.Turn() != color {
		h.applyAIMove(g, &resp)
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handlers) getGame(w http.ResponseWriter, r *http.Request) {
	g, err := h.store.Get(chi.URLParam(r, "id"))
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "game not found"})
		return
	}
	writeJSON(w, http.StatusOK, gameState{
		ID: g.ID(), FEN: g.FEN(), Turn: g.Turn(), Status: g.Status(),
		PlayerColor: g.PlayerColor, History: g.History(),
	})
}

func (h *Handlers) postMove(w http.ResponseWriter, r *http.Request) {
	g, err := h.store.Get(chi.URLParam(r, "id"))
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "game not found"})
		return
	}
	if gameOver(g.Status()) {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "game already over"})
		return
	}
	var m moveDTO
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	if err := g.Move(m.From, m.To, m.Promotion); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	resp := gameState{ID: g.ID(), FEN: g.FEN(), Turn: g.Turn(), Status: g.Status(), LastMove: &m}
	if g.Mode == "ai" && !gameOver(g.Status()) && g.Turn() != g.PlayerColor {
		h.applyAIMove(g, &resp)
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handlers) applyAIMove(g *game.Game, resp *gameState) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	uci, err := h.engine.BestMove(ctx, g.FEN(), g.Level)
	if err != nil {
		return
	}
	if err := g.MoveUCI(uci); err != nil {
		return
	}
	ai := &moveDTO{From: uci[0:2], To: uci[2:4]}
	if len(uci) == 5 {
		ai.Promotion = uci[4:5]
	}
	resp.AIMove = ai
	resp.FEN = g.FEN()
	resp.Turn = g.Turn()
	resp.Status = g.Status()
}

// LevelLadder is the set of selectable opponent ELOs (mirrors level_config.json).
var LevelLadder = []int{500, 1000, 1200, 1500, 1800, 2000, 2200}

func (h *Handlers) levels(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"levels": LevelLadder})
}
