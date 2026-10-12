// The model path of POST /agent/select-module: one bounded conversation with the model, a read-only
// tool loop, then schema and semantic validation of the answer. Any failure becomes the deterministic
// fallback with a reason. Implements FR6, FR7 and FR16 (SPEC §7.2–7.5).

package agent

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/Justin-Medas/angular-interop-poc/api/internal/mock"
	"github.com/santhosh-tekuri/jsonschema/v6"
)

// maxToolCalls is the per-request tool budget (FR16); a 4th call ends the loop with "tool_limit".
const maxToolCalls = 3

// schemaJSON is a copy of specs/agent-tool-schema.json (go:embed cannot reach outside the module);
// a test keeps them equal. It validates every model answer server-side (FR6).
//
//go:embed agent-tool-schema.json
var schemaJSON []byte

// Message is one turn of the conversation, in the provider-neutral shape the loop works with.
// A user message with ToolUseID set is the result of that tool call; an assistant message with
// ToolUseID set is the model's request for it. This keeps the SDK out of the loop so it can be
// tested with a fake client (FR16).
type Message struct {
	Role      string // "user" or "assistant"
	Text      string
	ToolUseID string
}

// Reply is the model's next turn. At most one of ToolUseID (it wants get_watchlist_quotes) and
// Refused is set; otherwise Text is the final answer.
type Reply struct {
	Text      string
	ToolUseID string
	Refused   bool
}

// ModelClient sends the conversation so far and returns the model's next turn. Implementations
// must honor ctx: the agent's timeout covers the whole loop (FR7).
type ModelClient interface {
	Next(ctx context.Context, system string, msgs []Message) (Reply, error)
}

// QuoteSource is the read-only market data the tool exposes: the same data GET /quotes serves.
// *mock.Store satisfies it.
type QuoteSource interface {
	Watchlist() []string
	Quote(symbol string) (mock.Quote, bool)
}

// Request is what the model path needs from the HTTP request. ContextTicker is "" when the caller
// sent no FDC3 context.
type Request struct {
	Prompt        string
	ContextTicker string
}

// Response is the WorkspacePlanResponse of openapi.yaml (SPEC §7.5). Model is set only for source
// "model" and FallbackReason only for source "fallback".
type Response struct {
	Plan           Plan   `json:"plan"`
	Source         string `json:"source"`
	Model          string `json:"model,omitempty"`
	LatencyMs      int64  `json:"latencyMs"`
	ToolCalls      int    `json:"toolCalls"`
	FallbackReason string `json:"fallbackReason,omitempty"`
}

// Agent plans workspaces. A nil Client means agent mode "fallback-only" (no API key).
type Agent struct {
	Client  ModelClient
	Model   string        // reported in Response.Model
	Timeout time.Duration // total budget, tool calls included (AGENT_TIMEOUT_MS)
	Quotes  QuoteSource
	Now     func() time.Time // clock for latencyMs; nil means time.Now
	Logf    func(format string, args ...any)
}

func (a *Agent) now() time.Time {
	if a.Now != nil {
		return a.Now()
	}
	return time.Now()
}

func (a *Agent) logf(format string, args ...any) {
	if a.Logf != nil {
		a.Logf(format, args...)
	}
}

// SelectModule always returns a valid plan: the model's if it passes validation within the budget,
// otherwise the deterministic fallback with the matching reason (FR7).
func (a *Agent) SelectModule(ctx context.Context, req Request) Response {
	start := a.now()
	fallback := func(reason string, calls int) Response {
		return Response{
			Plan:           Fallback(req.Prompt, req.ContextTicker),
			Source:         "fallback",
			LatencyMs:      a.now().Sub(start).Milliseconds(),
			ToolCalls:      calls,
			FallbackReason: reason,
		}
	}
	if a.Client == nil {
		return fallback("no_api_key", 0)
	}

	ctx, cancel := context.WithTimeout(ctx, a.Timeout)
	defer cancel()
	system := systemPrompt()
	msgs := []Message{{Role: "user", Text: userMessage(req, a.Quotes.Watchlist())}}
	calls := 0
	for {
		reply, err := a.Client.Next(ctx, system, msgs)
		if err == nil {
			// A reply that arrives after the deadline still counts as a timeout: the budget covers the loop.
			err = ctx.Err()
		}
		if err != nil {
			if errors.Is(err, context.DeadlineExceeded) {
				return fallback("timeout", calls)
			}
			a.logf("agent: model error: %v", err)
			return fallback("model_error", calls)
		}
		if reply.Refused {
			return fallback("refusal", calls)
		}
		if reply.ToolUseID == "" {
			plan, err := parsePlan(reply.Text)
			if err != nil {
				a.logf("agent: invalid output: %v", err)
				return fallback("invalid_output", calls)
			}
			return Response{Plan: plan, Source: "model", Model: a.Model, LatencyMs: a.now().Sub(start).Milliseconds(), ToolCalls: calls}
		}
		if calls == maxToolCalls {
			return fallback("tool_limit", calls)
		}
		calls++
		msgs = append(msgs,
			Message{Role: "assistant", ToolUseID: reply.ToolUseID, Text: reply.Text},
			Message{Role: "user", ToolUseID: reply.ToolUseID, Text: a.watchlistQuotes()})
	}
}

// watchlistQuotes is the get_watchlist_quotes result: the JSON array GET /quotes returns (SPEC §7.2).
func (a *Agent) watchlistQuotes() string {
	quotes := []mock.Quote{}
	for _, symbol := range a.Quotes.Watchlist() {
		if q, ok := a.Quotes.Quote(symbol); ok {
			quotes = append(quotes, q)
		}
	}
	b, _ := json.Marshal(quotes) // plain structs of strings and numbers cannot fail to marshal
	return string(b)
}

// compileSchema compiles the WorkspacePlan schema from data, registered under name.
func compileSchema(name string, data []byte) (*jsonschema.Schema, error) {
	doc, err := jsonschema.UnmarshalJSON(strings.NewReader(string(data)))
	if err != nil {
		return nil, err
	}
	c := jsonschema.NewCompiler()
	if err := c.AddResource(name, doc); err != nil {
		return nil, err
	}
	return c.Compile(name)
}

// planSchema compiles once. The embedded file is fixed at build time, so a failure is a programmer
// error and stops the process rather than letting every request fall back silently.
var planSchema = sync.OnceValue(func() *jsonschema.Schema { return mustCompile(schemaJSON) })

func mustCompile(data []byte) *jsonschema.Schema {
	s, err := compileSchema("agent-tool-schema.json", data)
	if err != nil {
		panic("agent-tool-schema.json does not compile: " + err.Error())
	}
	return s
}

// parsePlan turns the model's final text into a validated plan: valid JSON, matches the schema
// (FR6), then passes the semantic checks S1–S8 (FR20). The returned plan has its rationale truncated.
func parsePlan(text string) (Plan, error) {
	inst, err := jsonschema.UnmarshalJSON(strings.NewReader(text))
	if err != nil {
		return Plan{}, err
	}
	if err := planSchema().Validate(inst); err != nil {
		return Plan{}, err
	}
	// Schema validation guarantees the shape Plan needs (object payloads, string rationale), so
	// decoding cannot fail here.
	var p Plan
	_ = json.Unmarshal([]byte(text), &p)
	return Validate(p)
}
