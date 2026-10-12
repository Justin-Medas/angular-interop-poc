// Runs the eval cases through internal/agent in-process and summarises the results (FR9, testing.md §7).
// Kept free of flags and I/O so main.go stays wiring and this stays testable.

package main

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/Justin-Medas/angular-interop-poc/api/internal/agent"
)

// Result is one run of one case.
type Result struct {
	Case     Case
	Run      int
	Failures []string
	Latency  int64
}

// Pass reports whether every check passed.
func (r Result) Pass() bool { return len(r.Failures) == 0 }

// Fallback reports whether the case is graded without a model.
func (c Case) Fallback() bool { return c.Mode == "fallback" }

// Runner executes cases. ClientFor returns the model client for a run of a model-mode case; fallback-mode
// cases never get one, so the agent takes its deterministic path (SPEC §7.4).
type Runner struct {
	File         File
	Quotes       agent.QuoteSource
	Model        string
	Timeout      time.Duration
	OnlyFallback bool
	ClientFor    func(caseID string, run int) agent.ModelClient
}

// Execute runs every selected case runs_per_case times, sequentially. Sequential keeps recordings
// ordered and avoids rate-limit noise in a 66-request live run.
func (r Runner) Execute(ctx context.Context) []Result {
	var out []Result
	for _, c := range r.File.Cases {
		if r.OnlyFallback && !c.Fallback() {
			continue
		}
		for run := 0; run < r.File.RunsPerCase; run++ {
			a := &agent.Agent{Model: r.Model, Timeout: r.Timeout, Quotes: r.Quotes}
			if !c.Fallback() {
				a.Client = r.ClientFor(c.ID, run)
			}
			resp := a.SelectModule(ctx, agent.Request{Prompt: c.Prompt, ContextTicker: c.ContextTicker()})
			out = append(out, Result{c, run, Grade(c.Expect, resp), resp.LatencyMs})
		}
	}
	return out
}

// Summary holds the two pass rates, which are kept apart so deterministic cases cannot inflate the model rate.
type Summary struct {
	ModelRuns, ModelPass       int
	FallbackRuns, FallbackPass int
	P95Latency                 int64
}

// Summarize counts results per kind and computes the p95 model latency (NFR-P1).
func Summarize(results []Result) Summary {
	var s Summary
	var lat []int64
	for _, r := range results {
		if r.Case.Fallback() {
			s.FallbackRuns++
			if r.Pass() {
				s.FallbackPass++
			}
			continue
		}
		s.ModelRuns++
		if r.Pass() {
			s.ModelPass++
		}
		lat = append(lat, r.Latency)
	}
	if len(lat) > 0 {
		sort.Slice(lat, func(i, j int) bool { return lat[i] < lat[j] })
		s.P95Latency = lat[(len(lat)*95+99)/100-1]
	}
	return s
}

// Ok applies the FR9 exit rule: the model rate meets the threshold (when model cases ran) and every fallback run passed.
func (s Summary) Ok(threshold float64) bool {
	if s.ModelRuns > 0 && float64(s.ModelPass)/float64(s.ModelRuns) < threshold {
		return false
	}
	return s.FallbackPass == s.FallbackRuns
}

func rate(pass, runs int) string {
	if runs == 0 {
		return "n/a"
	}
	return fmt.Sprintf("%.1f%% (%d/%d)", 100*float64(pass)/float64(runs), pass, runs)
}

// caseLine is one per-case row: passes over runs plus the distinct failure notes.
type caseLine struct {
	id, kind, passes, notes string
}

func lines(results []Result) []caseLine {
	var out []caseLine
	idx := map[string]int{}
	pass, runs := map[string]int{}, map[string]int{}
	notes := map[string][]string{}
	for _, r := range results {
		id := r.Case.ID
		if _, ok := idx[id]; !ok {
			kind := "model"
			if r.Case.Fallback() {
				kind = "fallback"
			}
			idx[id] = len(out)
			out = append(out, caseLine{id: id, kind: kind})
		}
		runs[id]++
		if r.Pass() {
			pass[id]++
		}
		for _, f := range r.Failures {
			if !strings.Contains(strings.Join(notes[id], "\n"), f) {
				notes[id] = append(notes[id], f)
			}
		}
	}
	for i := range out {
		id := out[i].id
		out[i].passes = fmt.Sprintf("%d/%d", pass[id], runs[id])
		out[i].notes = strings.Join(notes[id], "; ")
	}
	return out
}

// Text is the terminal output: a per-case table, then the separate pass rates (FR9).
func Text(results []Result, s Summary, mode string) string {
	var b strings.Builder
	for _, l := range lines(results) {
		fmt.Fprintf(&b, "%-26s %-9s %-5s %s\n", l.id, l.kind, l.passes, l.notes)
	}
	fmt.Fprintf(&b, "\nmodel pass rate: %s\nfallback pass rate: %s\n", rate(s.ModelPass, s.ModelRuns), rate(s.FallbackPass, s.FallbackRuns))
	if mode == "live" && s.ModelRuns > 0 {
		fmt.Fprintf(&b, "model p95 latency: %d ms\n", s.P95Latency)
	}
	return b.String()
}

// Markdown is the committed/uploaded report. It names the mode and the model it came from (testing.md §7).
func Markdown(results []Result, s Summary, mode, model string, threshold float64) string {
	var b strings.Builder
	fmt.Fprintf(&b, "# Eval report\n\n- Mode: %s\n- Model: %s\n- Model pass rate: %s (threshold %.0f%%)\n- Fallback pass rate: %s (required 100%%)\n",
		mode, model, rate(s.ModelPass, s.ModelRuns), 100*threshold, rate(s.FallbackPass, s.FallbackRuns))
	if mode == "live" && s.ModelRuns > 0 {
		fmt.Fprintf(&b, "- Model p95 latency: %d ms\n", s.P95Latency)
	}
	b.WriteString("\n| Case | Kind | Passed | Notes |\n|---|---|---|---|\n")
	for _, l := range lines(results) {
		fmt.Fprintf(&b, "| %s | %s | %s | %s |\n", l.id, l.kind, l.passes, strings.ReplaceAll(l.notes, "|", "\\|"))
	}
	return b.String()
}
