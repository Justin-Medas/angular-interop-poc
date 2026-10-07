package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/Justin-Medas/angular-interop-poc/api/internal/config"
	"github.com/santhosh-tekuri/jsonschema/v6"
	"gopkg.in/yaml.v3"
)

// Contract tests: real responses are validated against specs/openapi.yaml (OpenAPI 3.1 schemas are
// JSON Schema 2020-12, so jsonschema/v6 validates them directly; DECISIONS #17).
var compiler = func() *jsonschema.Compiler {
	b, err := os.ReadFile("../../../specs/openapi.yaml")
	if err != nil {
		panic(err)
	}
	var doc any
	if err := yaml.Unmarshal(b, &doc); err != nil {
		panic(err)
	}
	j, _ := json.Marshal(doc)
	parsed, err := jsonschema.UnmarshalJSON(strings.NewReader(string(j)))
	if err != nil {
		panic(err)
	}
	c := jsonschema.NewCompiler()
	c.AssertFormat()
	if err := c.AddResource("openapi.yaml", parsed); err != nil {
		panic(err)
	}
	return c
}()

func validate(t *testing.T, ref string, body []byte) {
	t.Helper()
	s, err := compiler.Compile("openapi.yaml#" + ref)
	if err != nil {
		t.Fatalf("compile %s: %v", ref, err)
	}
	inst, err := jsonschema.UnmarshalJSON(strings.NewReader(string(body)))
	if err != nil {
		t.Fatalf("response is not JSON: %q", body)
	}
	if err := s.Validate(inst); err != nil {
		t.Errorf("response violates %s: %v\n%s", ref, err, body)
	}
}

var defaultNow = time.Date(2026, 10, 7, 15, 30, 0, 0, time.UTC)

const (
	quote     = "/components/schemas/Quote"
	errorRef  = "/components/schemas/Error"
	watchlist = "/components/schemas/Watchlist"
	pricePt   = "/components/schemas/PricePoint"
	arr       = "ARRAY:"
	appdRef   = "/paths/~1appd~1v2~1apps/get/responses/200/content/application~1json/schema"
)

func do(method, path, body string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	w := httptest.NewRecorder()
	New(config.Config{MockNow: defaultNow}).ServeHTTP(w, r)
	return w
}

