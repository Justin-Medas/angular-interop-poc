---
name: implement-spec
description: Implement one area of the POC strictly from the specs, test-first. Use when starting work on an area such as "go-api", "agent", "evals", "interop", "blotter", "detail", "shell" or "ui-wrappers".
argument-hint: <area>
---

Implement the area named in the arguments: $ARGUMENTS

1. **Load the contract.** Read `CLAUDE.md`, `specs/SPEC.md`, and every spec file relevant to the area:
   - go-api → `specs/openapi.yaml`
   - agent, evals → `specs/agent-tool-schema.json`, `specs/evals/cases.yaml`, `specs/openapi.yaml` (`/agent/select-module`), `docs/DECISIONS.md` #3
   - interop, blotter, detail, shell → `specs/fdc3-contract.md`, SPEC §5 and §7
   - ui-wrappers → `docs/DECISIONS.md` #1
   List the FR IDs from SPEC §5 this area satisfies. If the area is in the CLAUDE.md cut list, stop and say so.
2. **Find gaps.** If the spec is ambiguous or missing something you need, stop and propose a spec edit. Do not invent behavior in code.
3. **Tests first.** Write failing tests that trace to the spec. Name each test with the FR ID or schema path it covers, for example `TestGetQuote_FR3_404UnknownSymbol` or `it('FR2 broadcasts fdc3.instrument on row select')`. Go API tests must validate responses against `specs/openapi.yaml`.
4. **Implement** the smallest code that passes, following the conventions in CLAUDE.md (standalone components, signals, `inject()`, OnPush, wrappers only, interop only through `INTEROP`).
5. **Run** the tests (`cd api && go test ./...` or `cd web && npx ng test --watch=false`) and show the output.
6. **Update** `docs/PLAN.md` checkboxes. Record any non-obvious choice in `docs/DECISIONS.md`.
7. **Finish** with a 5-line summary: what was built, which FRs are covered, test result, open questions, and the one thing the user should be able to explain about this code in an interview.
