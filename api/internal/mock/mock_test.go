package mock

import (
	"context"
	"os"
	"reflect"
	"testing"
	"time"

	"gopkg.in/yaml.v3"
)

var now = time.Date(2026, 10, 7, 15, 30, 0, 0, time.UTC)

type fixture struct {
	Defaults struct {
		Seed      int64    `yaml:"seed"`
		Watchlist []string `yaml:"watchlist"`
		Currency  string   `yaml:"currency"`
	} `yaml:"defaults"`
	History map[string]struct {
		Points int `yaml:"points"`
	} `yaml:"history"`
	Universe []struct {
		Symbol    string   `yaml:"symbol"`
		Name      string   `yaml:"name"`
		Aliases   []string `yaml:"aliases"`
		PrevClose float64  `yaml:"prevClose"`
		Last      float64  `yaml:"last"`
		Change    float64  `yaml:"change"`
		ChangePct float64  `yaml:"changePct"`
		Volume    int64    `yaml:"volume"`
	} `yaml:"universe"`
}

func loadFixture(t *testing.T) fixture {
	t.Helper()
	b, err := os.ReadFile("../../../specs/mock-data.yaml")
	if err != nil {
		t.Fatal(err)
	}
	var f fixture
	if err := yaml.Unmarshal(b, &f); err != nil {
		t.Fatal(err)
	}
	return f
}

// Drift guard: the Go universe must equal specs/mock-data.yaml (G3).
func TestStore_G3_MatchesFixture(t *testing.T) {
	f := loadFixture(t)
	s := NewStore(f.Defaults.Seed, now)
	if len(f.Universe) != len(Universe()) {
		t.Fatalf("universe size %d, fixture %d", len(Universe()), len(f.Universe))
	}
	for i, want := range f.Universe {
		in := Universe()[i]
		if in.Symbol != want.Symbol || in.Name != want.Name || !reflect.DeepEqual(in.Aliases, want.Aliases) ||
			in.PrevClose != want.PrevClose || in.Last != want.Last || in.Volume != want.Volume {
			t.Errorf("%s: instrument differs from fixture: %+v", want.Symbol, in)
		}
		q, ok := s.Quote(want.Symbol)
		if !ok || q.Last != want.Last || q.Change != want.Change || q.ChangePct != want.ChangePct ||
			q.Volume != want.Volume || q.Currency != f.Defaults.Currency || !q.AsOf.Equal(now) {
			t.Errorf("%s: quote %+v differs from fixture", want.Symbol, q)
		}
	}
	if !reflect.DeepEqual(s.Watchlist(), f.Defaults.Watchlist) {
		t.Errorf("watchlist = %v", s.Watchlist())
	}
}

func TestStore_G3_UnknownQuote(t *testing.T) {
	if _, ok := NewStore(42, now).Quote("ZZZZ"); ok {
		t.Error("ZZZZ should be unknown")
	}
}

func TestStore_FR5_WatchlistIsCopied(t *testing.T) {
	s := NewStore(42, now)
	in := []string{"AAPL", "GS"}
	s.SetWatchlist(in)
	in[0] = "XOM"
	got := s.Watchlist()
	got[1] = "XOM"
	if !reflect.DeepEqual(s.Watchlist(), []string{"AAPL", "GS"}) {
		t.Errorf("watchlist = %v", s.Watchlist())
	}
}

func TestHistory_G3_PointCountsAndEndAtLast(t *testing.T) {
	f := loadFixture(t)
	s := NewStore(42, now)
	for rng, want := range f.History {
		pts, ok := s.History("AAPL", rng)
		if !ok || len(pts) != want.Points {
			t.Fatalf("%s: ok=%v points=%d want %d", rng, ok, len(pts), want.Points)
		}
		last := pts[len(pts)-1]
		if last.Price != 228.50 || !last.T.Equal(now) {
			t.Errorf("%s: last point %+v", rng, last)
		}
		for i := 1; i < len(pts); i++ {
			if !pts[i].T.After(pts[i-1].T) {
				t.Fatalf("%s: not oldest first at %d", rng, i)
			}
			if pts[i].Price <= 0 {
				t.Fatalf("%s: non-positive price", rng)
			}
		}
	}
}

