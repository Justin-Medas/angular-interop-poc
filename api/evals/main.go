// Command evals runs the agent eval suite in specs/evals/cases.yaml in fallback, replay or live mode
// and exits non-zero when the pass-rate rules fail (FR9, SPEC G5, specs/testing.md §7).
// Usage, from api/: go run ./evals -mode replay
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/Justin-Medas/angular-interop-poc/api/internal/agent"
	"github.com/Justin-Medas/angular-interop-poc/api/internal/config"
	"github.com/Justin-Medas/angular-interop-poc/api/internal/mock"
)

// exit and newLive are variables so tests can observe the exit code and avoid the network.
var (
	exit    = os.Exit
	newLive = func(key, model string) agent.ModelClient { return agent.NewAnthropicClient(key, model) }
)

func main() { exit(run(os.Args[1:], os.Getenv, os.Stdout, os.Stderr)) }

// run returns 0 when the suite passes, 1 when it fails its rules, and 2 for usage or I/O errors.
func run(args []string, getenv func(string) string, stdout, stderr io.Writer) int {
	fs := flag.NewFlagSet("evals", flag.ContinueOnError)
	fs.SetOutput(stderr)
	cases := fs.String("cases", "../specs/evals/cases.yaml", "eval cases file")
	mode := fs.String("mode", "fallback", "fallback | replay | live")
	recPath := fs.String("recordings", "evals/recordings/recordings.json", "recorded model conversations")
	record := fs.Bool("record", false, "live mode: save the model turns to -recordings")
	report := fs.String("report", "", "write a markdown report to this path")
	if err := fs.Parse(args); err != nil {
		return 2
	}
	fail := func(err error) int { fmt.Fprintln(stderr, "evals:", err); return 2 }

	if *mode != "fallback" && *mode != "replay" && *mode != "live" {
		return fail(fmt.Errorf("unknown mode %q (want fallback, replay or live)", *mode))
	}
	file, err := LoadCases(*cases)
	if err != nil {
		return fail(err)
	}
	// The same defaults the server uses, so evals see the SPEC §6.3 mock universe (testing.md: tests run with defaults).
	cfg, err := config.Load(getenv)
	if err != nil {
		return fail(err)
	}
	r := Runner{File: file, Quotes: mock.NewStore(cfg.MockSeed, cfg.MockNow), Model: cfg.AgentModel, Timeout: cfg.AgentTimeout, OnlyFallback: *mode == "fallback"}
	model := "n/a (no model used)"

	var rec *Recording
	switch *mode {
	case "replay":
		b, err := os.ReadFile(*recPath)
		if err != nil {
			return fail(err)
		}
		rec = &Recording{}
		if err := json.Unmarshal(b, rec); err != nil {
			return fail(fmt.Errorf("%s: %w", *recPath, err))
		}
		model, r.Model = rec.Model, rec.Model
		r.ClientFor = rec.Replay
	case "live":
		if cfg.AnthropicAPIKey == "" {
			return fail(fmt.Errorf("live mode needs ANTHROPIC_API_KEY"))
		}
		model = cfg.AgentModel
		live := newLive(cfg.AnthropicAPIKey, cfg.AgentModel)
		r.ClientFor = func(string, int) agent.ModelClient { return live }
		if *record {
			rec = NewRecording(model)
			rec.RecordedAt = time.Now().UTC().Format(time.RFC3339)
			r.ClientFor = func(id string, run int) agent.ModelClient { return rec.Wrap(id, run, live) }
		}
	}

	results := r.Execute(context.Background())
	sum := Summarize(results)
	fmt.Fprint(stdout, Text(results, sum, *mode))

	if *record {
		b, _ := json.MarshalIndent(rec, "", "  ") // plain structs of strings cannot fail to marshal
		if err := os.WriteFile(*recPath, append(b, '\n'), 0o644); err != nil {
			return fail(err)
		}
	}
	if *report != "" {
		if err := os.WriteFile(*report, []byte(Markdown(results, sum, *mode, model, file.Threshold)), 0o644); err != nil {
			return fail(err)
		}
	}
	if !sum.Ok(file.Threshold) {
		return 1
	}
	return 0
}
