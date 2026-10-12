// Package agent plans which UI modules the shell should load for a user prompt (SPEC §7).
// This file holds the WorkspacePlan types shared by the semantic checks, the deterministic
// fallback and (later) the model path.
package agent

// maxRationale is the longest rationale the server returns; longer text is truncated (SPEC §7.3 S8).
const maxRationale = 160

// Module is one entry of a plan: a module name from the SPEC §7.1 catalog and its payload.
// Payload is a map because its shape depends on Module; specs/agent-tool-schema.json pins the shapes
// and the semantic checks (semantic.go) verify the rest.
type Module struct {
	Module  string         `json:"module"`
	Payload map[string]any `json:"payload"`
}

// Action is the plan's optional FDC3 side effect. Only a broadcastInstrument exists (SPEC §7.2 R6).
type Action struct {
	Type   string `json:"type"`
	Ticker string `json:"ticker"`
}

// Plan is the WorkspacePlan of specs/agent-tool-schema.json. FDC3Action is nil when no side effect
// is wanted, which JSON-encodes as the required explicit null.
type Plan struct {
	Modules    []Module `json:"modules"`
	FDC3Action *Action  `json:"fdc3Action"`
	Rationale  string   `json:"rationale"`
}
