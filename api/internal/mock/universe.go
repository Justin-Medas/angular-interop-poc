// Package mock is the deterministic in-memory market behind the API (specs/mock-data.yaml).
package mock

// Instrument is one row of the mock universe. A test keeps this table equal to specs/mock-data.yaml.
type Instrument struct {
	Symbol    string
	Name      string
	Aliases   []string
	PrevClose float64
	Last      float64
	Volume    int64
}

var universe = []Instrument{
	{"AAPL", "Apple Inc.", []string{"apple"}, 226.58, 228.50, 51234000},
	{"MSFT", "Microsoft Corp.", []string{"microsoft"}, 429.40, 431.20, 18456000},
	{"NVDA", "NVIDIA Corp.", []string{"nvidia"}, 135.28, 138.40, 212870000},
	{"TSLA", "Tesla Inc.", []string{"tesla"}, 259.91, 251.80, 98120000},
	{"JPM", "JPMorgan Chase & Co.", []string{"jpmorgan", "jp morgan"}, 213.18, 212.60, 8765000},
	{"GS", "Goldman Sachs Group Inc.", []string{"goldman sachs", "goldman"}, 517.73, 512.30, 2134000},
	{"AMZN", "Amazon.com Inc.", []string{"amazon"}, 184.87, 186.90, 41230000},
	{"GOOGL", "Alphabet Inc.", []string{"alphabet", "google"}, 166.77, 165.70, 23110000},
	{"META", "Meta Platforms Inc.", []string{"meta", "facebook"}, 570.68, 588.10, 15670000},
	{"XOM", "Exxon Mobil Corp.", []string{"exxon", "exxonmobil"}, 118.58, 118.40, 14320000},
}

// Universe returns the instruments in fixture order.
func Universe() []Instrument { return append([]Instrument(nil), universe...) }

var defaultWatchlist = []string{"AAPL", "MSFT", "NVDA", "TSLA", "JPM", "GS"}
