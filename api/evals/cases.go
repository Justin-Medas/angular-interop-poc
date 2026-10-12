// Case loading and deterministic grading for the eval runner. It exists so one grader decides pass or
// fail for live, replay and fallback runs alike. Serves FR9 and the grading rules in the header of
// specs/evals/cases.yaml (no LLM judge, DECISIONS #4).

package main

import (
	"fmt"
	"os"
	"sort"

	"github.com/Justin-Medas/angular-interop-poc/api/internal/agent"
	"gopkg.in/yaml.v3"
)

// Entry is one expected module with the payload keys that must match; unlisted keys are ignored.
type Entry struct {
	Module  string         `yaml:"module"`
	Payload map[string]any `yaml:"payload"`
}

// ActionExpect is an expected fdc3Action. A case that omits it expects no action at all (SPEC §7.2 R6).
type ActionExpect struct {
	Type   string `yaml:"type"`
	Ticker string `yaml:"ticker"`
}

// Expect is the grading block of a case. Module/Payload describe the primary module (modules[0]).
type Expect struct {
	Module         string         `yaml:"module"`
	Payload        map[string]any `yaml:"payload"`
	Modules        []Entry        `yaml:"modules"`
	ModulesInclude []Entry        `yaml:"modulesInclude"`
	FDC3Action     *ActionExpect  `yaml:"fdc3Action"`
	ToolUsed       *bool          `yaml:"toolUsed"`
	Source         string         `yaml:"source"`
}

// Case is one eval scenario. Mode is "model" (default) or "fallback".
type Case struct {
	ID      string `yaml:"id"`
	Prompt  string `yaml:"prompt"`
	Mode    string `yaml:"mode"`
	Context *struct {
		ID struct {
			Ticker string `yaml:"ticker"`
		} `yaml:"id"`
	} `yaml:"context"`
	Expect Expect `yaml:"expect"`
}

// ContextTicker is the case's FDC3 instrument ticker, or "" when it has no context.
func (c Case) ContextTicker() string {
	if c.Context == nil {
		return ""
	}
	return c.Context.ID.Ticker
}

// File is the parsed specs/evals/cases.yaml.
type File struct {
	Threshold   float64  `yaml:"threshold"`
	RunsPerCase int      `yaml:"runs_per_case"`
	Watchlist   []string `yaml:"watchlist"`
	Cases       []Case   `yaml:"cases"`
}

// LoadCases reads and parses the cases file at path.
func LoadCases(path string) (File, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return File{}, err
	}
	var f File
	if err := yaml.Unmarshal(b, &f); err != nil {
		return File{}, fmt.Errorf("%s: %w", path, err)
	}
	return f, nil
}

// Grade returns why got fails exp, or nil when every check passes. A case passes only if all checks do.
func Grade(exp Expect, got agent.Response) []string {
	var fails []string
	wantSource := exp.Source
	if wantSource == "" {
		wantSource = "model"
	}
	if got.Source != wantSource {
		fails = append(fails, fmt.Sprintf("source: want %s, got %s (%s)", wantSource, got.Source, got.FallbackReason))
	}
	mods := got.Plan.Modules
	if exp.Module != "" {
		if len(mods) == 0 || !matches(Entry{exp.Module, exp.Payload}, mods[0]) {
			fails = append(fails, fmt.Sprintf("module: want %s %v as primary, got %s", exp.Module, exp.Payload, describe(mods)))
		}
	}
	if exp.Modules != nil && !sameModules(exp.Modules, mods) {
		fails = append(fails, fmt.Sprintf("modules: want exactly %v, got %s", exp.Modules, describe(mods)))
	}
	for _, e := range exp.ModulesInclude {
		if !contains(e, mods) {
			fails = append(fails, fmt.Sprintf("modulesInclude: %v missing from %s", e, describe(mods)))
		}
	}
	if !sameAction(exp.FDC3Action, got.Plan.FDC3Action) {
		fails = append(fails, fmt.Sprintf("fdc3Action: want %v, got %v", exp.FDC3Action, got.Plan.FDC3Action))
	}
	if exp.ToolUsed != nil && *exp.ToolUsed != (got.ToolCalls > 0) {
		fails = append(fails, fmt.Sprintf("toolUsed: want %v, got %d tool calls", *exp.ToolUsed, got.ToolCalls))
	}
	return fails
}

func describe(mods []agent.Module) string { return fmt.Sprintf("%v", mods) }

// sameAction compares the expected action with the plan's. Both nil is the default and the common case.
func sameAction(want *ActionExpect, got *agent.Action) bool {
	if want == nil || got == nil {
		return want == nil && got == nil
	}
	return want.Type == got.Type && want.Ticker == got.Ticker
}

// matches reports whether m is the expected module with every listed payload key equal.
func matches(e Entry, m agent.Module) bool {
	if e.Module != m.Module {
		return false
	}
	for k, want := range e.Payload {
		got, ok := m.Payload[k]
		if !ok || canon(want) != canon(got) {
			return false
		}
	}
	return true
}

// canon renders a payload value so YAML ints equal JSON floats and ticker arrays compare as sets.
func canon(v any) string {
	list, ok := v.([]any)
	if !ok {
		return fmt.Sprint(v)
	}
	parts := make([]string, len(list))
	for i, x := range list {
		parts[i] = fmt.Sprint(x)
	}
	sort.Strings(parts)
	return fmt.Sprint(parts)
}

func contains(e Entry, mods []agent.Module) bool {
	for _, m := range mods {
		if matches(e, m) {
			return true
		}
	}
	return false
}

// sameModules is an order-insensitive one-to-one match of expected entries against the plan's modules.
func sameModules(want []Entry, got []agent.Module) bool {
	if len(want) != len(got) {
		return false
	}
	used := make([]bool, len(got))
	for _, e := range want {
		found := false
		for i, m := range got {
			if !used[i] && matches(e, m) {
				used[i], found = true, true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}
