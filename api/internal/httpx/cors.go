// Package httpx holds small HTTP helpers shared by every route.
package httpx

import "net/http"

// CORS (FR18, NFR-S2) echoes the request Origin only when it is listed, never "*".
// Preflight (OPTIONS) is answered with 204 for every path; other requests continue to next,
// with the headers already set so error responses carry them too.
func CORS(allowed []string) func(http.Handler) http.Handler {
	ok := make(map[string]bool, len(allowed))
	for _, o := range allowed {
		ok[o] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			listed := ok[origin]
			w.Header().Add("Vary", "Origin")
			if listed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}
			if r.Method == http.MethodOptions {
				if listed {
					w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS")
					w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
				}
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
