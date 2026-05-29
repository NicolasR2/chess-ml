package engine

import (
	"context"
	"errors"
)

// ErrNoMoves is returned when the position has no legal moves.
var ErrNoMoves = errors.New("no legal moves")

// Engine picks a move for the side to move, in UCI form (e.g. "e2e4", "e7e8q").
type Engine interface {
	BestMove(ctx context.Context, fen string, sims int) (string, error)
}
