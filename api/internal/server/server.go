// Package server wires routes and middleware into one http.Handler.
package server

import (
	"encoding/json"
	"net/http"

	"github.com/Justin-Medas/angular-interop-poc/api/internal/config"
	"github.com/Justin-Medas/angular-interop-poc/api/internal/httpx"
)

// New returns the API handler. Later blocks register quotes, watchlist, appd and agent routes here.
func New(cfg config.Config) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", healthz(cfg))
	return httpx.CORS(cfg.CORSAllowedOrigins)(mux)
}

func healthz(cfg config.Config) http.HandlerFunc {
	agent := "fallback-only"
	if cfg.AnthropicAPIKey != "" {
		agent = "model"
	}
	return func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok", "agent": agent})
	}
}
