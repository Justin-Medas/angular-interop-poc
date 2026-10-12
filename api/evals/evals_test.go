// Tests for the eval runner (FR9, specs/testing.md §7): grading, loading, the three modes, exit codes,
// recording and the report. Everything runs offline; the live path gets a fake model client.
package main

import (
	"bytes"
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Justin-Medas/angular-interop-poc/api/internal/agent"
)

const casesPath = "../../specs/evals/cases.yaml"

func resp(source string, tools int, action *agent.Action, mods ...agent.Module) agent.Response {
	return agent.Response{Source: source, ToolCalls: tools, Plan: agent.Plan{Modules: mods, FDC3Action: action}}
}

func mod(name string, payload map[string]any) agent.Module { return agent.Module{Module: name, Payload: payload} }

func TestGrade_FR9(t *testing.T) {
	tsla := &agent.Action{Type: "broadcastInstrument", Ticker: "TSLA"}
	yes, no := true, false
	tests := []struct {
		name string
		exp  Expect
		got  agent.Response
		ok   bool
	}{
		{"primary module and payload match", Expect{Module: "price-chart", Payload: map[string]any{"symbol": "NVDA", "range": "5D"}},
			resp("model", 0, nil, mod("price-chart", map[string]any{"symbol": "NVDA", "range": "5D", "extra": 1})), true},
		{"primary module differs", Expect{Module: "blotter"}, resp("model", 0, nil, mod("compare", nil)), false},
		{"payload value differs", Expect{Module: "price-chart", Payload: map[string]any{"range": "1M"}},
			resp("model", 0, nil, mod("price-chart", map[string]any{"range": "5D"})), false},
		{"payload key missing", Expect{Module: "price-chart", Payload: map[string]any{"range": "1M"}},
			resp("model", 0, nil, mod("price-chart", nil)), false},
		{"number compares across int and float", Expect{Module: "watchlist-movers", Payload: map[string]any{"limit": 3}},
			resp("model", 0, nil, mod("watchlist-movers", map[string]any{"limit": float64(3)})), true},
		{"ticker arrays compare as sets", Expect{Module: "compare", Payload: map[string]any{"symbols": []any{"JPM", "GS"}}},
			resp("model", 0, nil, mod("compare", map[string]any{"symbols": []any{"GS", "JPM"}})), true},
		{"ticker arrays differ", Expect{Module: "compare", Payload: map[string]any{"symbols": []any{"JPM", "GS"}}},
			resp("model", 0, nil, mod("compare", map[string]any{"symbols": []any{"GS", "AAPL"}})), false},
		{"array against scalar", Expect{Module: "compare", Payload: map[string]any{"symbols": []any{"JPM"}}},
			resp("model", 0, nil, mod("compare", map[string]any{"symbols": "JPM"})), false},
		{"no modules at all", Expect{Module: "blotter"}, resp("model", 0, nil), false},
		{"modules ignore order", Expect{Modules: []Entry{{Module: "price-chart"}, {Module: "instrument-detail", Payload: map[string]any{"symbol": "AAPL"}}}},
			resp("model", 0, nil, mod("instrument-detail", map[string]any{"symbol": "AAPL"}), mod("price-chart", nil)), true},
		{"modules wrong count", Expect{Modules: []Entry{{Module: "none"}}}, resp("model", 0, nil, mod("none", nil), mod("none", nil)), false},
		{"modules entry unmatched", Expect{Modules: []Entry{{Module: "none"}}}, resp("model", 0, nil, mod("blotter", nil)), false},
		{"modules entry not reused", Expect{Modules: []Entry{{Module: "none"}, {Module: "none"}}}, resp("model", 0, nil, mod("none", nil), mod("blotter", nil)), false},
		{"modulesInclude allows extras", Expect{ModulesInclude: []Entry{{Module: "blotter"}}}, resp("model", 0, nil, mod("none", nil), mod("blotter", nil)), true},
		{"modulesInclude missing", Expect{ModulesInclude: []Entry{{Module: "compare"}}}, resp("model", 0, nil, mod("blotter", nil)), false},
		{"unsolicited action fails (R6)", Expect{Module: "blotter"}, resp("model", 0, tsla, mod("blotter", nil)), false},
		{"expected action matches", Expect{Module: "blotter", FDC3Action: &ActionExpect{Type: "broadcastInstrument", Ticker: "TSLA"}},
			resp("model", 0, tsla, mod("blotter", nil)), true},
		{"expected action missing", Expect{Module: "blotter", FDC3Action: &ActionExpect{Type: "broadcastInstrument", Ticker: "TSLA"}},
			resp("model", 0, nil, mod("blotter", nil)), false},
		{"expected action differs", Expect{Module: "blotter", FDC3Action: &ActionExpect{Type: "broadcastInstrument", Ticker: "AAPL"}},
			resp("model", 0, tsla, mod("blotter", nil)), false},
		{"toolUsed true satisfied", Expect{Module: "blotter", ToolUsed: &yes}, resp("model", 2, nil, mod("blotter", nil)), true},
		{"toolUsed true violated", Expect{Module: "blotter", ToolUsed: &yes}, resp("model", 0, nil, mod("blotter", nil)), false},
		{"toolUsed false violated", Expect{Module: "blotter", ToolUsed: &no}, resp("model", 1, nil, mod("blotter", nil)), false},
		{"toolUsed false satisfied", Expect{Module: "blotter", ToolUsed: &no}, resp("model", 0, nil, mod("blotter", nil)), true},
		{"source defaults to model", Expect{Module: "blotter"}, resp("fallback", 0, nil, mod("blotter", nil)), false},
		{"fallback source expected", Expect{Module: "blotter", Source: "fallback"}, resp("fallback", 0, nil, mod("blotter", nil)), true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Grade(tt.exp, tt.got); (len(got) == 0) != tt.ok {
				t.Errorf("failures = %v, want pass=%v", got, tt.ok)
			}
		})
	}
}