func TestContract_G3_Routes(t *testing.T) {
	cases := []struct {
		name, method, path, body string
		status                   int
		ref                      string
		array                    bool
	}{
		{"FR1 quotes default watchlist", "GET", "/quotes", "", 200, quote, true},
		{"FR1 quotes by symbols", "GET", "/quotes?symbols=MSFT,AAPL", "", 200, quote, true},
		{"quote by symbol", "GET", "/quotes/NVDA", "", 200, quote, false},
		{"FR3 unknown symbol 404", "GET", "/quotes/ZZZZ", "", 404, errorRef, false},
		{"lower-case symbol 400", "GET", "/quotes/aapl", "", 400, errorRef, false},
		{"quotes unknown symbol 404", "GET", "/quotes?symbols=AAPL,ZZZZ", "", 404, errorRef, false},
		{"quotes malformed symbol 400", "GET", "/quotes?symbols=aapl", "", 400, errorRef, false},
		{"quotes empty symbols 400", "GET", "/quotes?symbols=", "", 400, errorRef, false},
		{"history default range", "GET", "/quotes/AAPL/history", "", 200, pricePt, true},
		{"history 5D", "GET", "/quotes/AAPL/history?range=5D", "", 200, pricePt, true},
		{"history 1M", "GET", "/quotes/AAPL/history?range=1M", "", 200, pricePt, true},
		{"history bad range 400", "GET", "/quotes/AAPL/history?range=1Y", "", 400, errorRef, false},
		{"history bad symbol 400", "GET", "/quotes/aapl/history", "", 400, errorRef, false},
		{"history unknown 404", "GET", "/quotes/ZZZZ/history", "", 404, errorRef, false},
		{"FR5 get watchlist", "GET", "/watchlist", "", 200, watchlist, false},
		{"FR5 put watchlist", "PUT", "/watchlist", `{"symbols":["META","XOM"]}`, 200, watchlist, false},
		{"FR5 put empty watchlist", "PUT", "/watchlist", `{"symbols":[]}`, 200, watchlist, false},
		{"FR5 put malformed JSON", "PUT", "/watchlist", `{`, 400, errorRef, false},
		{"FR5 put missing symbols", "PUT", "/watchlist", `{}`, 400, errorRef, false},
		{"FR5 put extra field", "PUT", "/watchlist", `{"symbols":[],"x":1}`, 400, errorRef, false},
		{"FR5 put duplicates", "PUT", "/watchlist", `{"symbols":["AAPL","AAPL"]}`, 400, errorRef, false},
		{"FR5 put over 25", "PUT", "/watchlist", `{"symbols":["` + strings.Repeat(`A","`, 25) + `A"]}`, 400, errorRef, false},
		{"FR5 put bad pattern", "PUT", "/watchlist", `{"symbols":["aapl"]}`, 400, errorRef, false},
		{"FR5 put unknown symbol", "PUT", "/watchlist", `{"symbols":["ZZZZ"]}`, 400, errorRef, false},
		{"FR18 appd", "GET", "/appd/v2/apps", "", 200, appdRef, false},
		{"FR18 healthz", "GET", "/healthz", "", 200, "/components/schemas/Health", false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := do(tc.method, tc.path, tc.body)
			if w.Code != tc.status {
				t.Fatalf("status %d, want %d: %s", w.Code, tc.status, w.Body)
			}
			body := w.Body.Bytes()
			if tc.array {
				var items []json.RawMessage
				if err := json.Unmarshal(body, &items); err != nil || len(items) == 0 {
					t.Fatalf("want non-empty array: %s", body)
				}
				for _, it := range items {
					validate(t, tc.ref, it)
				}
				return
			}
			validate(t, tc.ref, body)
		})
	}
}

func TestContract_FR1_QuotesOrderAndDefaults(t *testing.T) {
	var qs []struct{ Symbol string }
	_ = json.Unmarshal(do("GET", "/quotes", "").Body.Bytes(), &qs)
	want := []string{"AAPL", "MSFT", "NVDA", "TSLA", "JPM", "GS"}
	for i, s := range want {
		if qs[i].Symbol != s {
			t.Fatalf("order %v", qs)
		}
	}
	_ = json.Unmarshal(do("GET", "/quotes?symbols=GS,AAPL", "").Body.Bytes(), &qs)
	if len(qs) != 2 || qs[0].Symbol != "GS" || qs[1].Symbol != "AAPL" {
		t.Errorf("requested order not kept: %v", qs)
	}
}

func TestContract_FR5_PutThenGetAndQuotesFollow(t *testing.T) {
	h := New(config.Config{MockNow: defaultNow})
	put := httptest.NewRecorder()
	h.ServeHTTP(put, httptest.NewRequest("PUT", "/watchlist", strings.NewReader(`{"symbols":["META","XOM"]}`)))
	get := httptest.NewRecorder()
	h.ServeHTTP(get, httptest.NewRequest("GET", "/watchlist", nil))
	if strings.TrimSpace(get.Body.String()) != `{"symbols":["META","XOM"]}` {
		t.Errorf("get = %s", get.Body)
	}
	q := httptest.NewRecorder()
	h.ServeHTTP(q, httptest.NewRequest("GET", "/quotes", nil))
	if !strings.Contains(q.Body.String(), `"META"`) || strings.Contains(q.Body.String(), `"AAPL"`) {
		t.Errorf("quotes should follow the watchlist: %s", q.Body)
	}
	if put.Code != http.StatusOK {
		t.Errorf("put = %d", put.Code)
	}
}

func TestServer_NFRP2_TickModeStartsTicker(t *testing.T) {
	New(config.Config{MockTick: true, MockNow: defaultNow}) // must not panic; ticker goroutine runs until exit
}
