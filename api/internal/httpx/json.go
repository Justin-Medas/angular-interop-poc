package httpx

import (
	"encoding/json"
	"net/http"
)

// WriteJSON sends v as a JSON body with the given status. Every JSON response goes through it.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// WriteError sends the openapi.yaml Error schema. code is one of invalid_request, invalid_symbol, unknown_symbol.
func WriteError(w http.ResponseWriter, status int, code, message string) {
	WriteJSON(w, status, map[string]string{"code": code, "message": message})
}
