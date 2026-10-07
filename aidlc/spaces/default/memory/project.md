# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Seeded 2026-10-06 from the pre-AI-DLC planning session. Source documents:
> root `CLAUDE.md`, `specs/`, `docs/PLAN.md`, `docs/DECISIONS.md`.

## Way of Working

- `specs/` holds the contracts and is the source of truth: `SPEC.md`, `openapi.yaml`, `fdc3-contract.md`, `agent-tool-schema.json`, `mock-data.yaml`, `appd.json`, `runtime-config.schema.json`, `evals/cases.yaml`, `testing.md`, `design-tokens.md`, `accessibility.md`. AI-DLC requirements and design artifacts must reference these files instead of restating them. When a stage would change a contract, it edits the file in `specs/` and records the change in `docs/DECISIONS.md`.
- This is a two-day interview POC (see `docs/PLAN.md`). The author must explain every file live, so prefer small, readable code over abstraction.
- The project skills `/implement-spec`, `/spec-check`, `/run-evals` and `/explain` remain available inside Code Generation and Build & Test.
- **The GitHub repo is part of the deliverable.** The commit history is context for future agents and for reviewers, so it must read as a clear story.
  - All work happens on a short-lived feature branch named `<type>/<short-slug>` (`feat/`, `fix/`, `chore/`, `docs/`, `test/`). A Construction Bolt or Unit uses its slug, for example `feat/go-quotes-api`.
  - Commit often: at every green test run and at every completed checklist item, not only at stage end. Use Conventional Commits (`feat(api): add GET /quotes contract test`). TDD makes the red step visible: a failing `test(...)` commit may precede its implementation, but the pushed head of a branch is always green (specs/testing.md §2).
  - Every branch lands through a pull request (`gh pr create`). The PR body links the FR IDs and spec files it implements, and includes the test output. Merge with squash (`gh pr merge --squash --delete-branch`) only after CI is green **and** the human approves the merge.
- **"It just works" from a fresh clone on macOS, Linux and Windows** is a deliverable, not polish.
  - Primary quickstart: `git clone … && cd angular-interop-poc && docker compose up` with Docker as the only host dependency.
  - Secondary quickstart: open in a Dev Container or GitHub Codespaces.
  - Native path: `npm run setup && npm start` with only Node and Go installed.
  - Every toolchain is pinned: Node through `engines`/`devEngines` in `package.json` and `.nvmrc`, Go through the `toolchain` directive in `go.mod`, npm dependencies through `package-lock.json` with `npm ci`, and FDC3 Sail through a pinned commit SHA in `scripts/setup-sail.mjs`.
  - Repo scripts are cross-platform Node (`.mjs`), not bash. Git hooks are the only shell scripts, because Git for Windows runs them through its bundled `sh`.

## Walking Skeleton

- The skeleton must cover all three tiers end to end: Go `/healthz` → Angular shell → one lazy-loaded micro-app, plus `InMemoryInteropService` delivering one `fdc3.instrument` broadcast between two tabs.

## Testing Posture

- `specs/testing.md` is the test strategy; follow it rather than restating it.
- TDD: a failing test exists before the code that makes it pass.
- Coverage 100% (TypeScript lines/branches/functions/statements, Go statements) outside the whole-file exclusions in specs/testing.md §4. No line-level ignore comments.
- Playwright E2E (ubuntu + windows), visual tests in one pinned Linux container, and axe scans run in CI. Accessibility target is WCAG 2.2 AA (`specs/accessibility.md`).
- Tests trace to spec IDs. Test names include the FR ID (SPEC §5), rule ID (F1–F7, S1–S8) or the schema path.
- Go handler tests validate real responses against `specs/openapi.yaml` (contract tests).
- Agent quality is measured by `specs/evals/cases.yaml` (model cases ≥ 90%, fallback cases 100%, 3 runs per case, deterministic grading, no LLM judge).

## Guard Policy

relaxed

## Deployment

- Local only. There is no deployment target, and the Operation phase is out of scope.

## Code Style

- Angular: standalone components, signals (`signal`, `computed`, `input()`, `output()`), `inject()`, OnPush, `@if`/`@for` control flow, and lazy `loadComponent`. Follow the `angular-developer` skill.
- Go: standard library `net/http` with method+pattern routing. No web framework.

## Tech Stack

