package game

import (
	"fmt"
	"sync"

	"github.com/google/uuid"
	"github.com/notnil/chess"
)

// Game wraps a chess game plus web-app metadata.
type Game struct {
	id          string
	g           *chess.Game
	PlayerColor string // "white" | "black"
	Mode        string // "ai" | "local"
	Sims        int
	mu          sync.Mutex
}

// Store keeps games in memory, keyed by id.
type Store struct {
	mu    sync.RWMutex
	games map[string]*Game
}

func NewStore() *Store { return &Store{games: map[string]*Game{}} }

func (s *Store) New(playerColor string) *Game {
	g := &Game{id: uuid.NewString(), g: chess.NewGame(), PlayerColor: playerColor}
	s.mu.Lock()
	s.games[g.id] = g
	s.mu.Unlock()
	return g
}

func (s *Store) Get(id string) (*Game, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	g, ok := s.games[id]
	if !ok {
		return nil, fmt.Errorf("game not found")
	}
	return g, nil
}

func (g *Game) ID() string  { return g.id }
func (g *Game) FEN() string { return g.g.Position().String() }

func (g *Game) Turn() string {
	if g.g.Position().Turn() == chess.White {
		return "white"
	}
	return "black"
}

// Status reports a coarse game state for the UI.
func (g *Game) Status() string {
	switch g.g.Method() {
	case chess.Checkmate:
		return "checkmate"
	case chess.Stalemate:
		return "stalemate"
	}
	if g.g.Outcome() != chess.NoOutcome {
		return "draw"
	}
	if moves := g.g.Moves(); len(moves) > 0 && moves[len(moves)-1].HasTag(chess.Check) {
		return "check"
	}
	return "ongoing"
}

// Move applies a move given algebraic squares + optional promotion ("q","r","b","n").
func (g *Game) Move(from, to, promo string) error {
	return g.MoveUCI(from + to + promo)
}

// MoveUCI applies a move in UCI form (e.g. "e2e4", "e7e8q").
func (g *Game) MoveUCI(uci string) error {
	g.mu.Lock()
	defer g.mu.Unlock()
	for _, m := range g.g.ValidMoves() {
		if m.String() == uci {
			return g.g.Move(m)
		}
	}
	return fmt.Errorf("illegal move %q", uci)
}

// History returns the moves played, in SAN.
func (g *Game) History() []string {
	moves := g.g.Moves()
	out := make([]string, 0, len(moves))
	enc := chess.AlgebraicNotation{}
	pos := chess.NewGame().Position()
	for _, m := range moves {
		out = append(out, enc.Encode(pos, m))
		pos = pos.Update(m)
	}
	return out
}