func TestLoadCases_FR9(t *testing.T) {
	f, err := LoadCases(casesPath)
	if err != nil {
		t.Fatal(err)
	}
	if f.Threshold != 0.9 || f.RunsPerCase != 3 || len(f.Cases) < 26 {
		t.Errorf("threshold %v runs %d cases %d", f.Threshold, f.RunsPerCase, len(f.Cases))
	}
	if _, err := LoadCases("nope.yaml"); err == nil {
		t.Error("missing file should fail")
	}
	bad := filepath.Join(t.TempDir(), "bad.yaml")
	_ = os.WriteFile(bad, []byte("cases: [unclosed"), 0o600)
	if _, err := LoadCases(bad); err == nil {
		t.Error("bad yaml should fail")
	}
}

const miniCases = `
threshold: 0.9
runs_per_case: 2
watchlist: [AAPL, MSFT, NVDA, TSLA, JPM, GS]
cases:
  - id: blotter-all
    prompt: "Open my watchlist"
    expect: { module: blotter }
  - id: fallback-chart
    prompt: "chart AAPL"
    mode: fallback
    expect: { modules: [{ module: price-chart, payload: { symbol: AAPL, range: "1D" } }], source: fallback }
`

const blotterPlan = `{"modules":[{"module":"blotter","payload":{}}],"fdc3Action":null,"rationale":"Opening the watchlist."}`

func writeFile(t *testing.T, dir, name, body string) string {
	t.Helper()
	p := filepath.Join(dir, name)
	if err := os.WriteFile(p, []byte(body), 0o600); err != nil {
		t.Fatal(err)
	}
	return p
}

// fixedClient answers every request with one final answer.
type fixedClient struct{ text string }

func (f fixedClient) Next(context.Context, string, []agent.Message) (agent.Reply, error) {
	return agent.Reply{Text: f.text}, nil
}

func stubLive(t *testing.T, text string) {
	t.Helper()
	old := newLive
	newLive = func(string, string) agent.ModelClient { return fixedClient{text} }
	t.Cleanup(func() { newLive = old })
}

func exec(args ...string) (int, string, string) {
	var out, errb bytes.Buffer
	env := map[string]string{"ANTHROPIC_API_KEY": "k"}
	code := run(args, func(k string) string { return env[k] }, &out, &errb)
	return code, out.String(), errb.String()
}

