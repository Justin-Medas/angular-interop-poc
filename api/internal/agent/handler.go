// HTTP layer for POST /agent/select-module (FR6, FR7): validates the request body against openapi.yaml's
// SelectModuleRequest and delegates to Agent. The planning logic stays HTTP-free so the eval runner can
// call it in-process (specs/testing.md §7).

package agent

import (
	"encoding/json"
	"net/http"
	"regexp"
	"unicode/utf8"

	"github.com/Justin-Medas/angular-interop-poc/api/internal/httpx"
)

// maxBody bounds the request read; a 500-character prompt plus context is far below it.
const maxBody = 64 << 10

// maxPrompt is SelectModuleRequest.prompt maxLength, counted in characters (NFR-S3).
const maxPrompt = 500

// tickerRE is the ticker pattern from openapi.yaml.
var tickerRE = regexp.MustCompile(`^[A-Z.]{1,10}$`)

// Register adds POST /agent/select-module, served by a.
func Register(mux *http.ServeMux, a *Agent) {
	mux.HandleFunc("POST /agent/select-module", selectModule(a))
}

// selectModule decodes and validates the request, then writes the Response. Errors are always the
// openapi.yaml Error body; the agent itself never fails (it falls back).
func selectModule(a *Agent) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		req, ok := decodeRequest(w, r)
		if !ok {
			return
		}
		httpx.WriteJSON(w, http.StatusOK, a.SelectModule(r.Context(), req))
	}
}

// decodeRequest parses the body. It reports a 400 itself and returns ok=false when the body breaks
// the SelectModuleRequest schema. Top-level fields are strict; the context object is lenient because
// real FDC3 contexts carry extra fields (openapi.yaml InstrumentContext).
func decodeRequest(w http.ResponseWriter, r *http.Request) (Request, bool) {
	bad := func(msg string) (Request, bool) {
		httpx.WriteError(w, http.StatusBadRequest, "invalid_request", msg)
		return Request{}, false
	}
	var in struct {
		Prompt  string          `json:"prompt"`
		Context json.RawMessage `json:"context"`
	}
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBody))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&in); err != nil {
		return bad("body must be a JSON object with a string prompt")
	}
	if n := utf8.RuneCountInString(in.Prompt); n < 1 || n > maxPrompt {
		return bad("prompt must be 1-500 characters")
	}
	req := Request{Prompt: in.Prompt}
	if in.Context == nil {
		return req, true
	}
	var c struct {
		Type string `json:"type"`
		ID   struct {
			Ticker string `json:"ticker"`
		} `json:"id"`
	}
	if err := json.Unmarshal(in.Context, &c); err != nil || c.Type != "fdc3.instrument" || !tickerRE.MatchString(c.ID.Ticker) {
		return bad("context must be an fdc3.instrument with id.ticker")
	}
	req.ContextTicker = c.ID.Ticker
	return req, true
}
