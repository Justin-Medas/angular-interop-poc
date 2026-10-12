// Package server wires routes and middleware into one http.Handler.
package server

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/Justin-Medas/angular-interop-poc/api/internal/agent"
	"github.com/Justin-Medas/angular-interop-poc/api/internal/appd"
	"github.com/Justin-Medas/angular-interop-poc/api/internal/config"
	"github.com/Justin-Medas/angular-interop-poc/api/internal/httpx"
	"github.com/Justin-Medas/angular-interop-poc/api/internal/mock"
	"github.com/Justin-Medas/angular-interop-poc/api/internal/quotes"
)

// tickInterval is how often MOCK_TICK=on moves prices.
const tickInterval = 2 * time.Second // tickIntervalMs in specs/mock-data.yaml

// New returns the API handler. With ANTHROPIC_API_KEY set the agent talks to the model; without it
// the agent is fallback-only (SPEC §6.3, FR7).
func New(cfg config.Config) http.Handler {
	var client agent.ModelClient // stays a nil interface without a key, which Agent reads as no_api_key
	if cfg.AnthropicAPIKey != "" {
		client = agent.NewAnthropicClient(cfg.AnthropicAPIKey, cfg.AgentModel)
	}
	return newHandler(cfg, client)
}

// newHandler is New with the model client injected, so contract tests can serve source=model
// responses without a network.
func newHandler(cfg config.Config, client agent.ModelClient) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", healthz(cfg))
	appd.Register(mux)

	store := mock.NewStore(cfg.MockSeed, cfg.MockNow)
	if cfg.MockTick {
		go store.RunTicker(context.Background(), tickInterval, time.Now)
	}
	quotes.Register(mux, store)
	agent.Register(mux, &agent.Agent{Client: client, Model: cfg.AgentModel, Timeout: cfg.AgentTimeout, Quotes: store, Logf: log.Printf})
	return httpx.CORS(cfg.CORSAllowedOrigins)(mux)
}

// healthz serves GET /healthz (FR18). The agent mode is decided once at startup because the API key
// cannot change while the process runs; the key itself is never reported.
func healthz(cfg config.Config) http.HandlerFunc {
	agent := "fallback-only"
	if cfg.AnthropicAPIKey != "" {
		agent = "model"
	}
	return func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok", "agent": agent})
	}
}
