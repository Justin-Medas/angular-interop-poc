---
name: implement-spec
description: Implement one area of the POC strictly from the specs, test-first. Use when starting work on an area such as "go-api", "agent", "evals", "interop", "blotter", "detail", "shell" or "ui-wrappers".
argument-hint: <area>
---

Implement the area named in the arguments: $ARGUMENTS

1. **Load the contract.** Read `CLAUDE.md`, `specs/SPEC.md`, `specs/testing.md`, and every spec file relevant to the area:
   - go-api → `specs/openapi.yaml`, `specs/mock-data.yaml`, `specs/appd.json`, SPEC §6.3
   - agent, evals → `specs/agent-tool-schema.json`, `specs/evals/cases.yaml`, `specs/mock-data.yaml`, `specs/openapi.yaml` (`/agent/select-module`), SPEC §7, `docs/DECISIONS.md` #3 and #13
   - interop, blotter, detail, shell → `specs/fdc3-contract.md`, `specs/runtime-config.schema.json`, `specs/accessibility.md` §5, SPEC §5 and §7.1
   - ui-wrappers, tokens → `specs/design-tokens.md`, `specs/accessibility.md`, `docs/DECISIONS.md` #7, #11 and #15, and the `poc-design-system` skill
   List the FR IDs from SPEC §5 this area satisfies. If the area is in the CLAUDE.md cut list, stop and say so.
2. **Find gaps.** If the spec is ambiguous or missing something you need, stop and propose a spec edit. Do not invent behavior in code.
3. **Tests first (red).** Write failing tests that trace to the spec, following `specs/testing.md` §10 naming, for example `TestGetQuote_FR3_UnknownSymbol404`, `it('FR2 broadcasts fdc3.instrument on row select')` or `test('E2E-3 FR15 …')`. Go API tests must validate responses against `specs/openapi.yaml`. UI work also gets the axe and keyboard checks from `specs/accessibility.md`. **Run them and show that they fail for the expected reason.** You may commit them as `test(<scope>): <FR> failing test …`; don't push until the head is green.
4. **Implement (green)** the smallest code that passes, following the conventions in CLAUDE.md (standalone components, signals, `inject()`, OnPush, wrappers only, interop only through `INTEROP`, semantic tokens only). Then refactor with the tests green.
5. **Run** the tests with coverage (`cd api && go test -covermode=atomic -coverprofile=cover.out ./... && node ../scripts/check-coverage.mjs`, `cd web && npx ng test --watch=false --coverage`) and any E2E specs for the FRs touched. Show the output. Coverage must stay at 100% outside the testing.md §4 exclusions.
6. **Update** `docs/PLAN.md` checkboxes. Record any non-obvious choice in `docs/DECISIONS.md`.
7. **Finish** with a 5-line summary: what was built, which FRs are covered, test result, open questions, and the one thing the user should be able to explain about this code in an interview.
