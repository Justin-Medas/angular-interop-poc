// Package config reads the server's environment variables (SPEC §6.3).
package config

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// Config holds every setting the API reads. Nothing else comes from the environment.
type Config struct {
	Port               string
	AnthropicAPIKey    string
	AgentTimeout       time.Duration
	CORSAllowedOrigins []string
	MockSeed           int64
	MockNow            time.Time
	MockTick           bool
}

// Load builds a Config from getenv (os.Getenv in production). Unset or empty means the SPEC default.
func Load(getenv func(string) string) (Config, error) {
	get := func(key, def string) string {
		if v := strings.TrimSpace(getenv(key)); v != "" {
			return v
		}
		return def
	}

	c := Config{Port: get("PORT", "8080"), AnthropicAPIKey: getenv("ANTHROPIC_API_KEY")}

	if p, err := strconv.Atoi(c.Port); err != nil || p < 1 || p > 65535 {
		return Config{}, fmt.Errorf("PORT %q is not a valid port", c.Port)
	}

	ms, err := strconv.Atoi(get("AGENT_TIMEOUT_MS", "10000"))
	if err != nil || ms <= 0 {
		return Config{}, fmt.Errorf("AGENT_TIMEOUT_MS must be a positive integer")
	}
	c.AgentTimeout = time.Duration(ms) * time.Millisecond

	for _, o := range strings.Split(get("CORS_ALLOWED_ORIGINS", "http://localhost:4200,http://localhost:8090"), ",") {
		o = strings.TrimSpace(o)
		if o == "*" {
			return Config{}, fmt.Errorf("CORS_ALLOWED_ORIGINS must list exact origins, never *")
		}
		c.CORSAllowedOrigins = append(c.CORSAllowedOrigins, o)
	}

	if c.MockSeed, err = strconv.ParseInt(get("MOCK_SEED", "42"), 10, 64); err != nil {
		return Config{}, fmt.Errorf("MOCK_SEED must be an integer")
	}
	if c.MockNow, err = time.Parse(time.RFC3339, get("MOCK_NOW", "2026-10-07T15:30:00Z")); err != nil {
		return Config{}, fmt.Errorf("MOCK_NOW must be RFC 3339: %w", err)
	}
	switch get("MOCK_TICK", "off") {
	case "on":
		c.MockTick = true
	case "off":
	default:
		return Config{}, fmt.Errorf("MOCK_TICK must be on or off")
	}
	return c, nil
}
