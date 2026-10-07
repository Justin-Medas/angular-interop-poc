// Package server wires routes and middleware into one http.Handler.
package server

import (
	"context"
	"net/http"
	"time"

	"github.com/Justin-Medas/angular-interop-poc/api/internal/appd"
	"github.com/Justin-Medas/angular-interop-poc/api/internal/config"
	"github.com/Justin-Medas/angular-interop-poc/api/internal/httpx"
	"github.com/Justin-Medas/angular-interop-poc/api/internal/mock"
	"github.com/Justin-Medas/angular-interop-poc/api/internal/quotes"
)

const tickInterval = 2 * time.Second // tickIntervalMs in specs/mock-data.yaml

// New returns the API handler. Later blocks register quotes, watchlist, appd and agent routes here.
func New(cfg config.Config) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", healthz(cfg))
	appd.Register(mux)

	store := mock.NewStore(cfg.MockSeed, cfg.MockNow)
	if cfg.MockTick {
		go store.RunTicker(context.Background(), tickInterval, time.Now)
	}
	quotes.Register(mux, store)
	return httpx.CORS(cfg.CORSAllowedOrigins)(mux)
}

func healthz(cfg config.Config) http.HandlerFunc {
	agent := "fallback-only"
	if cfg.AnthropicAPIKey != "" {
		agent = "model"
	}
	return func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok", "agent": agent})
	}
}
