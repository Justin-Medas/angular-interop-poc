package config

import (
	"strings"
	"testing"
	"time"
)

func env(m map[string]string) func(string) string {
	return func(k string) string { return m[k] }
}

func TestLoad_SPEC63_Defaults(t *testing.T) {
	c, err := Load(env(nil))
	if err != nil {
		t.Fatal(err)
	}
	if c.Port != "8080" || c.AnthropicAPIKey != "" || c.AgentTimeout != 10*time.Second {
		t.Errorf("unexpected defaults: %+v", c)
	}
	want := []string{"http://localhost:4200", "http://localhost:8090"}
	if strings.Join(c.CORSAllowedOrigins, ",") != strings.Join(want, ",") {
		t.Errorf("origins = %v, want %v", c.CORSAllowedOrigins, want)
	}
	if c.MockSeed != 42 || c.MockTick || !c.MockNow.Equal(time.Date(2026, 10, 7, 15, 30, 0, 0, time.UTC)) {
		t.Errorf("unexpected mock defaults: %+v", c)
	}
}

func TestLoad_SPEC63_Overrides(t *testing.T) {
	c, err := Load(env(map[string]string{
		"PORT":                 "9000",
		"ANTHROPIC_API_KEY":    "k",
		"AGENT_TIMEOUT_MS":     "2500",
		"CORS_ALLOWED_ORIGINS": " http://a.test , http://b.test ",
		"MOCK_SEED":            "7",
		"MOCK_NOW":             "2026-01-02T03:04:05Z",
		"MOCK_TICK":            "on",
	}))
	if err != nil {
		t.Fatal(err)
	}
	if c.Port != "9000" || c.AnthropicAPIKey != "k" || c.AgentTimeout != 2500*time.Millisecond ||
		c.MockSeed != 7 || !c.MockTick || c.MockNow.Day() != 2 {
		t.Errorf("unexpected config: %+v", c)
	}
	if len(c.CORSAllowedOrigins) != 2 || c.CORSAllowedOrigins[0] != "http://a.test" || c.CORSAllowedOrigins[1] != "http://b.test" {
		t.Errorf("origins = %v", c.CORSAllowedOrigins)
	}
}

func TestLoad_SPEC63_Invalid(t *testing.T) {
	cases := []struct {
		name string
		env  map[string]string
	}{
		{"port not numeric", map[string]string{"PORT": "abc"}},
		{"port out of range", map[string]string{"PORT": "70000"}},
		{"timeout not numeric", map[string]string{"AGENT_TIMEOUT_MS": "x"}},
		{"timeout not positive", map[string]string{"AGENT_TIMEOUT_MS": "0"}},
		{"cors wildcard", map[string]string{"CORS_ALLOWED_ORIGINS": "http://a.test,*"}},
		{"seed not numeric", map[string]string{"MOCK_SEED": "x"}},
		{"now not RFC3339", map[string]string{"MOCK_NOW": "yesterday"}},
		{"tick not on/off", map[string]string{"MOCK_TICK": "maybe"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := Load(env(tc.env)); err == nil {
				t.Fatal("expected an error")
			}
		})
	}
}
