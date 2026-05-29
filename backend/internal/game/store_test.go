package game

import "testing"

func TestNewGameAndMove(t *testing.T) {
	s := NewStore()
	g := s.New("white")
	if g.FEN() == "" {
		t.Fatal("empty fen")
	}
	if g.Turn() != "white" {
		t.Fatalf("turn %s", g.Turn())
	}
	got, err := s.Get(g.ID())
	if err != nil || got.ID() != g.ID() {
		t.Fatalf("get failed: %v", err)
	}
	if err := g.Move("e2", "e4", ""); err != nil {
		t.Fatalf("legal move rejected: %v", err)
	}
	if g.Turn() != "black" {
		t.Fatalf("turn after move %s", g.Turn())
	}
	if err := g.Move("e2", "e5", ""); err == nil {
		t.Fatal("illegal move accepted")
	}
}

func TestStatusCheckmate(t *testing.T) {
	s := NewStore()
	g := s.New("white")
	// Fool's mate
	seq := [][3]string{{"f2", "f3", ""}, {"e7", "e5", ""}, {"g2", "g4", ""}, {"d8", "h4", ""}}
	for _, m := range seq {
		if err := g.Move(m[0], m[1], m[2]); err != nil {
			t.Fatalf("move %v: %v", m, err)
		}
	}
	if g.Status() != "checkmate" {
		t.Fatalf("status %s", g.Status())
	}
}

func TestStatusCheck(t *testing.T) {
	s := NewStore()
	g := s.New("white")
	// 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6?? no — just produce a check: Scholar-ish
	seq := [][3]string{{"e2", "e4", ""}, {"f7", "f5", ""}, {"d1", "h5", ""}}
	for _, m := range seq {
		if err := g.Move(m[0], m[1], m[2]); err != nil {
			t.Fatalf("move %v: %v", m, err)
		}
	}
	if g.Status() != "check" {
		t.Fatalf("expected check, got %s", g.Status())
	}
}
