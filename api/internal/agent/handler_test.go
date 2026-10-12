package agent

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func handlerFor(c ModelClient) http.Handler {
	mux := http.NewServeMux()
	Register(mux, newAgent(c))
	return mux
}

func post(h http.Handler, body string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("POST", "/agent/select-module", strings.NewReader(body)))
	return w
}

func TestHandler_FR6_ReturnsResponseBody(t *testing.T) {
	w := post(handlerFor(&fakeClient{replies: []Reply{say(chartPlan)}}), `{"prompt":"chart tesla","context":{"type":"fdc3.instrument","name":"Apple","id":{"ticker":"AAPL","ISIN":"x"},"extra":1}}`)
	if w.Code != 200 || w.Header().Get("Content-Type") != "application/json" {
		t.Fatalf("status %d type %q", w.Code, w.Header().Get("Content-Type"))
	}
	var got map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if got["source"] != "model" || got["model"] != "claude-sonnet-5-5" || got["toolCalls"].(float64) != 0 {
		t.Errorf("body: %s", w.Body)
	}
	if _, has := got["fallbackReason"]; has {
		t.Error("fallbackReason must be absent for source=model")
	}
}

func TestHandler_FR7_FallbackBodyOmitsModel(t *testing.T) {
	w := post(handlerFor(nil), `{"prompt":"chart tesla"}`)
	var got map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &got)
	if got["source"] != "fallback" || got["fallbackReason"] != "no_api_key" {
		t.Errorf("body: %s", w.Body)
	}
	if _, has := got["model"]; has {
		t.Error("model must be absent for source=fallback")
	}
}

func TestHandler_FR6_ContextTickerReachesFallback(t *testing.T) {
	w := post(handlerFor(nil), `{"prompt":"chart this","context":{"type":"fdc3.instrument","id":{"ticker":"TSLA"}}}`)
	if !strings.Contains(w.Body.String(), `"symbol":"TSLA"`) {
		t.Errorf("body: %s", w.Body)
	}
}

func TestHandler_FR6_BadRequests(t *testing.T) {
	rows := []struct{ name, body string }{
		{"malformed JSON", `{`},
		{"missing prompt", `{}`},
		{"empty prompt", `{"prompt":""}`},
		{"prompt over 500 characters", `{"prompt":"` + strings.Repeat("a", 501) + `"}`},
		{"prompt not a string", `{"prompt":3}`},
		{"extra field", `{"prompt":"x","y":1}`},
		{"context wrong type const", `{"prompt":"x","context":{"type":"fdc3.contact","id":{"ticker":"AAPL"}}}`},
		{"context without id", `{"prompt":"x","context":{"type":"fdc3.instrument"}}`},
		{"context without ticker", `{"prompt":"x","context":{"type":"fdc3.instrument","id":{}}}`},
		{"context bad ticker", `{"prompt":"x","context":{"type":"fdc3.instrument","id":{"ticker":"aapl"}}}`},
	}
	for _, tc := range rows {
		t.Run("FR6 "+tc.name, func(t *testing.T) {
			w := post(handlerFor(nil), tc.body)
			var e map[string]string
			_ = json.Unmarshal(w.Body.Bytes(), &e)
			if w.Code != 400 || e["code"] != "invalid_request" {
				t.Errorf("status %d body %s", w.Code, w.Body)
			}
		})
	}
}

func TestHandler_FR6_PromptLimitCountsCharacters(t *testing.T) {
	w := post(handlerFor(nil), `{"prompt":"`+strings.Repeat("é", 500)+`"}`)
	if w.Code != 200 {
		t.Errorf("500 two-byte characters are within the limit: %d %s", w.Code, w.Body)
	}
}
