---
name: spec-check
description: Check the implementation against specs/ for drift. Use after implementing an area, before a commit, or before the demo.
---

Delegate to the `spec-reviewer` agent with this brief: "Audit the current code against specs/ and report drift." Include in the brief any area the user named: $ARGUMENTS

When it returns, show the user its findings table as-is. For each finding, ask whether to fix the code or amend the spec. Specs win by default, but the user decides.
