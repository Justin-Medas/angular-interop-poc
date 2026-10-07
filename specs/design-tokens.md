# Design Tokens and Theming

Status: **v0.2**. The source of truth for SPEC §6.7 (NFR-DS). `web/projects/ui/src/styles/tokens.css` implements this file. If they disagree, `tokens.css` is wrong.

## 1. Why tokens
Every color, size and duration in the UI comes from a CSS custom property defined in one file. That gives three things this POC demonstrates:
- **Theming.** Dark and light are two definitions of the same semantic tokens.
- **Rebranding.** Changing the brand means changing the primitive layer only.
- **One look for two worlds.** The AG Grid theme and our own components read the same tokens, so they can't drift apart (§6).

## 2. Three tiers
| Tier | Example | Who may use it |
|---|---|---|
| **Primitive**: raw values, named by hue and step | `--poc-brand-green-600`, `--poc-neutral-900` | Only the semantic layer in `tokens.css` |
| **Semantic**: named by purpose | `--poc-color-surface`, `--poc-color-up` | Components, the grid theme |
| **Component** (optional): one component's knob, defined from semantic tokens | `--poc-button-bg: var(--poc-color-accent)` | That component only |

Rule NFR-DS1: component styles use semantic or component tokens only. Primitives and raw values appear nowhere outside `tokens.css`.

Naming: `--poc-<category>-<role>[-<variant>]`, kebab-case. Categories: `color`, `space`, `radius`, `font`, `text`, `motion`, `shadow`, `focus`.

## 3. Primitives
The brand palette is a green primary with warm neutrals and blue links. Light-theme values were chosen first; dark-theme values are lighter tints picked to meet the same contrast minimums.

| Token | Value | Notes |
|---|---|---|
| `--poc-brand-green-50` | `#E8F1E5` | light selected row |
| `--poc-brand-green-400` | `#5DBB4C` | dark-theme gain and accent text |
| `--poc-brand-green-600` | `#368727` | **brand green: fills only** (primary button, header bar). Never text on the page background (4.22:1 fails) |
| `--poc-brand-green-800` | `#1E6F1D` | light-theme gain and accent text; accent hover fill |
| `--poc-brand-green-900` | `#1F331C` | dark selected row |
| `--poc-brand-red-400` | `#FF6B66` | dark-theme loss |
| `--poc-brand-red-700` | `#C31212` | light-theme loss |
| `--poc-brand-blue-300` | `#6AB3EA` | dark-theme link and focus |
| `--poc-brand-blue-600` | `#0E67A9` | light-theme link |
| `--poc-brand-navy-800` | `#1D3986` | light-theme focus ring |
| `--poc-neutral-0` | `#FFFFFF` | |
| `--poc-neutral-50` | `#F9F7F5` | warm off-white page |
| `--poc-neutral-100` | `#F2F0ED` | light hover |
| `--poc-neutral-200` | `#E6E4E1` | light divider (decorative) |
| `--poc-neutral-300` | `#B8B5B1` | dark muted text |
| `--poc-neutral-400` | `#8A8784` | dark control border |
| `--poc-neutral-500` | `#767676` | light control border |
| `--poc-neutral-700` | `#525150` | light muted text |
| `--poc-neutral-750` | `#3D3B39` | dark divider (decorative) |
| `--poc-neutral-800` | `#2A2928` | dark raised surface |
| `--poc-neutral-850` | `#262524` | dark hover |
| `--poc-neutral-900` | `#1E1D1C` | dark surface |
| `--poc-neutral-950` | `#141414` | light text, dark page |

## 4. Semantic colors
| Token | Light | Dark | Use |
|---|---|---|---|
| `--poc-color-bg` | neutral-50 | neutral-950 | page |
| `--poc-color-surface` | neutral-0 | neutral-900 | cards, grid body |
| `--poc-color-surface-raised` | neutral-0 | neutral-800 | menus, popovers |
| `--poc-color-surface-hover` | neutral-100 | neutral-850 | hovered row or item |
| `--poc-color-surface-selected` | brand-green-50 | brand-green-900 | selected row |
| `--poc-color-text` | neutral-950 | neutral-50 | body text |
| `--poc-color-text-muted` | neutral-700 | neutral-300 | secondary text |
| `--poc-color-border` | neutral-200 | neutral-750 | decorative dividers only |
| `--poc-color-border-control` | neutral-500 | neutral-400 | input and button outlines (must meet 3:1) |
| `--poc-color-link` | brand-blue-600 | brand-blue-300 | links |
| `--poc-color-accent` | brand-green-600 | brand-green-600 | primary action fill, header bar |
| `--poc-color-accent-hover` | brand-green-800 | brand-green-800 | primary action hover fill |
| `--poc-color-on-accent` | neutral-0 | neutral-0 | text on accent fills |
| `--poc-color-accent-text` | brand-green-800 | brand-green-400 | accent used as text or icon |
| `--poc-color-up` | brand-green-800 | brand-green-400 | price gain (always with `+`) |
| `--poc-color-down` | brand-red-700 | brand-red-400 | price loss (always with `−`) |
| `--poc-color-danger` | brand-red-700 | brand-red-400 | error card text and border |
| `--poc-color-focus` | brand-navy-800 | brand-blue-300 | focus ring |

