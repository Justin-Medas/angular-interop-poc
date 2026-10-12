package agent

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/Justin-Medas/angular-interop-poc/api/internal/mock"
)

// fakeClient replays scripted replies and records what it was sent (FR16: "unit test with a fake model client").
type fakeClient struct {
	replies []Reply
	err     error
	block   bool // wait for the context instead of answering (timeout test)
	calls   int
	system  string
	history [][]Message
}

func (f *fakeClient) Next(ctx context.Context, system string, msgs []Message) (Reply, error) {
	f.system = system
	f.history = append(f.history, append([]Message(nil), msgs...))
	if f.block {
		<-ctx.Done()
		return Reply{}, ctx.Err()
	}
	if f.err != nil {
		return Reply{}, f.err
	}
	r := f.replies[f.calls]
	f.calls++
	return r, nil
}

const chartPlan = `{"modules":[{"module":"price-chart","payload":{"symbol":"TSLA","range":"1D"}}],"fdc3Action":null,"rationale":"Charting your worst performer."}`

func tool(id string) Reply { return Reply{ToolUseID: id} }
func say(text string) Reply { return Reply{Text: text} }

func newAgent(c ModelClient) *Agent {
	return &Agent{
		Client:  c,
		Model:   "claude-sonnet-5-5",
		Timeout: time.Second,
		Quotes:  mock.NewStore(42, time.Date(2026, 10, 7, 15, 30, 0, 0, time.UTC)),
	}
}

func TestEmbeddedSchema_FR6_EqualsSpecFile(t *testing.T) {
	want, err := os.ReadFile("../../../specs/agent-tool-schema.json")
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(want, schemaJSON) {
		t.Error("api/internal/agent/agent-tool-schema.json differs from specs/agent-tool-schema.json; copy it over")
	}
}

func TestSelectModule_FR6_ModelPlan(t *testing.T) {
	f := &fakeClient{replies: []Reply{say(chartPlan)}}
	got := newAgent(f).SelectModule(context.Background(), Request{Prompt: "chart tesla"})
	if got.Source != "model" || got.Model != "claude-sonnet-5-5" || got.FallbackReason != "" || got.ToolCalls != 0 {
		t.Fatalf("response metadata: %+v", got)
	}
	if got.Plan.Modules[0].Module != "price-chart" || got.Plan.Modules[0].Payload["symbol"] != "TSLA" || got.Plan.FDC3Action != nil {
		t.Errorf("plan: %+v", got.Plan)
	}
}

func TestSelectModule_FR6_SendsPromptContextWatchlistOnly(t *testing.T) {
	f := &fakeClient{replies: []Reply{say(chartPlan)}}
	newAgent(f).SelectModule(context.Background(), Request{Prompt: "chart it", ContextTicker: "AAPL"})
	var user struct {
		Prompt    string
		Context   map[string]any
		Watchlist []string
	}
	first := f.history[0][0]
	if first.Role != "user" {
		t.Fatalf("first message role %q", first.Role)
	}
	if err := json.Unmarshal([]byte(first.Text), &user); err != nil {
		t.Fatal(err)
	}
	if user.Prompt != "chart it" || user.Context["type"] != "fdc3.instrument" || len(user.Watchlist) != 6 || user.Watchlist[0] != "AAPL" {
		t.Errorf("user message: %s", first.Text)
	}
}

func TestSelectModule_FR6_NoContextSendsNull(t *testing.T) {
	f := &fakeClient{replies: []Reply{say(chartPlan)}}
	newAgent(f).SelectModule(context.Background(), Request{Prompt: "chart tesla"})
	if !strings.Contains(f.history[0][0].Text, `"context":null`) {
		t.Errorf("want explicit null context: %s", f.history[0][0].Text)
	}
}

func TestSystemPrompt_FR6_HasRulesCatalogAndUniverse(t *testing.T) {
	f := &fakeClient{replies: []Reply{say(chartPlan)}}
	newAgent(f).SelectModule(context.Background(), Request{Prompt: "chart tesla"})
	for _, want := range []string{"R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "watchlist-movers", "price-chart", "instrument-detail", "compare", "blotter", "none", "TSLA", "Tesla Inc.", "XOM"} {
		if !strings.Contains(f.system, want) {
			t.Errorf("system prompt lacks %q", want)
		}
	}
}

func TestSelectModule_FR8_RationaleTruncatedNotFailed(t *testing.T) {
	long := strings.Repeat("é", 200)
	f := &fakeClient{replies: []Reply{say(strings.Replace(chartPlan, "Charting your worst performer.", long, 1))}}
	got := newAgent(f).SelectModule(context.Background(), Request{Prompt: "chart tesla"})
	if got.Source != "model" || len([]rune(got.Plan.Rationale)) != 160 {
		t.Errorf("source %s, rationale runes %d", got.Source, len([]rune(got.Plan.Rationale)))
	}
}

