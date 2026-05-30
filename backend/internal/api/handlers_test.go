package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/NicolasR2/chess-ai/backend/internal/engine"
	"github.com/NicolasR2/chess-ai/backend/internal/game"
)

func newTestServer() *httptest.Server {
	return httptest.NewServer(NewRouter(game.NewStore(), engine.NewFallback(2)))
}

func TestCreateGameAndMove(t *testing.T) {
	srv := newTestServer()
	defer srv.Close()

	body, _ := json.Marshal(map[string]any{"mode": "local", "color": "white", "level": 1500})
	resp, err := http.Post(srv.URL+"/api/games", "application/json", bytes.NewReader(body))
	if err != nil || resp.StatusCode != 200 {
		t.Fatalf("create status %v %v", resp, err)
	}
	var created struct {
		ID  string `json:"id"`
		FEN string `json:"fen"`
	}
	json.NewDecoder(resp.Body).Decode(&created)
	if created.ID == "" {
		t.Fatal("no id")
	}

	mb, _ := json.Marshal(map[string]any{"from": "e2", "to": "e4"})
	mresp, _ := http.Post(srv.URL+"/api/games/"+created.ID+"/moves", "application/json", bytes.NewReader(mb))
	if mresp.StatusCode != 200 {
		t.Fatalf("move status %d", mresp.StatusCode)
	}
	var moved struct {
		Turn string `json:"turn"`
	}
	json.NewDecoder(mresp.Body).Decode(&moved)
	if moved.Turn != "black" {
		t.Fatalf("turn %s", moved.Turn)
	}
}

func TestIllegalMoveRejected(t *testing.T) {
	srv := newTestServer()
	defer srv.Close()

	body, _ := json.Marshal(map[string]any{"mode": "local", "color": "white"})
	resp, _ := http.Post(srv.URL+"/api/games", "application/json", bytes.NewReader(body))
	var created struct {
		ID string `json:"id"`
	}
	json.NewDecoder(resp.Body).Decode(&created)

	mb, _ := json.Marshal(map[string]any{"from": "e2", "to": "e5"})
	mresp, _ := http.Post(srv.URL+"/api/games/"+created.ID+"/moves", "application/json", bytes.NewReader(mb))
	if mresp.StatusCode != 400 {
		t.Fatalf("expected 400, got %d", mresp.StatusCode)
	}
}

func TestAIRepliesInAIMode(t *testing.T) {
	srv := newTestServer()
	defer srv.Close()

	body, _ := json.Marshal(map[string]any{"mode": "ai", "color": "white", "level": 1500})
	resp, _ := http.Post(srv.URL+"/api/games", "application/json", bytes.NewReader(body))
	var created struct {
		ID string `json:"id"`
	}
	json.NewDecoder(resp.Body).Decode(&created)

	mb, _ := json.Marshal(map[string]any{"from": "e2", "to": "e4"})
	mresp, _ := http.Post(srv.URL+"/api/games/"+created.ID+"/moves", "application/json", bytes.NewReader(mb))
	var moved struct {
		AIMove *struct {
			From string `json:"from"`
			To   string `json:"to"`
		} `json:"aiMove"`
		Turn string `json:"turn"`
	}
	json.NewDecoder(mresp.Body).Decode(&moved)
	if moved.AIMove == nil {
		t.Fatal("expected AI reply move")
	}
	if moved.Turn != "white" {
		t.Fatalf("after AI reply it should be white's turn, got %s", moved.Turn)
	}
}

func TestLevelsEndpoint(t *testing.T) {
	srv := newTestServer()
	defer srv.Close()
	resp, err := http.Get(srv.URL + "/api/levels")
	if err != nil || resp.StatusCode != 200 {
		t.Fatalf("levels status %v %v", resp, err)
	}
	var out struct {
		Levels []int `json:"levels"`
	}
	json.NewDecoder(resp.Body).Decode(&out)
	if len(out.Levels) != 7 || out.Levels[0] != 500 {
		t.Fatalf("unexpected levels %v", out.Levels)
	}
}
