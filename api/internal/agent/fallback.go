// The deterministic fallback planner: SPEC §7.4 rules F1–F7 (FR19). It runs whenever the model path
// cannot answer (FR7), so it must be pure and need no network, key or clock. A plan it returns
// always has one module and no fdc3Action.

package agent

import (
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/Justin-Medas/angular-interop-poc/api/internal/mock"
)

// hasWord reports whether text contains phrase as whole words. text is already lower-case.
func hasWord(text, phrase string) bool {
	return regexp.MustCompile(`\b` + regexp.QuoteMeta(phrase) + `\b`).MatchString(text)
}

// hasAny reports whether text contains any of the phrases as whole words.
func hasAny(text string, phrases ...string) bool {
	for _, p := range phrases {
		if hasWord(text, p) {
			return true
		}
	}
	return false
}

// extractTickers returns universe tickers named in the lower-cased prompt (by symbol or alias),
// ordered by first appearance and de-duplicated (SPEC §7.4 ticker extraction).
func extractTickers(text string) []string {
	type hit struct {
		symbol string
		pos    int
	}
	var hits []hit
	for _, in := range mock.Universe() {
		best := -1
		for _, name := range append([]string{strings.ToLower(in.Symbol)}, in.Aliases...) {
			if loc := regexp.MustCompile(`\b` + regexp.QuoteMeta(name) + `\b`).FindStringIndex(text); loc != nil && (best < 0 || loc[0] < best) {
				best = loc[0]
			}
		}
		if best >= 0 {
			hits = append(hits, hit{in.Symbol, best})
		}
	}
	sort.Slice(hits, func(i, j int) bool { return hits[i].pos < hits[j].pos })
	out := make([]string, len(hits))
	for i, h := range hits {
		out[i] = h.symbol
	}
	return out
}

// rangeFor maps range words to a chart range (F3); the default is 1D.
func rangeFor(text string) string {
	switch {
	case hasAny(text, "5 day", "five day", "week", "5d"):
		return "5D"
	case hasAny(text, "month", "1m"):
		return "1M"
	}
	return "1D"
}

// directionFor picks the movers direction (F4). "up" words are checked first, so a prompt with both
// kinds resolves to up; the spec lists them in that order.
func directionFor(text string) string {
	switch {
	case hasAny(text, "gainer", "best", "winner", "up"):
		return "up"
	case hasAny(text, "loser", "worst", "hit", "drop", "down"):
		return "down"
	}
	return "both"
}

// limitFor returns the first integer in 1-10 in the prompt, else 5 (F4). Integers outside the range
// ("buy 100") are skipped rather than clamped, so they cannot produce an invalid limit (S6).
func limitFor(text string) int {
	for _, d := range regexp.MustCompile(`\d+`).FindAllString(text, -1) {
		if n, err := strconv.Atoi(d); err == nil && n >= 1 && n <= 10 {
			return n
		}
	}
	return 5
}

// prepend puts t first in list unless it is already there, keeping the list free of duplicates.
func prepend(t string, list []string) []string {
	out := []string{t}
	for _, s := range list {
		if s != t {
			out = append(out, s)
		}
	}
	return out
}

// result builds the one-module plan every rule returns, with a rationale that names the rule.
func result(rule, rationale, module string, payload map[string]any) Plan {
	return Plan{
		Modules:    []Module{{Module: module, Payload: payload}},
		FDC3Action: nil,
		Rationale:  fmt.Sprintf("Fallback rule %s: %s", rule, rationale),
	}
}

// Fallback plans a prompt without a model, by the first matching rule of SPEC §7.4. contextTicker is
// the FDC3 context instrument ("" when none); it stands in for a ticker the prompt does not name.
func Fallback(prompt, contextTicker string) Plan {
	text := strings.ToLower(prompt)
	tickers := extractTickers(text)
	if len(tickers) == 0 && contextTicker != "" {
		tickers = []string{contextTicker}
	}

	if hasAny(text, "buy", "sell", "short", "trade", "order") { // F1
		return result("F1", "trading request.", "none", map[string]any{"reason": "Trading is out of scope for this demo."})
	}
	if hasAny(text, "compare", "vs", "versus") { // F2
		pair := tickers
		if contextTicker != "" && hasAny(text, "it", "this", "that") {
			pair = prepend(contextTicker, pair)
		}
		if len(pair) >= 2 {
			if len(pair) > 4 {
				pair = pair[:4]
			}
			return result("F2", "comparison of "+strings.Join(pair, ", ")+".", "compare", map[string]any{"symbols": pair})
		}
	}
	if hasAny(text, "chart", "graph", "plot", "trend", "history") && len(tickers) >= 1 { // F3
		return result("F3", "chart request for "+tickers[0]+".", "price-chart", map[string]any{"symbol": tickers[0], "range": rangeFor(text)})
	}
	if hasAny(text, "mover", "moving", "gainer", "loser", "best", "worst", "top", "hit", "up the most", "down the most") { // F4
		return result("F4", "watchlist movers request.", "watchlist-movers", map[string]any{"direction": directionFor(text), "limit": limitFor(text)})
	}
	if hasAny(text, "watchlist", "blotter", "my names", "portfolio") { // F5
		return result("F5", "watchlist request.", "blotter", map[string]any{"symbols": nil})
	}
	if len(tickers) >= 1 { // F6
		return result("F6", "detail request for "+tickers[0]+".", "instrument-detail", map[string]any{"symbol": tickers[0]})
	}
	return result("F7", "no match.", "none", map[string]any{"reason": "I couldn't match that request to a module."}) // F7
}
