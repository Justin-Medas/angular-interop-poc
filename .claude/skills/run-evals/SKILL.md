---
name: run-evals
description: Run the agent eval suite in specs/evals/cases.yaml (live, replay or fallback mode) and write docs/eval-report.md. Use when the user asks for the pass rate, wants to check a prompt change, or is preparing the demo.
---

The runner calls `internal/agent` in-process (specs/testing.md §7). Modes: `fallback` (no model, deterministic), `replay` (recorded model responses, deterministic, free), `live` (real Claude).

1. Pick the mode. Default to `replay` for a quick check. Use `live` after a prompt, schema, mock-data or case change, or for the demo report.
2. For `live`: confirm `ANTHROPIC_API_KEY` is set, and say the request count before running (22 model cases × `runs_per_case` = 66 requests).
3. Run `cd api && go run ./evals -cases ../specs/evals/cases.yaml -mode <mode> -out ../docs/eval-report.md`. Add `-record` to a passing `live` run to refresh `api/evals/recordings/`.
4. Summarize: the model pass rate against the threshold, the fallback pass rate (must be 100%), p95 latency, each failing case with expected and actual values, and whether any failure is nondeterministic (passed on some runs, failed on others).
5. When a case fails, propose the smallest fix: prompt wording, a schema description, or a spec or eval change if the expectation itself is wrong. **Never** edit `cases.yaml` expectations just to make a case pass without the user's agreement.
