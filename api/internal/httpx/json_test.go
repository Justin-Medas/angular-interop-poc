package httpx

import (
	"net/http/httptest"
	"testing"
)

func TestWriteError_OpenAPI_ShapeAndStatus(t *testing.T) {
	w := httptest.NewRecorder()
	WriteError(w, 404, "unknown_symbol", "no such ticker")
	if w.Code != 404 || w.Header().Get("Content-Type") != "application/json" {
		t.Fatalf("%d %q", w.Code, w.Header().Get("Content-Type"))
	}
	if got := w.Body.String(); got != `{"code":"unknown_symbol","message":"no such ticker"}`+"\n" {
		t.Errorf("body %q", got)
	}
}

func TestWriteJSON_Encodes(t *testing.T) {
	w := httptest.NewRecorder()
	WriteJSON(w, 200, map[string]int{"a": 1})
	if w.Code != 200 || w.Body.String() != "{\"a\":1}\n" {
		t.Errorf("%d %q", w.Code, w.Body.String())
	}
}
