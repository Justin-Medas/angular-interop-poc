package appd

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

// Drift guard: the embedded copy must equal specs/appd.json (FR18).
func TestEmbedded_FR18_EqualsSpecFile(t *testing.T) {
	want, err := os.ReadFile("../../../specs/appd.json")
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(want, appdJSON) {
		t.Error("api/internal/appd/appd.json differs from specs/appd.json; copy it over")
	}
}

func TestRegister_FR18_ServesDirectoryJSON(t *testing.T) {
	mux := http.NewServeMux()
	Register(mux)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/appd/v2/apps", nil))
	if w.Code != 200 || w.Header().Get("Content-Type") != "application/json" || !bytes.Equal(w.Body.Bytes(), appdJSON) {
		t.Errorf("status %d, type %q", w.Code, w.Header().Get("Content-Type"))
	}
}
