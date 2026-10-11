// The mutable half of the mock market: current prices, the watchlist, the optional ticker and the
// seeded price history. Prices are stored per symbol; change figures are always derived from the
// fixture's previous close, so a tick can never leave them inconsistent (specs/mock-data.yaml).

package mock

import (
	"context"
	"hash/fnv"
	"math"
	"math/rand/v2"
	"sync"
	"time"
	_ "time/tzdata" // New York open time must work on hosts without a tz database (Windows, slim images)
)

// currency is fixed because the mock universe is US equities only.
const currency = "USD"

// Quote is one instrument's price snapshot. Its JSON shape is the Quote schema in openapi.yaml.
type Quote struct {
	Symbol    string    `json:"symbol"`
	Name      string    `json:"name"`
	Last      float64   `json:"last"`
	Change    float64   `json:"change"`
	ChangePct float64   `json:"changePct"`
	Volume    int64     `json:"volume"`
	Currency  string    `json:"currency"`
	AsOf      time.Time `json:"asOf"`
}

// PricePoint is one history sample: a timestamp and a price. Its JSON shape is PricePoint in openapi.yaml.
type PricePoint struct {
	T     time.Time `json:"t"`
	Price float64   `json:"price"`
}

// Store holds current prices and the watchlist. Safe for concurrent use: HTTP handlers read while
// the optional ticker goroutine writes, so every access goes through mu.
type Store struct {
	mu        sync.RWMutex
	seed      int64
	now       time.Time
	asOf      time.Time
	last      map[string]float64
	watchlist []string
	tickRNG   *rand.Rand
}

// NewStore starts at the fixture baseline; now is the frozen clock (MOCK_NOW). The same seed and clock
// always produce the same ticks and history, which is what keeps tests, evals and visual snapshots stable.
func NewStore(seed int64, now time.Time) *Store {
	s := &Store{seed: seed, now: now, asOf: now, last: map[string]float64{}, watchlist: append([]string(nil), defaultWatchlist...),
		tickRNG: rand.New(rand.NewPCG(uint64(seed), 1))}
	for _, in := range universe {
		s.last[in.Symbol] = in.Last
	}
	return s
}

// round2 rounds to cents so JSON prices never carry float noise.
func round2(x float64) float64 { return math.Round(x*100) / 100 }

// find looks a symbol up in the fixed universe. Lookup is exact: the server does not normalize case.
func find(symbol string) (Instrument, bool) {
	for _, in := range universe {
		if in.Symbol == symbol {
			return in, true
		}
	}
	return Instrument{}, false
}

// Quote returns the current quote; change and changePct are always derived from prevClose.
func (s *Store) Quote(symbol string) (Quote, bool) {
	in, ok := find(symbol)
	if !ok {
		return Quote{}, false
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	last := s.last[symbol]
	change := round2(last - in.PrevClose)
	return Quote{symbol, in.Name, last, change, round2(change / in.PrevClose * 100), in.Volume, currency, s.asOf}, true
}

// Watchlist returns a copy of the current watchlist, so callers cannot mutate shared state.
func (s *Store) Watchlist() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]string{}, s.watchlist...)
}

// SetWatchlist replaces the in-memory watchlist (FR5). The caller has already validated the symbols.
func (s *Store) SetWatchlist(symbols []string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.watchlist = append([]string{}, symbols...)
}

// Tick takes one seeded random-walk step of at most ±0.2% for every instrument (MOCK_TICK=on).
func (s *Store) Tick(at time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, in := range universe {
		step := (s.tickRNG.Float64()*2 - 1) * 0.002
		s.last[in.Symbol] = round2(s.last[in.Symbol] * (1 + step))
	}
	s.asOf = at
}

// RunTicker ticks every interval until ctx is cancelled. clock is injected so tests need no real time.
func (s *Store) RunTicker(ctx context.Context, interval time.Duration, clock func() time.Time) {
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			s.Tick(clock())
		}
	}
}

// History returns a seeded random walk, oldest first, ending exactly at the current last (MOCK_NOW).
// Bars are evenly spaced back from MOCK_NOW; the series does not skip nights or weekends (DECISIONS #18).
func (s *Store) History(symbol, rng string) ([]PricePoint, bool) {
	if _, ok := find(symbol); !ok {
		return nil, false
	}
	var n int
	var step time.Duration
	var vol float64
	switch rng {
	case "1D":
		// 1D runs from the New York open to the frozen clock, so the bar count depends on MOCK_NOW.
		ny, _ := time.LoadLocation("America/New_York")
		l := s.now.In(ny)
		open := time.Date(l.Year(), l.Month(), l.Day(), 9, 30, 0, 0, ny)
		step, vol = 5*time.Minute, 0.0008
		n = max(1, int(s.now.Sub(open)/step)+1)
	case "5D":
		n, step, vol = 65, 30*time.Minute, 0.0015
	case "1M":
		n, step, vol = 21, 24*time.Hour, 0.008
	default:
		return nil, false
	}
	// Seed per symbol and range so each chart is stable but different from the others.
	h := fnv.New64a()
	h.Write([]byte(symbol + "/" + rng))
	r := rand.New(rand.NewPCG(uint64(s.seed), h.Sum64()))

	s.mu.RLock()
	price := s.last[symbol]
	s.mu.RUnlock()
	// Walk backwards from the current price so the series ends exactly at the quote's last.
	pts := make([]PricePoint, n)
	for i := n - 1; i >= 0; i-- {
		pts[i] = PricePoint{s.now.Add(-time.Duration(n-1-i) * step), price}
		price = round2(price * (1 + (r.Float64()*2-1)*vol))
	}
	return pts, true
}
