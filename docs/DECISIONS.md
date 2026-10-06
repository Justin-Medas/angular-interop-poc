# Decision Log

Format: context → decision → consequences. Add entries; don't rewrite history.

## #1 UI library: PrimeNG 22, behind wrappers (OPEN: license)
- **Context:** PrimeNG 22.1.x matches Angular 22 (peer `@angular/core ^22.1.0`). In June 2026 PrimeFaces moved development to "PrimeUI". The old GitHub repo says it gets security fixes only and that "existing MIT versions remain MIT". The npm package for 22.x and 21.x now declares `"SEE LICENSE IN LICENSE.md"` and points at a different repo (`primeng-nextchapter`).
- **Action before installing:** read `node_modules/primeng/LICENSE.md` after a trial install. If it is free for non-commercial or demo use, proceed. If it is not:
  - **Option A:** pin the last MIT-licensed PrimeNG release (find the matching Angular major and accept an older Angular).
  - **Option B:** Angular Material + CDK table (first-party, MIT, always version-matched).
- **Why wrappers either way:** feature code imports `projects/ui` only, so swapping libraries touches one folder. This is the design-system talking point.

## #2 Desktop Agent: FDC3 Sail v2 (browser), with in-memory fallback
- **Context:** `@finos/fdc3` ships no Desktop Agent. The older `finos/electron-fdc3` repo is stale. `finos/FDC3-Sail` v2 is a browser-based ground-up rewrite on the FDC3 2.2 "for the web" standard. Electron support has been removed, and the project says it is not production-ready.
- **Decision:** target Sail v2 through `getAgent()`. Build `InMemoryInteropService` (BroadcastChannel) first so the demo never depends on Sail working.
- **Honesty line:** "Runs against FINOS Sail. OpenFin, io.Connect and others are an adapter swap behind `InteropService`. I did not run OpenFin."

## #3 Agent output: structured outputs, not forced tool_choice
- **Context:** `claude-opus-5-5` rejects forced `tool_choice` (`any` or `tool`) with a 400. Thinking can't be disabled, and `effort` defaults to `medium`.
- **Decision:** use `output_config.format` (JSON schema from `specs/agent-tool-schema.json`) and set `effort: "low"` explicitly for a routing task. Validate server-side anyway, and fall back deterministically on any failure.
- **Check on Day 2:** confirm structured outputs accept the nullable-enum payload shape. If not, simplify the schema (for example, make payload fields optional) and update the spec first.

## #4 Evals: deterministic grading, N=3 runs per case
- **Decision:** grade with exact checks on module and payload keys, not an LLM judge. Run each case 3 times so nondeterminism shows up as a per-case rate rather than hiding behind one lucky run.

## #5 AI tooling: AI-DLC for process, Angular skills + MCP for framework, local skills for project rules
- **Context:** The user wants the planning recommendations run through a phase-gated AI-DLC workflow, with official Angular guidance and tools.
- **Decision:** Use AI-DLC 2.10 (`aidlc config --harness claude`) with the `poc` scope. The specs in `specs/` stay the source of truth and are referenced from `aidlc/spaces/default/memory/project.md`. The planning chat is onboarded as a knowledge document. The official `angular/skills` are installed as project copies. The Angular CLI MCP server is pinned to `@angular/cli@22` in `.mcp.json`. Design-system rules live in the `poc-design-system` skill.
- **Consequences:** AI-DLC owns `.claude/settings.json` and `.claude/CLAUDE.md`, so our permissions moved to `.claude/settings.local.json`. AI-DLC requires `display_name` frontmatter on every agent in `.claude/agents/`. `~/.local/bin` was added to `~/.zprofile` so hooks can find `aidlc`.

## #6 Git workflow and fresh-clone reproducibility as deliverables
- **Context:** Advice from an engineer friend: link to GitHub, commit often, use feature branches and PRs as a rule, treat the repo and its history as part of the project (good context for future agents), and make the take-home "just work" from a fresh clone on Mac, PC and Linux.
- **Decision:**
  - Private repo `angular-interop-poc`. One bootstrap commit on `main`; afterwards every change goes through `<type>/<slug>` branches, Conventional Commits and a squash-merged PR approved by the human. This is enforced three ways: AI-DLC project rules, a `.githooks/pre-push` hook installed by `npm run setup`, and Claude Code deny rules.
  - Reproducibility ladder: `docker compose up` (Docker only) → Dev Container/Codespaces → native `npm run setup && npm start`. Python's venv doesn't apply to a Node and Go stack. The equivalents are lockfiles plus `npm ci`, the Go `toolchain` directive (Go fetches the pinned toolchain itself), the `devEngines` and `.nvmrc` Node pins, and Sail pinned by commit SHA inside `.sail/` instead of a hand-cloned sibling folder.
  - Repo scripts are Node `.mjs` rather than bash so they run on Windows. `.gitattributes` forces LF line endings.
- **Alternatives rejected:** a Makefile (not native on Windows); mise or asdf for toolchains (adds a global tool reviewers must install); a git submodule for Sail (fragile UX on clone, and it still needs an install and build step).
- **Consequences:** the `fresh-clone` CI runs on macOS and Windows runners, which bill private-repo minutes at 10× and 2× on GitHub Free (2,000 min/month). Keep the job lean and cancel superseded runs. Branch protection on private repos needs GitHub Pro, so on Free the pre-push hook and agent rules are the guardrail.
