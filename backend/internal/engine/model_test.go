package engine

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestModelEngineParsesMove(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/bestmove" {
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"move":"e2e4","eval":0.3,"pv":["e2e4"]}`))
	}))
	defer srv.Close()

	e := NewModel(srv.URL, srv.Client())
	uci, err := e.BestMove(context.Background(), "startpos", 200)
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if uci != "e2e4" {
		t.Fatalf("got %q", uci)
	}
}

func TestModelEngineErrorsOnEmptyMove(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"move":""}`))
	}))
	defer srv.Close()

	e := NewModel(srv.URL, srv.Client())
	if _, err := e.BestMove(context.Background(), "fen", 1); err == nil {
		t.Fatal("expected error on empty move")
	}
}
