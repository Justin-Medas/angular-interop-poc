// Package quotes serves /quotes and /watchlist from the mock store, as specified in openapi.yaml.
package quotes

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"

	"github.com/Justin-Medas/angular-interop-poc/api/internal/httpx"
	"github.com/Justin-Medas/angular-interop-poc/api/internal/mock"
)

var symbolRE = regexp.MustCompile(`^[A-Z.]{1,10}$`)

const maxWatchlist = 25

func Register(mux *http.ServeMux, s *mock.Store) {
	mux.HandleFunc("GET /quotes", listQuotes(s))
	mux.HandleFunc("GET /quotes/{symbol}", getQuote(s))
	mux.HandleFunc("GET /quotes/{symbol}/history", getHistory(s))
	mux.HandleFunc("GET /watchlist", getWatchlist(s))
	mux.HandleFunc("PUT /watchlist", putWatchlist(s))
}

type watchlist struct {
	Symbols []string `json:"symbols"`
}

// quote looks up one ticker, writing the 400/404 itself. The server does not normalize case.
func quote(w http.ResponseWriter, s *mock.Store, symbol string) (mock.Quote, bool) {
	if !symbolRE.MatchString(symbol) {
		httpx.WriteError(w, http.StatusBadRequest, "invalid_symbol", "ticker must match ^[A-Z.]{1,10}$")
		return mock.Quote{}, false
	}
	q, ok := s.Quote(symbol)
	if !ok {
		httpx.WriteError(w, http.StatusNotFound, "unknown_symbol", symbol+" is not in the mock universe")
	}
	return q, ok
}

func listQuotes(s *mock.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		symbols := s.Watchlist()
		if r.URL.Query().Has("symbols") {
			symbols = strings.Split(r.URL.Query().Get("symbols"), ",")
		}
		out := make([]mock.Quote, 0, len(symbols))
		for _, sym := range symbols {
			q, ok := quote(w, s, sym)
			if !ok {
				return
			}
			out = append(out, q)
		}
		httpx.WriteJSON(w, http.StatusOK, out)
	}
}

func getQuote(s *mock.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if q, ok := quote(w, s, r.PathValue("symbol")); ok {
			httpx.WriteJSON(w, http.StatusOK, q)
		}
	}
}

func getHistory(s *mock.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if _, ok := quote(w, s, r.PathValue("symbol")); !ok {
			return
		}
		rng := "1D"
		if r.URL.Query().Has("range") {
			rng = r.URL.Query().Get("range")
		}
		pts, ok := s.History(r.PathValue("symbol"), rng)
		if !ok {
			httpx.WriteError(w, http.StatusBadRequest, "invalid_request", "range must be 1D, 5D or 1M")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, pts)
	}
}

func getWatchlist(s *mock.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, watchlist{s.Watchlist()})
	}
}

func putWatchlist(s *mock.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var in watchlist
		dec := json.NewDecoder(r.Body)
		dec.DisallowUnknownFields()
		if err := dec.Decode(&in); err != nil || in.Symbols == nil || len(in.Symbols) > maxWatchlist {
			httpx.WriteError(w, http.StatusBadRequest, "invalid_request", `body must be {"symbols": [up to 25 tickers]}`)
			return
		}
		seen := map[string]bool{}
		for _, sym := range in.Symbols {
			switch {
			case !symbolRE.MatchString(sym):
				httpx.WriteError(w, http.StatusBadRequest, "invalid_symbol", "ticker must match ^[A-Z.]{1,10}$")
				return
			case seen[sym]:
				httpx.WriteError(w, http.StatusBadRequest, "invalid_request", "symbols must be unique")
				return
			}
			if _, ok := s.Quote(sym); !ok {
				httpx.WriteError(w, http.StatusBadRequest, "unknown_symbol", sym+" is not in the mock universe")
				return
			}
			seen[sym] = true
		}
		s.SetWatchlist(in.Symbols)
		httpx.WriteJSON(w, http.StatusOK, watchlist{s.Watchlist()})
	}
}
