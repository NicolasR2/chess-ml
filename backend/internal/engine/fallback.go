package engine

import (
	"context"
	"math"

	"github.com/notnil/chess"
)

// Fallback is a small alpha-beta (negamax) engine used until the trained
// model is available. Strength is driven by search depth.
type Fallback struct{ depth int }

func NewFallback(depth int) *Fallback {
	if depth < 1 {
		depth = 2
	}
	return &Fallback{depth: depth}
}

var pieceValue = map[chess.PieceType]float64{
	chess.Pawn:   1,
	chess.Knight: 3,
	chess.Bishop: 3.25,
	chess.Rook:   5,
	chess.Queen:  9,
	chess.King:   0,
}

// evaluate returns material balance from White's perspective.
func evaluate(pos *chess.Position) float64 {
	board := pos.Board()
	var score float64
	for sq := chess.A1; sq <= chess.H8; sq++ {
		p := board.Piece(sq)
		if p == chess.NoPiece {
			continue
		}
		v := pieceValue[p.Type()]
		if p.Color() == chess.White {
			score += v
		} else {
			score -= v
		}
	}
	return score
}

func negamax(pos *chess.Position, depth int, alpha, beta float64) float64 {
	moves := pos.ValidMoves()
	if len(moves) == 0 {
		// Terminal: checkmate is bad for the side to move; stalemate is a draw.
		if pos.Status() == chess.Checkmate {
			return -1e6
		}
		return 0
	}
	if depth == 0 {
		sign := 1.0
		if pos.Turn() == chess.Black {
			sign = -1.0
		}
		return sign * evaluate(pos)
	}
	best := math.Inf(-1)
	for _, m := range moves {
		score := -negamax(pos.Update(m), depth-1, -beta, -alpha)
		if score > best {
			best = score
		}
		if best > alpha {
			alpha = best
		}
		if alpha >= beta {
			break
		}
	}
	return best
}

func (f *Fallback) BestMove(ctx context.Context, fen string, sims int) (string, error) {
	fenFunc, err := chess.FEN(fen)
	if err != nil {
		return "", err
	}
	g := chess.NewGame(fenFunc)
	pos := g.Position()
	moves := pos.ValidMoves()
	if len(moves) == 0 {
		return "", ErrNoMoves
	}
	var bestMove *chess.Move
	best := math.Inf(-1)
	alpha, beta := math.Inf(-1), math.Inf(1)
	for _, m := range moves {
		score := -negamax(pos.Update(m), f.depth-1, -beta, -alpha)
		if bestMove == nil || score > best {
			best = score
			bestMove = m
		}
		if best > alpha {
			alpha = best
		}
	}
	return bestMove.String(), nil
}