**Brand vs. direction.** Green means "up" in a trading UI, so the brand green (`accent`) is kept to fills and chrome, and gains use the separate `--poc-color-up`. Direction is never shown by color alone (accessibility.md §4).

**Verified contrast** (worst case across `bg`, `surface`, `surface-raised`, `surface-hover` and `surface-selected`; the §7 test re-checks the full matrix):
| Pair | Minimum | Light | Dark |
|---|---|---|---|
| text | 4.5 | 15.92 | 12.69 |
| text-muted | 4.5 | 6.84 | 6.64 |
| link | 4.5 | 5.14 | 5.97 |
| accent-text, up | 4.5 | 5.42 | 5.60 |
| down, danger | 4.5 | 5.31 | 4.87 |
| on-accent on accent / accent-hover | 4.5 | 4.51 / 6.27 | 4.51 / 6.27 |
| border-control (UI component) | 3.0 | 4.25 | 4.07 |
| focus ring (UI component) | 3.0 | 9.92 | 6.40 |

## 5. Type, space, shape, motion
- **Font:** `--poc-font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` (no web fonts to license or load). `--poc-font-mono: ui-monospace, "SF Mono", Consolas, monospace`.
- **Numbers:** every numeric cell and price uses `font-variant-numeric: tabular-nums` and is right-aligned.
- **Text sizes:** `--poc-text-xs: 0.75rem`, `--poc-text-sm: 0.875rem` (grid), `--poc-text-md: 1rem` (body), `--poc-text-lg: 1.25rem`, `--poc-text-xl: 1.5rem`. Sizes are in `rem` so browser zoom and text resizing work.
- **Space** (4px base): `--poc-space-1: 0.25rem`, `-2: 0.5rem`, `-3: 0.75rem`, `-4: 1rem`, `-6: 1.5rem`, `-8: 2rem`.
- **Radius:** `--poc-radius-sm: 4px` (inputs, cards), `--poc-radius-pill: 999px` (buttons and badges are pills).
- **Shadow:** `--poc-shadow-raised` for menus only.
- **Motion:** `--poc-motion-fast: 120ms`, `--poc-motion-base: 200ms`. Under `prefers-reduced-motion: reduce`, both are `0ms` and grid cell flash is off.
- **Focus:** `--poc-focus-ring: 2px solid var(--poc-color-focus)` with `--poc-focus-offset: 2px`, applied with `:focus-visible`.

## 6. Theming mechanics and the grid
- `tokens.css` defines primitives on `:root`, light semantics under `[data-theme="light"]` and dark semantics under `:root, [data-theme="dark"]` (dark is the default).
- The shell sets `data-theme` on `<html>` from runtime config (`theme`) and the toggle (FR11). Nothing else changes when the theme changes.
- **AG Grid** uses its Theming API (`themeQuartz.withParams`) with every color parameter set to a `var(--poc-color-…)` reference, so a theme switch re-skins the grid with no grid code:

| AG Grid parameter | Token |
|---|---|
| `backgroundColor` | `--poc-color-surface` |
| `foregroundColor` | `--poc-color-text` |
| `headerBackgroundColor` | `--poc-color-bg` |
| `headerTextColor` | `--poc-color-text-muted` |
| `borderColor` | `--poc-color-border` |
| `rowHoverColor` | `--poc-color-surface-hover` |
| `selectedRowBackgroundColor` | `--poc-color-surface-selected` |
| `accentColor` | `--poc-color-accent` |
| `rangeSelectionBorderColor` | `--poc-color-focus` |
| `fontFamily` | `--poc-font-sans` |
| `fontSize` | `--poc-text-sm` |
| `spacing` | `--poc-space-1` |

Exact parameter names are checked against the installed AG Grid version when the wrapper is built; the mapping intent above doesn't change.

## 7. Enforcement (all blocking in CI)
- **Stylelint** (pinned devDependency): `color-no-hex`, `color-named: "never"`, and `function-disallowed-list: [rgb, rgba, hsl, hsla]` everywhere except `tokens.css`. A custom-property pattern allows only `--poc-*` names.
- **Contrast unit test:** parses `tokens.css`, resolves each theme's semantic tokens to hex, and checks every pair in §4's matrix against its minimum. Adding a semantic color means adding its pairs to the test.
- **Visual tests:** the `/dev/ui-gallery` route renders every `projects/ui` component in dark, light and forced-colors mode (testing.md §6).
- **Rebrand check:** changing only primitive values must not require editing any component file. The `spec-reviewer` agent checks this when the palette changes.