func TestRun_FR9_FallbackModeOnRealCases(t *testing.T) {
	code, out, errs := exec("-cases", casesPath, "-mode", "fallback")
	if code != 0 {
		t.Fatalf("exit %d\n%s%s", code, out, errs)
	}
	for _, want := range []string{"fallback-chart", "fallback pass rate: 100.0%", "model pass rate: n/a"} {
		if !strings.Contains(out, want) {
			t.Errorf("output lacks %q:\n%s", want, out)
		}
	}
	if strings.Contains(out, "detail-explicit") {
		t.Error("fallback mode must not run model cases")
	}
}

func TestRun_FR9_LiveRecordReplayAndReport(t *testing.T) {
	dir := t.TempDir()
	cases := writeFile(t, dir, "cases.yaml", miniCases)
	rec := filepath.Join(dir, "rec.json")
	report := filepath.Join(dir, "report.md")
	stubLive(t, blotterPlan)

	code, out, errs := exec("-cases", cases, "-mode", "live", "-record", "-recordings", rec, "-report", report)
	if code != 0 {
		t.Fatalf("live exit %d\n%s%s", code, out, errs)
	}
	for _, want := range []string{"model pass rate: 100.0% (2/2)", "fallback pass rate: 100.0% (2/2)"} {
		if !strings.Contains(out, want) {
			t.Errorf("live output lacks %q:\n%s", want, out)
		}
	}

	// Replay needs no key and no client: the recording alone reproduces the verdict.
	code, out, _ = exec("-cases", cases, "-mode", "replay", "-recordings", rec, "-report", report)
	if code != 0 {
		t.Fatalf("replay exit %d\n%s", code, out)
	}
	md, _ := os.ReadFile(report)
	for _, want := range []string{"# Eval report", "replay", "claude-sonnet-5-5", "blotter-all", "| fallback-chart |"} {
		if !strings.Contains(string(md), want) {
			t.Errorf("report lacks %q:\n%s", want, md)
		}
	}
}

func TestRun_FR9_ReplayBelowThresholdExitsNonZero(t *testing.T) {
	dir := t.TempDir()
	cases := writeFile(t, dir, "cases.yaml", miniCases)
	rec := filepath.Join(dir, "rec.json")
	stubLive(t, `{"modules":[{"module":"none","payload":{"reason":"nope"}}],"fdc3Action":null,"rationale":"x"}`)
	if code, out, errs := exec("-cases", cases, "-mode", "live", "-record", "-recordings", rec); code != 1 {
		t.Fatalf("wrong model answers should exit 1, got %d\n%s%s", code, out, errs)
	}
	code, out, _ := exec("-cases", cases, "-mode", "replay", "-recordings", rec)
	if code != 1 || !strings.Contains(out, "model pass rate: 0.0%") || !strings.Contains(out, "module") {
		t.Errorf("exit %d\n%s", code, out)
	}
}

func TestRun_FR9_FallbackFailureExitsNonZero(t *testing.T) {
	dir := t.TempDir()
	cases := writeFile(t, dir, "cases.yaml", strings.Replace(miniCases, "range: \"1D\"", "range: \"1M\"", 1))
	if code, _, _ := exec("-cases", cases, "-mode", "fallback"); code != 1 {
		t.Errorf("a failing fallback case must exit 1, got %d", code)
	}
}

func TestRun_FR9_ReplayWithoutRecordingFailsTheCase(t *testing.T) {
	dir := t.TempDir()
	cases := writeFile(t, dir, "cases.yaml", miniCases)
	rec := writeFile(t, dir, "rec.json", `{"model":"claude-sonnet-5-5","cases":{}}`)
	code, out, _ := exec("-cases", cases, "-mode", "replay", "-recordings", rec)
	if code != 1 || !strings.Contains(out, "model_error") {
		t.Errorf("exit %d\n%s", code, out)
	}
}

func TestRun_FR9_ToolLoopIsReplayed(t *testing.T) {
	dir := t.TempDir()
	cases := writeFile(t, dir, "cases.yaml", `
threshold: 0.9
runs_per_case: 1
cases:
  - id: data-worst
    prompt: "Open my worst performer today"
    expect: { module: instrument-detail, payload: { symbol: TSLA }, toolUsed: true }
`)
	rec := writeFile(t, dir, "rec.json", `{"model":"claude-sonnet-5-5","cases":{"data-worst":[[
	  {"toolUseId":"t1"},
	  {"text":"{\"modules\":[{\"module\":\"instrument-detail\",\"payload\":{\"symbol\":\"TSLA\"}}],\"fdc3Action\":null,\"rationale\":\"Worst today.\"}"}]]}}`)
	if code, out, _ := exec("-cases", cases, "-mode", "replay", "-recordings", rec); code != 0 {
		t.Errorf("exit %d\n%s", code, out)
	}
}

