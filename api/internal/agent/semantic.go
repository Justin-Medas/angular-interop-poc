// Semantic validation of a WorkspacePlan: the rules JSON Schema structured outputs cannot express
// (lengths, ranges, ticker membership). Implements SPEC §7.3 S1–S8 (FR20); a failure becomes
// fallbackReason "invalid_output" (FR7).

package agent

import (
	"fmt"
	"math"
	"reflect"
	"strings"

	"github.com/Justin-Medas/angular-interop-poc/api/internal/mock"
)

// RuleError reports the first semantic rule a plan broke. Its text names the rule so the server log
// says which one failed (SPEC §7.3).
type RuleError struct {
	Rule   string
	Detail string
}

// Error implements error.
func (e *RuleError) Error() string { return fmt.Sprintf("semantic rule %s: %s", e.Rule, e.Detail) }

func fail(rule, format string, args ...any) error {
	return &RuleError{Rule: rule, Detail: fmt.Sprintf(format, args...)}
}

// inUniverse reports whether symbol is an exact (upper-case) mock-universe ticker (S4).
func inUniverse(symbol string) bool {
	for _, in := range mock.Universe() {
		if in.Symbol == symbol {
			return true
		}
	}
	return false
}

// tickers lists every ticker a module's payload names. It accepts both []string (built by the
// fallback) and []any (decoded from model JSON), so one check serves both producers.
func tickers(m Module) []string {
	var out []string
	switch m.Module {
	case "instrument-detail", "price-chart":
		if s, ok := m.Payload["symbol"].(string); ok {
			out = append(out, s)
		}
	case "blotter", "compare":
		out = append(out, stringList(m.Payload["symbols"])...)
	}
	return out
}

// stringList converts []string or []any of strings; anything else (including nil) is empty.
func stringList(v any) []string {
	switch l := v.(type) {
	case []string:
		return l
	case []any:
		out := make([]string, 0, len(l))
		for _, e := range l {
			s, _ := e.(string)
			out = append(out, s)
		}
		return out
	}
	return nil
}

// limitOf reads a movers limit from an int (fallback) or float64 (decoded JSON); ok is false for
// non-integers so 2.5 fails S6 instead of being rounded.
func limitOf(v any) (int, bool) {
	switch n := v.(type) {
	case int:
		return n, true
	case float64:
		return int(n), n == math.Trunc(n)
	}
	return 0, false
}

// Validate runs S1–S8 in order and returns the plan with its rationale truncated (S8), or the first
// rule broken as a *RuleError. Order matters only for which rule is reported.
func Validate(p Plan) (Plan, error) {
	if n := len(p.Modules); n < 1 || n > 3 { // S1
		return p, fail("S1", "plan has %d modules, want 1-3", n)
	}
	for _, m := range p.Modules { // S2
		if m.Module == "none" && len(p.Modules) > 1 {
			return p, fail("S2", "none must be the only module")
		}
	}
	blotters := 0
	for i, m := range p.Modules { // S3
		if m.Module == "blotter" {
			if blotters++; blotters > 1 {
				return p, fail("S3", "blotter appears more than once")
			}
		}
		for _, other := range p.Modules[i+1:] {
			if m.Module == other.Module && reflect.DeepEqual(m.Payload, other.Payload) {
				return p, fail("S3", "duplicate %s module", m.Module)
			}
		}
	}
	named := map[string]bool{}
	for _, m := range p.Modules { // S4
		for _, t := range tickers(m) {
			if !inUniverse(t) {
				return p, fail("S4", "ticker %q is not in the mock universe", t)
			}
			named[t] = true
		}
	}
	if p.FDC3Action != nil && !inUniverse(p.FDC3Action.Ticker) {
		return p, fail("S4", "fdc3Action ticker %q is not in the mock universe", p.FDC3Action.Ticker)
	}
	for _, m := range p.Modules { // S5
		if m.Module != "compare" {
			continue
		}
		syms := tickers(m)
		distinct := map[string]bool{}
		for _, s := range syms {
			distinct[s] = true
		}
		if len(syms) < 2 || len(syms) > 4 || len(distinct) != len(syms) {
			return p, fail("S5", "compare needs 2-4 distinct tickers, got %v", syms)
		}
	}
	for _, m := range p.Modules { // S6
		if m.Module != "watchlist-movers" {
			continue
		}
		if n, ok := limitOf(m.Payload["limit"]); !ok || n < 1 || n > 10 {
			return p, fail("S6", "movers limit %v is not an integer in 1-10", m.Payload["limit"])
		}
	}
	if p.FDC3Action != nil && !named[p.FDC3Action.Ticker] { // S7
		return p, fail("S7", "fdc3Action ticker %q does not appear in any module", p.FDC3Action.Ticker)
	}
	if strings.TrimSpace(p.Rationale) == "" { // S8
		return p, fail("S8", "rationale is empty")
	}
	// Runes, not bytes: the UI shows characters, and a byte cut could split a multi-byte one.
	if r := []rune(p.Rationale); len(r) > maxRationale {
		p.Rationale = string(r[:maxRationale])
	}
	return p, nil
}
