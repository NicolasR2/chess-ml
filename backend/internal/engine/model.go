package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

// Model is an Engine that delegates to the Python model service
// (POST {baseURL}/bestmove {fen, sims} -> {move, eval, pv}).
type Model struct {
	baseURL string
	client  *http.Client
}

func NewModel(baseURL string, client *http.Client) *Model {
	if client == nil {
		client = http.DefaultClient
	}
	return &Model{baseURL: baseURL, client: client}
}

func (m *Model) BestMove(ctx context.Context, fen string, sims int) (string, error) {
	body, _ := json.Marshal(map[string]any{"fen": fen, "sims": sims})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, m.baseURL+"/bestmove", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := m.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("model status %d", resp.StatusCode)
	}
	var out struct {
		Move string `json:"move"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", err
	}
	if out.Move == "" {
		return "", fmt.Errorf("model returned empty move")
	}
	return out.Move, nil
}
