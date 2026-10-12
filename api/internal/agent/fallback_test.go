package agent

import (
	"reflect"
	"strings"
	"testing"
)

// fallbackRow is one table row: a prompt (and optional context ticker) and the single module expected.
type fallbackRow struct {
	name    string
	prompt  string
	ctx     string
	rule    string
	module  string
	payload map[string]any
}

func TestFallback_FR19_Rules(t *testing.T) {
	rows := []fallbackRow{
		// F1 wins over everything, including a chart request with a ticker.
		{"F1 buy", "Buy 100 shares of AAPL", "", "F1", "none", map[string]any{"reason": "Trading is out of scope for this demo."}},
		{"F1 beats F3", "chart AAPL and sell it", "", "F1", "none", map[string]any{"reason": "Trading is out of scope for this demo."}},
		{"F1 whole word only", "show the shorting history of AAPL", "", "F3", "price-chart", map[string]any{"symbol": "AAPL", "range": "1D"}},

		{"F2 vs", "AAPL vs MSFT", "", "F2", "compare", map[string]any{"symbols": []string{"AAPL", "MSFT"}}},
		{"F2 aliases in order of appearance", "compare nvidia with apple", "", "F2", "compare", map[string]any{"symbols": []string{"NVDA", "AAPL"}}},
		{"F2 context first on pronoun", "Compare it with Nvidia", "AAPL", "F2", "compare", map[string]any{"symbols": []string{"AAPL", "NVDA"}}},
		{"F2 caps at four", "compare AAPL MSFT NVDA TSLA JPM", "", "F2", "compare", map[string]any{"symbols": []string{"AAPL", "MSFT", "NVDA", "TSLA"}}},
		{"F2 dedupes", "compare AAPL, apple and MSFT", "", "F2", "compare", map[string]any{"symbols": []string{"AAPL", "MSFT"}}},
		{"F2 one ticker falls through to F6", "compare AAPL", "", "F6", "instrument-detail", map[string]any{"symbol": "AAPL"}},

		{"F3 chart default range", "chart AAPL", "", "F3", "price-chart", map[string]any{"symbol": "AAPL", "range": "1D"}},
		{"F3 week", "plot tesla over the week", "", "F3", "price-chart", map[string]any{"symbol": "TSLA", "range": "5D"}},
		{"F3 5d", "trend for MSFT 5d", "", "F3", "price-chart", map[string]any{"symbol": "MSFT", "range": "5D"}},
		{"F3 five day", "graph GS five day", "", "F3", "price-chart", map[string]any{"symbol": "GS", "range": "5D"}},
		{"F3 month", "history of JPM this month", "", "F3", "price-chart", map[string]any{"symbol": "JPM", "range": "1M"}},
		{"F3 1m", "chart META 1m", "", "F3", "price-chart", map[string]any{"symbol": "META", "range": "1M"}},
		{"F3 context ticker", "chart this", "TSLA", "F3", "price-chart", map[string]any{"symbol": "TSLA", "range": "1D"}},
		{"F3 needs a ticker", "chart something", "", "F7", "none", map[string]any{"reason": "I couldn't match that request to a module."}},

		{"F4 both default", "show me what's moving in my watchlist", "", "F4", "watchlist-movers", map[string]any{"direction": "both", "limit": 5}},
		{"F4 gainers", "top 3 gainer", "", "F4", "watchlist-movers", map[string]any{"direction": "up", "limit": 3}},
		{"F4 losers", "biggest loser", "", "F4", "watchlist-movers", map[string]any{"direction": "down", "limit": 5}},
		{"F4 worst", "worst 10", "", "F4", "watchlist-movers", map[string]any{"direction": "down", "limit": 10}},
		{"F4 up the most", "what is up the most", "", "F4", "watchlist-movers", map[string]any{"direction": "up", "limit": 5}},
		{"F4 skips integers outside 1-10", "top 100 or 4 movers", "", "F4", "watchlist-movers", map[string]any{"direction": "both", "limit": 4}},
		{"F4 hit", "who got hit today", "", "F4", "watchlist-movers", map[string]any{"direction": "down", "limit": 5}},

		{"F5 watchlist", "open my watchlist", "", "F5", "blotter", map[string]any{"symbols": nil}},
		{"F5 portfolio", "portfolio", "", "F5", "blotter", map[string]any{"symbols": nil}},
		{"F5 my names", "show my names", "", "F5", "blotter", map[string]any{"symbols": nil}},

		{"F6 detail", "show me Apple", "", "F6", "instrument-detail", map[string]any{"symbol": "AAPL"}},
		{"F6 context", "tell me more about it", "NVDA", "F6", "instrument-detail", map[string]any{"symbol": "NVDA"}},
		{"F6 prompt ticker beats context", "microsoft please", "AAPL", "F6", "instrument-detail", map[string]any{"symbol": "MSFT"}},
		{"F6 multi-word alias", "goldman sachs", "", "F6", "instrument-detail", map[string]any{"symbol": "GS"}},
		{"F6 case-insensitive symbol", "jpm", "", "F6", "instrument-detail", map[string]any{"symbol": "JPM"}},

		{"F7 nothing", "hello there", "", "F7", "none", map[string]any{"reason": "I couldn't match that request to a module."}},
		{"F7 unknown ticker", "Show me Ford", "", "F7", "none", map[string]any{"reason": "I couldn't match that request to a module."}},
		{"F7 substring is not a match", "gsm networks", "", "F7", "none", map[string]any{"reason": "I couldn't match that request to a module."}},
	}
	for _, r := range rows {
		t.Run(r.name, func(t *testing.T) {
			plan := Fallback(r.prompt, r.ctx)
			if len(plan.Modules) != 1 {
				t.Fatalf("want exactly one module, got %d", len(plan.Modules))
			}
			m := plan.Modules[0]
			if m.Module != r.module || !reflect.DeepEqual(m.Payload, r.payload) {
				t.Errorf("got %s %#v, want %s %#v", m.Module, m.Payload, r.module, r.payload)
			}
			if plan.FDC3Action != nil {
				t.Errorf("fallback must never carry an fdc3Action, got %#v", plan.FDC3Action)
			}
			if !strings.HasPrefix(plan.Rationale, "Fallback rule "+r.rule+":") {
				t.Errorf("rationale %q should name rule %s", plan.Rationale, r.rule)
			}
			if len(plan.Rationale) > maxRationale {
				t.Errorf("rationale exceeds %d characters", maxRationale)
			}
			if _, err := Validate(plan); err != nil {
				t.Errorf("fallback plan must pass the semantic checks: %v", err)
			}
		})
	}
}

func TestFallback_FR19_RationaleNamesTicker(t *testing.T) {
	if got := Fallback("chart AAPL", "").Rationale; got != "Fallback rule F3: chart request for AAPL." {
		t.Errorf("got %q", got)
	}
}