- Angular 22.x (Node 26 installed), one application plus libraries (DECISIONS #10), AG Grid Community 36.x behind the `projects/ui` `poc-data-table` wrapper plus our own token-based components (DECISIONS #7, #11), Playwright with `@axe-core/playwright`, Stylelint, runtime `config.json` (DECISIONS #8), `@finos/fdc3` 2.2.3, FINOS FDC3 Sail v2 (browser) as the Desktop Agent, Go 1.27, anthropic-sdk-go with the model from `AGENT_MODEL` (default `claude-sonnet-5-5`, opt-in `claude-opus-5-5`; DECISIONS #20).

## Decided

DECIDED: Desktop Agent is FINOS FDC3 Sail v2 in the browser; InMemoryInteropService (BroadcastChannel) is the fallback (pre-AI-DLC planning, 2026-10-06)
DECIDED: Agent returns JSON validated against specs/agent-tool-schema.json via structured outputs; forced tool_choice is not used because Opus 5.5 rejects it (pre-AI-DLC planning, 2026-10-06)
DECIDED: Agent model is configurable through AGENT_MODEL; claude-sonnet-5-5 is the default for all tests and development eval runs, claude-opus-5-5 is opt-in (DECISIONS #20, 2026-10-07)
DECIDED: OpenFin is described as an adapter swap and is never run (pre-AI-DLC planning, 2026-10-06)
DECIDED: Cut list is auth, real market data, mobile, OpenFin runtime, persistence, mixed UI libraries (pre-AI-DLC planning, 2026-10-06)
DECIDED: UI is AG Grid Community for the grid plus our own token-based components; PrimeNG dropped (DECISIONS #7, 2026-10-06)
DECIDED: Environment config comes from a runtime config.json validated against specs/runtime-config.schema.json (DECISIONS #8, 2026-10-06)
DECIDED: Backend stays Go only; no Python service (DECISIONS #9, 2026-10-07)
DECIDED: One Angular application with library micro-apps; Sail opens /apps/* routes; no Module Federation (DECISIONS #10, 2026-10-07)
DECIDED: Row menu on @angular/cdk/menu and an own SVG line chart; no AG Grid Enterprise, no chart library (DECISIONS #11, 2026-10-07)
DECIDED: Agent returns a WorkspacePlan (1-3 modules, opt-in fdc3Action) and may call one read-only tool (DECISIONS #13, 2026-10-07)
DECIDED: TDD, 100% coverage with whole-file exclusions, Playwright E2E + visual + axe in CI (DECISIONS #14, 2026-10-07)
DECIDED: Three-tier design tokens with dark (default) and light themes; WCAG 2.2 AA (DECISIONS #15, #16, 2026-10-07)

## Scope Overrides

- Use the `poc` scope. The contract design that `poc` skips already exists in `specs/`.

## Forbidden

NEVER import ag-grid-* outside web/projects/ui (affirmed 2026-10-06)
NEVER add a second UI component library; build non-grid components in web/projects/ui from design tokens (affirmed 2026-10-06)
NEVER implement login or token handling; the auth block in config.json is a reserved seam with enabled=false (affirmed 2026-10-06)
NEVER call window.fdc3 or import @finos/fdc3 outside web/projects/interop (affirmed 2026-10-06)
NEVER claim OpenFin or any commercial container was run (affirmed 2026-10-06)
NEVER commit ANTHROPIC_API_KEY or any .env file (affirmed 2026-10-06)
NEVER commit or push directly to main after the bootstrap commit; all changes land through a feature branch and pull request (affirmed 2026-10-06)
NEVER merge a pull request without explicit human approval in chat (affirmed 2026-10-06)
NEVER force-push to main or rewrite published history on main (affirmed 2026-10-06)
NEVER add a setup step that only works on one OS, or that depends on a tool installed globally outside the documented prerequisites (affirmed 2026-10-06)

NEVER add a line-level coverage-ignore comment; coverage exclusions are whole files listed in specs/testing.md §4 with a DECISIONS entry (affirmed 2026-10-07)

NEVER lower a coverage threshold, add a coverage exclusion, or add a CI retry without a docs/DECISIONS.md entry (affirmed 2026-10-07)

NEVER import one feature library from another or reach into a library's internals instead of its public API (affirmed 2026-10-07)

NEVER use primitive tokens or raw color values in component styles (affirmed 2026-10-07)

NEVER render agent output or other untrusted text with `[innerHTML]` or `bypassSecurityTrust*` (affirmed 2026-10-07)

## Mandated

ALWAYS validate agent output against specs/agent-tool-schema.json and fall back deterministically on failure (affirmed 2026-10-06)
ALWAYS change specs/ before changing behavior that contradicts them (affirmed 2026-10-06)
ALWAYS commit with a Conventional Commit message at every green test run, and push the feature branch (affirmed 2026-10-06)
ALWAYS open a pull request per Bolt or Unit that links its FR IDs and spec files and includes test output (affirmed 2026-10-06)
ALWAYS keep the fresh-clone quickstarts in README working; a PR that changes setup must show the GitHub Actions OS matrix passing (affirmed 2026-10-06)

ALWAYS keep the pushed head of every branch green; a failing `test(...)` commit is allowed only below a green head (affirmed 2026-10-07)

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
