package httpx

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

var allowed = []string{"http://localhost:4200", "http://localhost:8090"}

func serve(method, origin string) *httptest.ResponseRecorder {
	h := CORS(allowed)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "boom", http.StatusTeapot) // errors must carry CORS headers too
	}))
	r := httptest.NewRequest(method, "/anything", nil)
	if origin != "" {
		r.Header.Set("Origin", origin)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func TestCORS_FR18_AllowedOriginIsEchoedOnErrors(t *testing.T) {
	w := serve(http.MethodGet, "http://localhost:4200")
	if w.Code != http.StatusTeapot {
		t.Fatalf("handler not reached: %d", w.Code)
	}
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:4200" {
		t.Errorf("ACAO = %q", got)
	}
	if got := w.Header().Get("Vary"); got != "Origin" {
		t.Errorf("Vary = %q", got)
	}
}

func TestCORS_FR18_UnlistedOriginGetsNoCORSHeaders(t *testing.T) {
	for _, origin := range []string{"http://evil.test", ""} {
		w := serve(http.MethodGet, origin)
		if w.Header().Get("Access-Control-Allow-Origin") != "" {
			t.Errorf("origin %q got ACAO", origin)
		}
	}
}

func TestCORS_FR18_PreflightIs204OnAnyRoute(t *testing.T) {
	w := serve(http.MethodOptions, "http://localhost:8090")
	if w.Code != http.StatusNoContent {
		t.Fatalf("status = %d", w.Code)
	}
	if got := w.Header().Get("Access-Control-Allow-Methods"); got != "GET, PUT, POST, OPTIONS" {
		t.Errorf("methods = %q", got)
	}
	if got := w.Header().Get("Access-Control-Allow-Headers"); got != "Content-Type" {
		t.Errorf("headers = %q", got)
	}
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:8090" {
		t.Errorf("ACAO = %q", got)
	}
}

func TestCORS_FR18_PreflightFromUnlistedOriginHasNoCORSHeaders(t *testing.T) {
	w := serve(http.MethodOptions, "http://evil.test")
	if w.Code != http.StatusNoContent {
		t.Fatalf("status = %d", w.Code)
	}
	if w.Header().Get("Access-Control-Allow-Origin") != "" || w.Header().Get("Access-Control-Allow-Methods") != "" {
		t.Error("unlisted origin must get no CORS headers")
	}
}
