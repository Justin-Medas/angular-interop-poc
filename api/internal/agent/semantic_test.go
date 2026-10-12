package agent

import (
	"errors"
	"strings"
	"testing"
)

// detail, chart and friends build modules so each table row reads as the plan it describes.
func detail(sym string) Module { return Module{"instrument-detail", map[string]any{"symbol": sym}} }
func chart(sym string) Module {
	return Module{"price-chart", map[string]any{"symbol": sym, "range": "1D"}}
}
func movers(limit any) Module {
	return Module{"watchlist-movers", map[string]any{"direction": "both", "limit": limit}}
}
func compare(syms ...any) Module { return Module{"compare", map[string]any{"symbols": syms}} }
func none() Module               { return Module{"none", map[string]any{"reason": "out of scope"}} }
func blotter(syms any) Module    { return Module{"blotter", map[string]any{"symbols": syms}} }
func plan(r string, a *Action, ms ...Module) Plan {
	return Plan{Modules: ms, FDC3Action: a, Rationale: r}
}

func TestValidate_FR20_Rules(t *testing.T) {
	act := func(t string) *Action { return &Action{Type: "broadcastInstrument", Ticker: t} }
	rows := []struct {
		name string
		plan Plan
		rule string // "" means valid
	}{
		{"valid single", plan("ok", nil, detail("AAPL")), ""},
		{"valid three", plan("ok", nil, detail("AAPL"), chart("AAPL"), movers(5)), ""},
		{"valid with action", plan("ok", act("AAPL"), detail("AAPL")), ""},
		{"valid none", plan("ok", nil, none()), ""},

		{"S1 zero modules", plan("ok", nil), "S1"},
		{"S1 four modules", plan("ok", nil, detail("AAPL"), detail("MSFT"), detail("NVDA"), detail("TSLA")), "S1"},
		{"S2 none with another", plan("ok", nil, none(), detail("AAPL")), "S2"},
		{"S3 identical modules", plan("ok", nil, detail("AAPL"), detail("AAPL")), "S3"},
		{"S3 blotter twice with different filters", plan("ok", nil, blotter(nil), blotter([]any{"AAPL"})), "S3"},
		{"S3 same module different payload is fine", plan("ok", nil, detail("AAPL"), detail("MSFT")), ""},
		{"S4 unknown detail ticker", plan("ok", nil, detail("FORD")), "S4"},
		{"S4 unknown chart ticker", plan("ok", nil, chart("F")), "S4"},
		{"S4 unknown compare ticker", plan("ok", nil, compare("AAPL", "FORD")), "S4"},
		{"S4 unknown blotter ticker", plan("ok", nil, blotter([]any{"FORD"})), "S4"},
		{"S4 unknown action ticker", plan("ok", act("FORD"), detail("AAPL")), "S4"},
		{"S4 lower-case ticker", plan("ok", nil, detail("aapl")), "S4"},
		{"S5 compare of one", plan("ok", nil, compare("AAPL")), "S5"},
		{"S5 compare of five", plan("ok", nil, compare("AAPL", "MSFT", "NVDA", "TSLA", "JPM")), "S5"},
		{"S5 compare duplicates", plan("ok", nil, compare("AAPL", "AAPL")), "S5"},
		{"S5 compare of four is fine", plan("ok", nil, compare("AAPL", "MSFT", "NVDA", "TSLA")), ""},
		{"S6 limit zero", plan("ok", nil, movers(float64(0))), "S6"},
		{"S6 limit eleven", plan("ok", nil, movers(float64(11))), "S6"},
		{"S6 limit fractional", plan("ok", nil, movers(2.5)), "S6"},
		{"S6 limit not a number", plan("ok", nil, movers("5")), "S6"},
		{"S6 limit ten JSON number", plan("ok", nil, movers(float64(10))), ""},
		{"S7 action ticker not in plan", plan("ok", act("MSFT"), detail("AAPL")), "S7"},
		{"S7 action ticker in compare", plan("ok", act("MSFT"), compare("AAPL", "MSFT")), ""},
		{"S8 empty rationale", plan("", nil, detail("AAPL")), "S8"},
		{"S8 blank rationale", plan("   ", nil, detail("AAPL")), "S8"},
	}
	for _, r := range rows {
		t.Run(r.name, func(t *testing.T) {
			_, err := Validate(r.plan)
			if r.rule == "" {
				if err != nil {
					t.Fatalf("want valid, got %v", err)
				}
				return
			}
			var re *RuleError
			if !errors.As(err, &re) || re.Rule != r.rule {
				t.Fatalf("want rule %s, got %v", r.rule, err)
			}
			if !strings.Contains(err.Error(), r.rule) {
				t.Errorf("error text should name the rule for the server log: %q", err)
			}
		})
	}
}

func TestValidate_FR20_S8_TruncatesNotFails(t *testing.T) {
	long := strings.Repeat("é", 200) // multi-byte on purpose: the limit is characters, not bytes
	out, err := Validate(plan(long, nil, detail("AAPL")))
	if err != nil {
		t.Fatalf("truncation is not a failure: %v", err)
	}
	if n := len([]rune(out.Rationale)); n != maxRationale {
		t.Errorf("rationale has %d characters, want %d", n, maxRationale)
	}
}
