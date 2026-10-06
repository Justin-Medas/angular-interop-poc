---
name: run-evals
description: Run the agent eval suite in specs/evals/cases.yaml against the running Go API and write docs/eval-report.md. Use when the user asks for the pass rate, wants to check a prompt change, or is preparing the demo.
---

1. Confirm the API is reachable: `curl -sf localhost:8080/healthz`. If it isn't, tell the user how to start it and stop.
2. Note that every run calls Claude (15 cases × `runs_per_case` requests). Say the request count before running.
3. Run `cd api && go run ./evals -cases ../specs/evals/cases.yaml -out ../docs/eval-report.md`.
4. Summarize: overall pass rate against the threshold, each failing case with expected and actual values, and whether any failure is nondeterministic (passed on some runs, failed on others).
5. When a case fails, propose the smallest fix: prompt wording, a schema description, or a spec or eval change if the expectation itself is wrong. **Never** edit `cases.yaml` expectations just to make a case pass without the user's agreement.
