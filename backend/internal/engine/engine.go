package engine

import (
	"context"
	"errors"
)

// ErrNoMoves is returned when the position has no legal moves.
var ErrNoMoves = errors.New("no legal moves")

// Engine picks a move for the side to move, in UCI form (e.g. "e2e4", "e7e8q").
// level is the target ELO (e.g. 1500); engines that don't support levels ignore it.
type Engine interface {
	BestMove(ctx context.Context, fen string, level int) (string, error)
}
