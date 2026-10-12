// Recorded model conversations for replay mode (specs/testing.md §7). A live run with -record saves
// every model turn; replay feeds them back through the real agent loop, so validation, semantic checks
// and grading run against genuine past output at no cost. Serves FR9.

package main

import (
	"context"
	"errors"

	"github.com/Justin-Medas/angular-interop-poc/api/internal/agent"
)

// Turn is one recorded model reply. The provider-private Raw form is deliberately not stored: it would
// bloat the file and carry request-specific data, and replay does not need it.
type Turn struct {
	Text      string `json:"text,omitempty"`
	ToolUseID string `json:"toolUseId,omitempty"`
	Refused   bool   `json:"refused,omitempty"`
}

// Recording is the committed recordings file. Cases maps a case id to its runs, each run being the
// ordered turns of one conversation. Model and RecordedAt make every report name its source (testing.md §7).
type Recording struct {
	Model      string              `json:"model"`
	RecordedAt string              `json:"recordedAt,omitempty"`
	Cases      map[string][][]Turn `json:"cases"`
}

// NewRecording starts an empty recording for model.
func NewRecording(model string) *Recording {
	return &Recording{Model: model, Cases: map[string][][]Turn{}}
}

// replayClient returns recorded turns in order and fails once they run out, which the agent turns
// into a "model_error" fallback and the grader into a failed case.
type replayClient struct {
	turns []Turn
	next  int
}

func (c *replayClient) Next(context.Context, string, []agent.Message) (agent.Reply, error) {
	if c.next >= len(c.turns) {
		return agent.Reply{}, errors.New("no recorded turn left")
	}
	t := c.turns[c.next]
	c.next++
	return agent.Reply{Text: t.Text, ToolUseID: t.ToolUseID, Refused: t.Refused}, nil
}

// Replay returns the client for run of caseID. A missing case or run yields a client with no turns.
func (r *Recording) Replay(caseID string, run int) agent.ModelClient {
	runs := r.Cases[caseID]
	if run >= len(runs) {
		return &replayClient{}
	}
	return &replayClient{turns: runs[run]}
}

// recorder wraps a live client and appends each successful reply to its slot in the recording.
type recorder struct {
	inner  agent.ModelClient
	rec    *Recording
	caseID string
	run    int
}

// Wrap returns inner with its replies recorded under caseID and run. Errors are not recorded: a replay
// of a failed call would need the failure, and the case would simply be re-recorded.
func (r *Recording) Wrap(caseID string, run int, inner agent.ModelClient) agent.ModelClient {
	for len(r.Cases[caseID]) <= run {
		r.Cases[caseID] = append(r.Cases[caseID], []Turn{})
	}
	return &recorder{inner, r, caseID, run}
}

func (c *recorder) Next(ctx context.Context, system string, msgs []agent.Message) (agent.Reply, error) {
	reply, err := c.inner.Next(ctx, system, msgs)
	if err == nil {
		c.rec.Cases[c.caseID][c.run] = append(c.rec.Cases[c.caseID][c.run], Turn{reply.Text, reply.ToolUseID, reply.Refused})
	}
	return reply, err
}
