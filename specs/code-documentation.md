# Code Documentation Standard

Code here is written for the next engineer, not only for the author. A reader who has never seen the repo should learn **what** each file and symbol is, **why** it exists, and **which spec it serves** without running it. Requirement IDs: NFR-C1 to NFR-C5 (SPEC §6.9).

## 1. What every source file has (NFR-C1)
A header comment before the first statement, 1–4 lines:
- what the file is (its role in the system),
- why it exists or why it is shaped this way, when that is not obvious,
- the spec IDs it serves (FR, NFR, rule IDs) and any `DECISIONS #n` that explains a surprising choice.

## 2. What every exported symbol has (NFR-C2)
A doc comment on every exported class, function, interface, type, token, constant and Go identifier.
- Say what it is for and what a caller must know (side effects, ownership, units, ordering). Do not restate the signature.
- Components document their inputs, outputs and the user-visible behavior; services document their lifecycle.
- Go: the comment starts with the identifier name (`// Register mounts …`), and every package has a package comment.
- TypeScript: `/** … */`. `@param` and `@returns` are not required because types carry them; add them only when meaning is not in the name.

## 3. Inline comments explain why (NFR-C3)
- Comment non-obvious logic, workarounds, ordering constraints, and anything a spec or decision forced. Cite the ID (`// FR3: …`, `// DECISIONS #30`).
- Do not narrate what the next line does. If a comment only repeats the code, delete it or rename the code.
- No commented-out code. A `TODO` carries a rationale and an owner or spec ID.
- Comments are maintained with the code: changing behavior means updating its comment in the same commit.

## 4. Other file types (NFR-C4)
| Type | Requirement |
|---|---|
| `.ts`, `.mjs` | header (§1) and exported-symbol docs (§2) |
| `.go` | package comment, exported-identifier docs (§2), file header for files with logic |
| `.scss`, `.css` | header saying which component or token tier it styles and any non-obvious rule |
| `.yml` / `.yaml` (workflows, compose), `Dockerfile`, `.githooks/*` | header saying what it does and why it exists |
| `.html` templates | covered by the component's doc comment; comment only non-obvious bindings or a11y choices |
| `.json` | no comments possible; the owning doc or decision explains it |
| tests (`*.spec.ts`, `*_test.go`, `*.e2e.ts`) | exempt from headers; test names carry the spec ID (testing.md §10) |

## 5. Enforcement (NFR-C5)
All of it runs in the blocking `lint` job (testing.md §8):
- **TypeScript and `.mjs`:** `eslint-plugin-jsdoc` requires a doc comment with a description on exported symbols.
- **Go:** `revive` (pinned, run with `go run`, no global install) with the `exported` and `package-comments` rules.
- **File headers for every type in §4 except `.html`/`.json`:** `scripts/check-comments.mjs`, a cross-platform Node script with its own tests.
- Quality of the prose (is it useful?) is a review check: the `spec-reviewer` agent and PR reviewers flag comments that restate code or are stale.
