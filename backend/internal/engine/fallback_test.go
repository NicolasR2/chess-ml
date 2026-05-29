package engine

import (
	"context"
	"testing"

	"github.com/notnil/chess"
)

func TestFallbackReturnsLegalMove(t *testing.T) {
	e := NewFallback(2)
	fen := "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
	uci, err := e.BestMove(context.Background(), fen, 0)
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	fenFunc, _ := chess.FEN(fen)
	g := chess.NewGame(fenFunc)
	legal := false
	for _, m := range g.ValidMoves() {
		if m.String() == uci {
			legal = true
		}
	}
	if !legal {
		t.Fatalf("move %q not legal", uci)
	}
}

func TestFallbackCapturesHangingPiece(t *testing.T) {
	// White rook a1, black undefended rook a8, empty a-file. Best is Rxa8.
	fen := "r3k3/8/8/8/8/8/8/R3K3 w Qq - 0 1"
	e := NewFallback(3)
	uci, err := e.BestMove(context.Background(), fen, 0)
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if uci != "a1a8" {
		t.Fatalf("expected a1a8 (capture hanging rook), got %q", uci)
	}
}
