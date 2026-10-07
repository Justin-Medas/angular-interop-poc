# Accessibility

Status: **v0.2**. The source of truth for SPEC §6.8 (NFR-A).

## 1. Standard
**WCAG 2.2 level AA** for every screen in the POC. Automated tools find only part of WCAG failures, so we combine them with keyboard E2E tests and a manual screen-reader pass, and the README says so plainly.

## 2. What runs where
| Check | Tool | Where | Blocking |
|---|---|---|---|
| Page scans (A2) | `@axe-core/playwright`, tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa` | every E2E state, both themes | yes: zero serious or critical violations |
| Component scans | `axe-core` in component tests (color-contrast rule off, since the test DOM has no layout) | `ng test` | yes |
| Contrast (A2) | token contrast test (design-tokens.md §7) | `ng test` | yes |
| Template lint (A7) | angular-eslint template accessibility rules (`alt-text`, `label-has-associated-control`, `click-events-have-key-events`, `interactive-supports-focus`, `valid-aria`, `role-has-required-aria`, `elements-content`) | `lint` job | yes |
| Keyboard (A3) | Playwright keyboard-only tests | E2E | yes |
| Visible focus (A3) | visual snapshot of focus states in the UI gallery | visual job | yes |
| Forced colors (A4) | Playwright `forcedColors: "active"`: axe scan plus one gallery snapshot | E2E + visual | yes |
| Reduced motion (A5) | Playwright `reducedMotion: "reduce"`: motion tokens resolve to `0ms`, grid cell flash off | E2E | yes |
| Screen readers (A8) | VoiceOver (macOS) and NVDA (Windows), demo flow in SPEC §4 | manual, `docs/a11y-report.md` | release check |

## 3. Automated scans in E2E
- A shared helper `expectNoA11yViolations(page)` runs after every meaningful state: page load, row selected, menu open, chart tab, each plan rendered, error card, config error screen.
- Each E2E spec runs in the dark theme; E2E-11 repeats the scans in light.
- Rules are never disabled globally. A per-element exclusion needs a code comment naming the reason and a DECISIONS entry.

## 4. Design rules
- **Color is never the only signal.** Price direction shows a sign (`+1.92`, `−8.11`) as well as the up or down color. Badges always contain text.
- **Focus** is always visible (`:focus-visible` ring from tokens, ≥ 3:1) and never hidden behind sticky headers (WCAG 2.4.11).
- **Target size** is at least 24×24 CSS px for every pointer target (WCAG 2.5.8). Grid rows are at least 28px tall.
- **Text** uses `rem` and survives 200% zoom without loss of content. The data grid scrolls in two dimensions, which WCAG's reflow rule allows for data tables.
- **Landmarks and headings:** the shell has `header`, `main` and a labeled command-bar `search` region. Each module starts with a heading. `/apps/*` pages have one `main` with an `h1`.
- **Forms:** the command bar has a visible label, and errors are linked with `aria-describedby`.
- **Model text** (rationale, reasons) renders as plain text through interpolation.

## 5. Component requirements
| Component | Requirement |
|---|---|
| `poc-data-table` (AG Grid) | Keep AG Grid's ARIA grid roles and keyboard navigation working through the wrapper. Arrow keys move between rows; Enter or Space selects (and so broadcasts, FR2). The wrapper's tests cover this |
| Row context menu (FR15) | Built on `@angular/cdk/menu`. Opens on right-click, Shift+F10 or the ContextMenu key; arrow keys move between items; Enter activates; Escape closes and returns focus to the row |
| `poc-tabs` (Detail) | WAI-ARIA tabs pattern: `tablist`/`tab`/`tabpanel`, arrow keys switch tabs, `aria-selected`. A `ViewChart` intent moves selection to the Chart tab without stealing focus from another app |
| `poc-line-chart` | SVG with `role="img"` and an `aria-label` summarizing it ("AAPL, 1 day: 226.58 to 228.50, up 0.85%"). A visually hidden data table offers the points. Lines use `currentColor` so forced-colors mode keeps them visible |
| Command bar + plan output (FR8, FR14) | Submit with Enter; the button is disabled with `aria-busy` while pending. The rationale goes into a polite `aria-live` region; focus moves to the first module's heading |
| Quote updates (FR1) | Ticking prices are **not** announced (no live region on the grid), because constant announcements make a screen reader unusable |
| Badges | Text plus `aria-label` where the visible text is abbreviated |
| Theme toggle | A real `button` with `aria-pressed`; its label names the theme it switches to |

## 6. Manual screen-reader pass
Before the demo recording, run the SPEC §4 flow with VoiceOver + Safari or Chrome on macOS and NVDA + Chrome on Windows. Record in `docs/a11y-report.md`: date, versions, each step's result, and any issue with its fix or reason it stays open. This is a quick check of the demo flow, not a full audit, and the report says so.