func TestRun_FR9_UsageErrors(t *testing.T) {
	dir := t.TempDir()
	cases := writeFile(t, dir, "cases.yaml", miniCases)
	badRec := writeFile(t, dir, "bad.json", "{")
	tests := []struct {
		name string
		args []string
		env  map[string]string
		want string
	}{
		{"unknown flag", []string{"-nope"}, nil, ""},
		{"unknown mode", []string{"-cases", cases, "-mode", "x"}, nil, "mode"},
		{"missing cases", []string{"-cases", "nope.yaml"}, nil, "nope.yaml"},
		{"live without key", []string{"-cases", cases, "-mode", "live"}, map[string]string{}, "ANTHROPIC_API_KEY"},
		{"bad env", []string{"-cases", cases, "-mode", "fallback"}, map[string]string{"AGENT_MODEL": "gpt"}, "AGENT_MODEL"},
		{"missing recordings", []string{"-cases", cases, "-mode", "replay", "-recordings", filepath.Join(dir, "none.json")}, nil, "none.json"},
		{"bad recordings", []string{"-cases", cases, "-mode", "replay", "-recordings", badRec}, nil, "bad.json"},
		{"unwritable report", []string{"-cases", cases, "-mode", "fallback", "-report", filepath.Join(dir, "no", "r.md")}, nil, "r.md"},
		{"unwritable recordings", []string{"-cases", cases, "-mode", "live", "-record", "-recordings", filepath.Join(dir, "no", "r.json")}, nil, "r.json"},
	}
	stubLive(t, blotterPlan)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var out, errb bytes.Buffer
			env := tt.env
			if env == nil {
				env = map[string]string{}
			}
			if _, ok := env["ANTHROPIC_API_KEY"]; !ok && tt.name != "live without key" {
				env["ANTHROPIC_API_KEY"] = "k"
			}
			if code := run(tt.args, func(k string) string { return env[k] }, &out, &errb); code != 2 {
				t.Errorf("exit %d, want 2\n%s%s", code, out.String(), errb.String())
			}
			if !strings.Contains(errb.String(), tt.want) {
				t.Errorf("stderr %q lacks %q", errb.String(), tt.want)
			}
		})
	}
}

func TestMain_FR9_ExitsWithRunsCode(t *testing.T) {
	var got int
	oldExit, oldArgs := exit, os.Args
	exit = func(c int) { got = c }
	os.Args = []string{"evals", "-cases", casesPath, "-mode", "fallback"}
	t.Cleanup(func() { exit, os.Args = oldExit, oldArgs })
	main()
	if got != 0 {
		t.Errorf("exit code %d", got)
	}
}

func TestNewLive_FR9_BuildsTheAnthropicClient(t *testing.T) {
	if newLive("k", "claude-sonnet-5-5") == nil {
		t.Error("newLive returned nil")
	}
}

func TestReplayClient_FR9_RunsOutOfTurns(t *testing.T) {
	c := &replayClient{turns: []Turn{{Text: "a"}}}
	if _, err := c.Next(context.Background(), "", nil); err != nil {
		t.Fatal(err)
	}
	if _, err := c.Next(context.Background(), "", nil); err == nil {
		t.Error("second call should fail")
	}
}

func TestRecorder_FR9_KeepsErrorsOutOfTheRecording(t *testing.T) {
	rec := NewRecording("m")
	c := rec.Wrap("c", 0, errClient{})
	if _, err := c.Next(context.Background(), "", nil); err == nil {
		t.Fatal("want error")
	}
	if len(rec.Cases["c"][0]) != 0 {
		t.Errorf("error turn recorded: %v", rec.Cases["c"])
	}
}

type errClient struct{}

func (errClient) Next(context.Context, string, []agent.Message) (agent.Reply, error) {
	return agent.Reply{}, errors.New("boom")
}
