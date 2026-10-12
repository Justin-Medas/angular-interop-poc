package agent

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/anthropics/anthropic-sdk-go/option"
)

// apiStub plays the Anthropic Messages API: it records each request body and answers with scripted bodies.
type apiStub struct {
	bodies  []map[string]any
	answers []string
	status  int
}

func (s *apiStub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	raw, _ := io.ReadAll(r.Body)
	var body map[string]any
	_ = json.Unmarshal(raw, &body)
	s.bodies = append(s.bodies, body)
	if s.status != 0 {
		http.Error(w, `{"type":"error","error":{"type":"api_error","message":"down"}}`, s.status)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_, _ = io.WriteString(w, s.answers[len(s.bodies)-1])
}

func message(stop string, blocks ...string) string {
	return `{"id":"msg_1","type":"message","role":"assistant","model":"claude-sonnet-5-5","stop_reason":"` + stop +
		`","content":[` + strings.Join(blocks, ",") + `],"usage":{"input_tokens":1,"output_tokens":1}}`
}

const (
	textBlock     = `{"type":"text","text":"{\"hello\":1}"}`
	thinkingBlock = `{"type":"thinking","thinking":"hmm","signature":"sig123"}`
	toolBlock     = `{"type":"tool_use","id":"toolu_1","name":"get_watchlist_quotes","input":{}}`
)

func stubClient(t *testing.T, s *apiStub) ModelClient {
	t.Helper()
	srv := httptest.NewServer(s)
	t.Cleanup(srv.Close)
	return NewAnthropicClient("test-key", "claude-opus-5-5", option.WithBaseURL(srv.URL))
}

func TestAnthropicClient_FR6_RequestShape(t *testing.T) {
	s := &apiStub{answers: []string{message("end_turn", textBlock)}}
	reply, err := stubClient(t, s).Next(context.Background(), "SYSTEM", []Message{{Role: "user", Text: "hi"}})
	if err != nil || reply.Text != `{"hello":1}` || reply.ToolUseID != "" || reply.Refused {
		t.Fatalf("reply %+v err %v", reply, err)
	}
	b := s.bodies[0]
	if b["model"] != "claude-opus-5-5" {
		t.Errorf("model %v", b["model"])
	}
	if _, has := b["thinking"]; has {
		t.Error("thinking must be omitted (SPEC §7.2)")
	}
	if tc := b["tool_choice"].(map[string]any); tc["type"] != "auto" {
		t.Errorf("tool_choice %v: forced tool_choice is a 400 (SPEC §7.2)", tc)
	}
	oc := b["output_config"].(map[string]any)
	format := oc["format"].(map[string]any)
	if oc["effort"] != "low" || format["type"] != "json_schema" || format["schema"].(map[string]any)["title"] != "WorkspacePlan" {
		t.Errorf("output_config %v", oc)
	}
	tools := b["tools"].([]any)
	tl := tools[0].(map[string]any)
	schema := tl["input_schema"].(map[string]any)
	if len(tools) != 1 || tl["name"] != "get_watchlist_quotes" || tl["strict"] != true || schema["additionalProperties"] != false {
		t.Errorf("tools %v", tools)
	}
	sys := b["system"].([]any)[0].(map[string]any)
	if sys["text"] != "SYSTEM" || sys["cache_control"] == nil {
		t.Errorf("system %v", sys)
	}
	m := b["messages"].([]any)[0].(map[string]any)
	if m["role"] != "user" {
		t.Errorf("messages %v", b["messages"])
	}
}

func TestAnthropicClient_FR16_ToolUseThenEcho(t *testing.T) {
	s := &apiStub{answers: []string{message("tool_use", thinkingBlock, toolBlock), message("end_turn", textBlock)}}
	c := stubClient(t, s)
	first, err := c.Next(context.Background(), "S", []Message{{Role: "user", Text: "hi"}})
	if err != nil || first.ToolUseID != "toolu_1" || first.Raw == nil {
		t.Fatalf("first reply %+v err %v", first, err)
	}
	msgs := []Message{
		{Role: "user", Text: "hi"},
		{Role: "assistant", ToolUseID: first.ToolUseID, Raw: first.Raw},
		{Role: "user", ToolUseID: first.ToolUseID, Text: "[]"},
	}
	if _, err := c.Next(context.Background(), "S", msgs); err != nil {
		t.Fatal(err)
	}
	sent, _ := json.Marshal(s.bodies[1]["messages"])
	for _, want := range []string{`"signature":"sig123"`, `"type":"tool_use"`, `"tool_use_id":"toolu_1"`, `"text":"[]"`} {
		if !strings.Contains(string(sent), want) {
			t.Errorf("second request lacks %s: %s", want, sent)
		}
	}
}

func TestAnthropicClient_FR16_ToolTurnWithoutRawIsRebuilt(t *testing.T) {
	s := &apiStub{answers: []string{message("end_turn", textBlock)}}
	msgs := []Message{
		{Role: "user", Text: "hi"},
		{Role: "assistant", ToolUseID: "toolu_9"},
		{Role: "user", ToolUseID: "toolu_9", Text: "[]"},
	}
	if _, err := stubClient(t, s).Next(context.Background(), "S", msgs); err != nil {
		t.Fatal(err)
	}
	sent, _ := json.Marshal(s.bodies[0]["messages"])
	if !strings.Contains(string(sent), `"id":"toolu_9"`) || !strings.Contains(string(sent), `"name":"get_watchlist_quotes"`) {
		t.Errorf("sent %s", sent)
	}
}

func TestAnthropicClient_FR7_Refusal(t *testing.T) {
	s := &apiStub{answers: []string{message("refusal", `{"type":"text","text":"no"}`)}}
	reply, err := stubClient(t, s).Next(context.Background(), "S", []Message{{Role: "user", Text: "x"}})
	if err != nil || !reply.Refused {
		t.Errorf("reply %+v err %v", reply, err)
	}
}

func TestAnthropicClient_FR7_APIErrorIsReturnedWithoutRetries(t *testing.T) {
	s := &apiStub{status: 500}
	if _, err := stubClient(t, s).Next(context.Background(), "S", []Message{{Role: "user", Text: "x"}}); err == nil {
		t.Fatal("want an error")
	}
	if len(s.bodies) != 1 {
		t.Errorf("%d attempts: retries would spend the agent budget (FR7)", len(s.bodies))
	}
}
