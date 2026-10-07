// Package appd serves the FDC3 app directory so Sail can add this POC (FR18).
package appd

import (
	_ "embed"
	"net/http"
)

// appd.json is a copy of specs/appd.json (go:embed cannot reach outside the module); a test keeps them equal.
//
//go:embed appd.json
var appdJSON []byte

// Register adds GET /appd/v2/apps, which serves the embedded directory as-is.
func Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /appd/v2/apps", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(appdJSON)
	})
}
