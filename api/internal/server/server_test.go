package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Justin-Medas/angular-interop-poc/api/internal/config"
)

func health(t *testing.T, cfg config.Config) (*httptest.ResponseRecorder, map[string]string) {
	t.Helper()
	w := httptest.NewRecorder()
	New(cfg).ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	var body map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid JSON %q: %v", w.Body.String(), err)
	}
	return w, body
}

func TestHealthz_FR18_FallbackOnlyWithoutKey(t *testing.T) {
	w, body := health(t, config.Config{})
	if w.Code != http.StatusOK || w.Header().Get("Content-Type") != "application/json" {
		t.Fatalf("status/content-type: %d %q", w.Code, w.Header().Get("Content-Type"))
	}
	if len(body) != 2 || body["status"] != "ok" || body["agent"] != "fallback-only" {
		t.Errorf("body = %v", body)
	}
}

func TestHealthz_FR18_ModelWithKey(t *testing.T) {
	_, body := health(t, config.Config{AnthropicAPIKey: "k"})
	if body["agent"] != "model" {
		t.Errorf("body = %v", body)
	}
}

func TestServer_FR18_CORSAppliesToEveryRoute(t *testing.T) {
	cfg := config.Config{CORSAllowedOrigins: []string{"http://localhost:4200"}}
	for _, method := range []string{http.MethodGet, http.MethodOptions} {
		w := httptest.NewRecorder()
		r := httptest.NewRequest(method, "/no-such-route", nil)
		r.Header.Set("Origin", "http://localhost:4200")
		New(cfg).ServeHTTP(w, r)
		if w.Header().Get("Access-Control-Allow-Origin") != "http://localhost:4200" {
			t.Errorf("%s /no-such-route: missing ACAO", method)
		}
	}
}
