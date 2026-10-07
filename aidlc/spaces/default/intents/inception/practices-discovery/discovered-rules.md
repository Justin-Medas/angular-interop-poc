# Discovered Rules

## Mandated

ALWAYS keep the pushed head of every branch green; a failing `test(...)` commit is allowed only below a green head

## Forbidden

NEVER add a line-level coverage-ignore comment; coverage exclusions are whole files listed in specs/testing.md §4 with a DECISIONS entry
NEVER lower a coverage threshold, add a coverage exclusion, or add a CI retry without a docs/DECISIONS.md entry
NEVER import one feature library from another or reach into a library's internals instead of its public API
NEVER use primitive tokens or raw color values in component styles
NEVER render agent output or other untrusted text with `[innerHTML]` or `bypassSecurityTrust*`
