# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Seeded 2026-10-06 from the pre-AI-DLC planning session. Source documents:
> root `CLAUDE.md`, `specs/`, `docs/PLAN.md`, `docs/DECISIONS.md`.

## Way of Working

- `specs/` holds the contracts and is the source of truth: `SPEC.md`, `openapi.yaml`, `fdc3-contract.md`, `agent-tool-schema.json`, `evals/cases.yaml`. AI-DLC requirements and design artifacts must reference these files instead of restating them. When a stage would change a contract, it edits the file in `specs/` and records the change in `docs/DECISIONS.md`.
- This is a two-day interview POC (see `docs/PLAN.md`). The author must explain every file live, so prefer small, readable code over abstraction.
- The project skills `/implement-spec`, `/spec-check`, `/run-evals` and `/explain` remain available inside Code Generation and Build & Test.

## Walking Skeleton

- The skeleton must cover all three tiers end to end: Go `/healthz` → Angular shell → one lazy-loaded micro-app, plus `InMemoryInteropService` delivering one `fdc3.instrument` broadcast between two tabs.

## Testing Posture

- Tests trace to spec IDs. Test names include the FR ID (SPEC §5) or the schema path.
- Go handler tests validate real responses against `specs/openapi.yaml` (contract tests).
- Agent quality is measured by `specs/evals/cases.yaml` (≥ 90% pass, 3 runs per case, deterministic grading, no LLM judge).

## Guard Policy

relaxed

## Deployment

- Local only. There is no deployment target, and the Operation phase is out of scope.

## Code Style

- Angular: standalone components, signals (`signal`, `computed`, `input()`, `output()`), `inject()`, OnPush, `@if`/`@for` control flow, and lazy `loadComponent`. Follow the `angular-developer` skill.
- Go: standard library `net/http` with method+pattern routing. No web framework.

## Tech Stack

- Angular 22.x (Node 26 installed), PrimeNG 22.x behind `projects/ui` wrappers (license pending, DECISIONS #1), `@finos/fdc3` 2.2.3, FINOS FDC3 Sail v2 (browser) as the Desktop Agent, Go 1.27, anthropic-sdk-go with model `claude-opus-5-5`.

## Decided

DECIDED: Desktop Agent is FINOS FDC3 Sail v2 in the browser; InMemoryInteropService (BroadcastChannel) is the fallback (pre-AI-DLC planning, 2026-10-06)
DECIDED: Agent returns JSON validated against specs/agent-tool-schema.json via structured outputs; forced tool_choice is not used because Opus 5.5 rejects it (pre-AI-DLC planning, 2026-10-06)
DECIDED: OpenFin is described as an adapter swap and is never run (pre-AI-DLC planning, 2026-10-06)
DECIDED: Cut list is auth, real market data, mobile, OpenFin runtime, persistence, mixed UI libraries (pre-AI-DLC planning, 2026-10-06)

## Scope Overrides

- Use the `poc` scope. The contract design that `poc` skips already exists in `specs/`.

## Forbidden

NEVER import primeng/* outside web/projects/ui (affirmed 2026-10-06)
NEVER call window.fdc3 or import @finos/fdc3 outside web/projects/interop (affirmed 2026-10-06)
NEVER claim OpenFin or any commercial container was run (affirmed 2026-10-06)
NEVER commit ANTHROPIC_API_KEY or any .env file (affirmed 2026-10-06)

## Mandated

ALWAYS validate agent output against specs/agent-tool-schema.json and fall back deterministically on failure (affirmed 2026-10-06)
ALWAYS change specs/ before changing behavior that contradicts them (affirmed 2026-10-06)

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