func TestHistory_G3_IntervalsAndOpen(t *testing.T) {
	s := NewStore(42, now)
	d1, _ := s.History("AAPL", "1D")
	if got := d1[0].T; !got.Equal(time.Date(2026, 10, 7, 13, 30, 0, 0, time.UTC)) { // 09:30 New York (EDT)
		t.Errorf("1D opens at %v", got)
	}
	if d := d1[1].T.Sub(d1[0].T); d != 5*time.Minute {
		t.Errorf("1D interval %v", d)
	}
	d5, _ := s.History("AAPL", "5D")
	if d := d5[1].T.Sub(d5[0].T); d != 30*time.Minute {
		t.Errorf("5D interval %v", d)
	}
	m1, _ := s.History("AAPL", "1M")
	if d := m1[1].T.Sub(m1[0].T); d != 24*time.Hour {
		t.Errorf("1M interval %v", d)
	}
}

func TestHistory_G3_DeterministicPerSeedSymbolRange(t *testing.T) {
	a, _ := NewStore(42, now).History("AAPL", "5D")
	b, _ := NewStore(42, now).History("AAPL", "5D")
	if !reflect.DeepEqual(a, b) {
		t.Error("same seed/symbol/range must be identical")
	}
	if c, _ := NewStore(7, now).History("AAPL", "5D"); reflect.DeepEqual(a, c) {
		t.Error("different seed should differ")
	}
	if c, _ := NewStore(42, now).History("MSFT", "5D"); reflect.DeepEqual(a, c) {
		t.Error("different symbol should differ")
	}
	if c, _ := NewStore(42, now).History("AAPL", "1M"); reflect.DeepEqual(a, c) {
		t.Error("different range should differ")
	}
}

func TestHistory_G3_UnknownSymbolOrRange(t *testing.T) {
	s := NewStore(42, now)
	if _, ok := s.History("ZZZZ", "1D"); ok {
		t.Error("unknown symbol")
	}
	if _, ok := s.History("AAPL", "1Y"); ok {
		t.Error("unknown range")
	}
}

func TestHistory_G3_FollowsTick(t *testing.T) {
	s := NewStore(42, now)
	s.Tick(now.Add(time.Second))
	q, _ := s.Quote("AAPL")
	pts, _ := s.History("AAPL", "1D")
	if pts[len(pts)-1].Price != q.Last {
		t.Errorf("history ends at %v, quote last %v", pts[len(pts)-1].Price, q.Last)
	}
}

func TestTick_NFRP2_RandomWalkStepRecomputesChange(t *testing.T) {
	s := NewStore(42, now)
	before, _ := s.Quote("AAPL")
	at := now.Add(2 * time.Second)
	s.Tick(at)
	after, _ := s.Quote("AAPL")
	if after.Last == before.Last {
		t.Log("price unchanged after rounding (allowed)")
	}
	if diff := after.Last - before.Last; diff > before.Last*0.002+0.005 || diff < -before.Last*0.002-0.005 {
		t.Errorf("step %v exceeds ±0.2%%", diff)
	}
	if want := round2(after.Last - 226.58); after.Change != want {
		t.Errorf("change %v, want %v", after.Change, want)
	}
	if want := round2(after.Change / 226.58 * 100); after.ChangePct != want {
		t.Errorf("changePct %v, want %v", after.ChangePct, want)
	}
	if !after.AsOf.Equal(at) {
		t.Errorf("asOf %v", after.AsOf)
	}
	b := NewStore(42, now)
	b.Tick(at)
	if q, _ := b.Quote("AAPL"); q != after {
		t.Error("tick must be deterministic for a seed")
	}
}

func TestRunTicker_NFRP2_TicksUntilCancelled(t *testing.T) {
	s := NewStore(42, now)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() { s.RunTicker(ctx, time.Millisecond, time.Now); close(done) }()
	deadline := time.After(2 * time.Second)
	for {
		if q, _ := s.Quote("AAPL"); !q.AsOf.Equal(now) {
			break
		}
		select {
		case <-deadline:
			t.Fatal("no tick observed")
		case <-time.After(time.Millisecond):
		}
	}
	cancel()
	<-done
}
