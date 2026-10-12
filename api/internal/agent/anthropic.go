// The real ModelClient: one call to the Anthropic Messages API per Next, shaped exactly as SPEC §7.2
// requires. It holds no loop logic; the tool loop and validation live in agent.go (FR7, FR16).

package agent

import (
	"context"
	"encoding/json"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

const (
	toolName = "get_watchlist_quotes"
	// maxTokens bounds one turn. A plan is a few hundred tokens; the cap just stops a runaway answer.
	maxTokens = 2048
)

// AnthropicClient implements ModelClient on the Messages API.
type AnthropicClient struct {
	client anthropic.Client
	model  anthropic.Model
	format map[string]any
}

// NewAnthropicClient builds the client for model (SPEC §6.3 allows two). opts exist for tests, which
// point it at a stub server with option.WithBaseURL. Retries are off: the SDK would otherwise retry
// inside our timeout and hide failures, and the deterministic fallback is the retry (FR7).
func NewAnthropicClient(apiKey, model string, opts ...option.RequestOption) *AnthropicClient {
	var format map[string]any
	_ = json.Unmarshal(schemaJSON, &format) // the embedded schema is valid JSON (compiled in parsePlan's tests)
	all := append([]option.RequestOption{option.WithAPIKey(apiKey), option.WithMaxRetries(0)}, opts...)
	return &AnthropicClient{client: anthropic.NewClient(all...), model: anthropic.Model(model), format: format}
}

// Next sends msgs and maps the response to a Reply. The request follows SPEC §7.2: structured output
// from agent-tool-schema.json, effort low, one strict read-only tool, tool_choice auto. thinking is
// omitted and tool_choice is never forced: both models reject those (DECISIONS #20).
func (c *AnthropicClient) Next(ctx context.Context, system string, msgs []Message) (Reply, error) {
	params := make([]anthropic.MessageParam, 0, len(msgs))
	for _, m := range msgs {
		params = append(params, toParam(m))
	}
	msg, err := c.client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     c.model,
		MaxTokens: maxTokens,
		// The system prompt is stable, so a cache breakpoint here lets repeat requests reuse it.
		System:     []anthropic.TextBlockParam{{Text: system, CacheControl: anthropic.NewCacheControlEphemeralParam()}},
		Messages:   params,
		Tools:      []anthropic.ToolUnionParam{{OfTool: quotesTool()}},
		ToolChoice: anthropic.ToolChoiceUnionParam{OfAuto: &anthropic.ToolChoiceAutoParam{}},
		OutputConfig: anthropic.OutputConfigParam{
			Effort: anthropic.OutputConfigEffortLow,
			Format: anthropic.JSONOutputFormatParam{Schema: c.format},
		},
	})
	if err != nil {
		return Reply{}, err
	}

	reply := Reply{Refused: msg.StopReason == anthropic.StopReasonRefusal, Raw: echo(msg)}
	for _, b := range msg.Content {
		switch b.Type {
		case "text":
			reply.Text += b.Text
		case "tool_use":
			if b.Name == toolName {
				reply.ToolUseID = b.ID
			}
		}
	}
	return reply, nil
}

// quotesTool is the one strict, read-only tool (SPEC §7.2). It takes no input.
func quotesTool() *anthropic.ToolParam {
	return &anthropic.ToolParam{
		Name:        toolName,
		Description: anthropic.String("Returns the current quote for every symbol in the user's watchlist: symbol, name, last, change, changePct. Read-only."),
		Strict:      anthropic.Bool(true),
		InputSchema: anthropic.ToolInputSchemaParam{
			Properties:  map[string]any{},
			ExtraFields: map[string]any{"additionalProperties": false},
		},
	}
}

// toParam converts a neutral Message to the SDK's. An assistant turn that still has its Raw form is
// echoed as-is, which keeps thinking blocks and their signatures intact; without Raw the tool call is rebuilt.
func toParam(m Message) anthropic.MessageParam {
	switch {
	case m.Role == "user" && m.ToolUseID != "":
		return anthropic.NewUserMessage(anthropic.NewToolResultBlock(m.ToolUseID, m.Text, false))
	case m.Role == "user":
		return anthropic.NewUserMessage(anthropic.NewTextBlock(m.Text))
	}
	if raw, ok := m.Raw.(anthropic.MessageParam); ok {
		return raw
	}
	return anthropic.NewAssistantMessage(anthropic.NewToolUseBlock(m.ToolUseID, map[string]any{}, toolName))
}

// echo rebuilds the assistant turn as a request parameter from the response's own JSON, so every
// content block (including thinking) round-trips unchanged.
func echo(msg *anthropic.Message) anthropic.MessageParam {
	var raw struct {
		Content json.RawMessage `json:"content"`
	}
	_ = json.Unmarshal([]byte(msg.RawJSON()), &raw)
	var p anthropic.MessageParam
	_ = json.Unmarshal([]byte(`{"role":"assistant","content":`+string(raw.Content)+`}`), &p)
	return p
}
