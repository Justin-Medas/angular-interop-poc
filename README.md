# Angular Interop POC

Angular 22 shell + two FDC3 micro-apps (Blotter → Detail), a contract-first Go API, and a Claude-backed endpoint that picks which UI module to load, with a deterministic fallback and a pass-rate eval.

> Status: in progress (API and workspace scaffolding landed; UI and agent next). See `docs/PLAN.md`.

## Quickstart
Pick one. Each works from a fresh clone on macOS, Linux and Windows.

**Docker** (only Docker required). Available once the services land; see docs/PLAN.md.
```bash
docker compose up
```

**Dev Container / Codespaces.** Open the repo in a Codespace, or choose "Reopen in Container" in VS Code.

**Native** (Node per `.nvmrc`, Go ≥ 1.24):
```bash
npm run setup     # checks toolchain, installs git hooks, fetches + builds FDC3 Sail at a pinned commit
npm start         # Go API :8080, Angular shell :4200, and Sail :8090 if installed (Ctrl+C stops all)
npm test          # Go unit tests, then Angular unit tests
```

Put `ANTHROPIC_API_KEY` in a repo-root `.env` (gitignored) to enable the live agent; without it the deterministic fallback answers.

## Contributing
Feature branch → Conventional Commits → PR → squash merge. Direct pushes to `main` are blocked by `.githooks/pre-push`, which `npm run setup` installs.

## Honest limitations
- Market data is mock. No auth.
- Interop runs against FINOS FDC3 Sail (browser, not production-ready) or an in-memory BroadcastChannel adapter. OpenFin and other containers are an adapter swap behind `InteropService`; **they were not run**.

_Architecture diagram: TODO (Day 2 PM)._