func TestSelectModule_FR16_ToolLoop(t *testing.T) {
	f := &fakeClient{replies: []Reply{tool("t1"), say(chartPlan)}}
	got := newAgent(f).SelectModule(context.Background(), Request{Prompt: "chart my worst performer"})
	if got.Source != "model" || got.ToolCalls != 1 {
		t.Fatalf("source %s toolCalls %d reason %s", got.Source, got.ToolCalls, got.FallbackReason)
	}
	second := f.history[1]
	if len(second) != 3 || second[1].Role != "assistant" || second[1].ToolUseID != "t1" || second[2].Role != "user" || second[2].ToolUseID != "t1" {
		t.Fatalf("second request must echo the tool call and carry its result: %+v", second)
	}
	var quotes []mock.Quote
	if err := json.Unmarshal([]byte(second[2].Text), &quotes); err != nil {
		t.Fatalf("tool result is the GET /quotes array: %v", err)
	}
	if len(quotes) != 6 || quotes[0].Symbol != "AAPL" || quotes[3].Symbol != "TSLA" || quotes[3].ChangePct != -3.12 {
		t.Errorf("tool result: %s", second[2].Text)
	}
}

func TestSelectModule_FR16_ThreeToolCallsAreAllowed(t *testing.T) {
	f := &fakeClient{replies: []Reply{tool("a"), tool("b"), tool("c"), say(chartPlan)}}
	got := newAgent(f).SelectModule(context.Background(), Request{Prompt: "chart my worst performer"})
	if got.Source != "model" || got.ToolCalls != 3 {
		t.Errorf("source %s toolCalls %d reason %s", got.Source, got.ToolCalls, got.FallbackReason)
	}
}

func TestSelectModule_FR7_FallbackReasons(t *testing.T) {
	badSemantic := strings.Replace(chartPlan, `"TSLA"`, `"ZZZZ"`, 1)
	rows := []struct {
		name      string
		client    ModelClient
		reason    string
		toolCalls int
	}{
		{"no_api_key", nil, "no_api_key", 0},
		{"model_error", &fakeClient{err: errors.New("boom")}, "model_error", 0},
		{"timeout", &fakeClient{block: true}, "timeout", 0},
		{"refusal", &fakeClient{replies: []Reply{{Refused: true}}}, "refusal", 0},
		{"tool_limit", &fakeClient{replies: []Reply{tool("a"), tool("b"), tool("c"), tool("d")}}, "tool_limit", 3},
		{"invalid_output not JSON", &fakeClient{replies: []Reply{say("sure! here you go")}}, "invalid_output", 0},
		{"invalid_output schema", &fakeClient{replies: []Reply{say(`{"modules":[],"rationale":"x"}`)}}, "invalid_output", 0},
		{"invalid_output extra field", &fakeClient{replies: []Reply{say(strings.Replace(chartPlan, `"rationale"`, `"extra":1,"rationale"`, 1))}}, "invalid_output", 0},
		{"invalid_output semantic S4", &fakeClient{replies: []Reply{say(badSemantic)}}, "invalid_output", 0},
		{"invalid_output after a tool call", &fakeClient{replies: []Reply{tool("a"), say("nope")}}, "invalid_output", 1},
	}
	for _, tc := range rows {
		t.Run("FR7 "+tc.name, func(t *testing.T) {
			a := newAgent(tc.client)
			if tc.client == nil {
				a.Client = nil
			}
			if tc.reason == "timeout" {
				a.Timeout = 20 * time.Millisecond
			}
			var logged []string
			a.Logf = func(format string, args ...any) { logged = append(logged, format) }
			got := a.SelectModule(context.Background(), Request{Prompt: "chart tesla"})
			if got.Source != "fallback" || got.FallbackReason != tc.reason || got.Model != "" || got.ToolCalls != tc.toolCalls {
				t.Fatalf("response: %+v", got)
			}
			want := Fallback("chart tesla", "")
			if len(got.Plan.Modules) != 1 || got.Plan.Modules[0].Module != want.Modules[0].Module || got.Plan.FDC3Action != nil || got.Plan.Rationale != want.Rationale {
				t.Errorf("fallback plan: %+v", got.Plan)
			}
			if tc.reason == "invalid_output" && len(logged) == 0 {
				t.Error("invalid output must be logged (SPEC §7.3)")
			}
		})
	}
}

func TestSelectModule_FR7_FallbackUsesContextTicker(t *testing.T) {
	got := newAgent(nil).SelectModule(context.Background(), Request{Prompt: "chart this", ContextTicker: "TSLA"})
	if got.Plan.Modules[0].Payload["symbol"] != "TSLA" {
		t.Errorf("plan: %+v", got.Plan)
	}
}

func TestSelectModule_FR7_ParentCancelIsModelError(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	got := newAgent(&fakeClient{block: true}).SelectModule(ctx, Request{Prompt: "chart tesla"})
	if got.FallbackReason != "model_error" {
		t.Errorf("reason %q", got.FallbackReason)
	}
}

func TestSelectModule_FR7_TimeoutDuringToolLoop(t *testing.T) {
	a := newAgent(&fakeClient{replies: []Reply{tool("a")}})
	a.Timeout = time.Nanosecond
	time.Sleep(time.Millisecond)
	got := a.SelectModule(context.Background(), Request{Prompt: "chart tesla"})
	if got.FallbackReason != "timeout" {
		t.Errorf("reason %q", got.FallbackReason)
	}
}
