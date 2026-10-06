---
name: explain
description: Interview prep. Walks the user through a file or feature as they'd be expected to explain it live, then quizzes them. Use when the user says "explain", "walk me through", "quiz me", or "interview prep".
argument-hint: <file or feature>
---

The user will be asked to walk through this code in an interview where 30–40% of the role is hands-on Angular. Target: $ARGUMENTS

1. Read the target and its direct dependencies.
2. Explain it top-down in under 300 words, as the user should say it out loud:
   - What it does and why it exists (link to the spec FR).
   - The Angular mechanisms it uses, and **why** each one: standalone component, `signal`/`computed`/`input()`/`output()`, `inject()` with `InjectionToken`, OnPush, `toSignal`, `@for ... track`, lazy `loadComponent`. For Go, cover handler shape, contract tests, and how the fallback works.
   - The seam it sits behind (InteropService, ui wrappers) and what swapping it would take.
3. List 3 likely follow-up questions an interviewer would ask about this code, with a crisp answer for each. Include one "what would you change for production?" question.
4. Then quiz the user: ask one question at a time and wait for their answer. Give feedback before the next question. Stop after 3 questions or when the user says stop.

Do not change code in this skill.
