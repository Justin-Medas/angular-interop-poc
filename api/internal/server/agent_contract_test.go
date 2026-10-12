package server

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/Justin-Medas/angular-interop-poc/api/internal/agent"
	"github.com/Justin-Medas/angular-interop-poc/api/internal/config"
)

const planResponse = "/components/schemas/WorkspacePlanResponse"

// scripted answers with fixed replies so the contract test sees a source=model response without a network.
type scripted struct{ replies []agent.Reply }

func (s *scripted) Next(context.Context, string, []agent.Message) (agent.Reply, error) {
	r := s.replies[0]
	s.replies = s.replies[1:]
	return r, nil
}

func init() {
	// WorkspacePlanResponse.plan is an external $ref to specs/agent-tool-schema.json (SPEC §9 check).
	b, err := os.ReadFile("../../../specs/agent-tool-schema.json")
	if err != nil {
		panic(err)
	}
	parsed, err := jsonschemaParse(b)
	if err != nil {
		panic(err)
	}
	if err := compiler.AddResource(specBase+"agent-tool-schema.json", parsed); err != nil {
		panic(err)
	}
}

func postAgent(h http.Handler, body string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("POST", "/agent/select-module", strings.NewReader(body)))
	return w
}

func TestContract_FR6_FallbackResponse(t *testing.T) {
	w := postAgent(New(config.Config{MockNow: defaultNow}), `{"prompt":"chart tesla over the week"}`)
	if w.Code != 200 {
		t.Fatalf("status %d: %s", w.Code, w.Body)
	}
	validate(t, planResponse, w.Body.Bytes())
	if !strings.Contains(w.Body.String(), `"fallbackReason":"no_api_key"`) {
		t.Errorf("body: %s", w.Body)
	}
}

func TestContract_FR6_ModelResponse(t *testing.T) {
	plan := `{"modules":[{"module":"compare","payload":{"symbols":["NVDA","AAPL"]}}],"fdc3Action":{"type":"broadcastInstrument","ticker":"NVDA"},"rationale":"Comparing your top two gainers."}`
	client := &scripted{replies: []agent.Reply{{ToolUseID: "t1"}, {Text: plan}}}
	cfg := config.Config{MockNow: defaultNow, AgentModel: "claude-sonnet-5-5", AgentTimeout: time.Second}
	w := postAgent(newHandler(cfg, client), `{"prompt":"compare my two biggest gainers and share the best"}`)
	validate(t, planResponse, w.Body.Bytes())
	if !strings.Contains(w.Body.String(), `"source":"model"`) || !strings.Contains(w.Body.String(), `"toolCalls":1`) {
		t.Errorf("body: %s", w.Body)
	}
}

func TestContract_FR6_BadRequest(t *testing.T) {
	w := postAgent(New(config.Config{MockNow: defaultNow}), `{"prompt":""}`)
	if w.Code != 400 {
		t.Fatalf("status %d", w.Code)
	}
	validate(t, errorRef, w.Body.Bytes())
}
