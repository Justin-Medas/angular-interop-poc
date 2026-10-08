---
name: poc-design-system
description: Design-system rules for this POC's Angular UI. Use whenever creating or editing a component template, styles, or anything under web/projects/ui, or when choosing a UI component for a feature.
---

# POC design system

The design system is the swappable seam. Feature apps (`shell`, `blotter`, `detail`) never know what's underneath. The contracts are `specs/design-tokens.md` (tokens, themes, grid mapping) and `specs/accessibility.md` (WCAG 2.2 AA); this skill is the how-to. See `docs/DECISIONS.md` #7, #11, #15 and #16.

## What's in `web/projects/ui`
- **Design tokens.** CSS custom properties in `src/styles/tokens.css`, in three tiers (primitive → semantic → component). Components use **semantic or component tokens only**. Dark is the default theme; light is `[data-theme="light"]`.
- **Our own components**, built only from tokens: `PocButton`, `PocCard`, `PocBadge`, `PocTabs`, `PocCommandBar`, `PocLineChart` (SVG), and the row context menu on `@angular/cdk/menu`. `@angular/cdk` may be used for accessibility primitives (focus, keyboard navigation, overlay, menu).
- **`/dev/ui-gallery`** renders every component; visual tests snapshot it in dark, light and forced-colors mode.
- **One third-party wrapper:** `PocDataTable` wraps AG Grid Community (`ag-grid-angular` 36.x). There is no other UI library, ever.

## The wrapper rule
- Only `web/projects/ui` may import from `ag-grid-angular` or `ag-grid-community`.
- Feature code imports from `@poc/ui` only.
- Every component is standalone, OnPush, and has a **library-neutral API**: signal `input()`s and `output()`s named for the domain, never for AG Grid (`rowSelect`, not `rowSelected`; `columns`, not `columnDefs`).
- Add a component only when a feature needs it. Don't pre-build a kit.

## `PocDataTable` shape
```ts
// web/projects/ui/src/lib/data-table/poc-data-table.ts
export interface PocColumn<T> {
  key: keyof T & string;
  header: string;
  format?: 'number' | 'percent' | 'signed';
  pinned?: 'left';
}
@Component({ selector: 'poc-data-table', changeDetection: ChangeDetectionStrategy.OnPush, ... })
export class PocDataTable<T> {
  rows = input.required<T[]>();
  columns = input.required<PocColumn<T>[]>();
  rowId = input.required<keyof T & string>();     // maps to AG Grid getRowId, so price ticks update cells in place
  selected = input<T | null>(null);               // driven by feature signals, so FDC3 and click selection render the same way
  rowSelect = output<T>();
  rowContextAction = output<{ row: T; action: string }>();   // e.g. 'view-chart'
}
```
Internally the wrapper:
- maps `PocColumn` to AG Grid column definitions, with right-aligned numeric columns and value formatters per `format`;
- sets `getRowId` from `rowId` so updates are transactional rather than a full re-render;
- uses Community features only (sorting, resizing, pinning, row selection, cell-change flash);
- registers only the Community modules it uses (`ModuleRegistry.registerModules([...])`) to keep the bundle small.

## Tokens drive the grid too
- The AG Grid theme (Theming API, for example `themeQuartz.withParams({...})`) takes its colors, font and spacing from the same tokens (`var(--poc-…)`). The grid and our components can't drift apart, and a token change re-skins both.
- Price direction always uses `--poc-color-up` and `--poc-color-down`, and is never color-only: also show a sign (+/−) for accessibility.
- Brand green (`--poc-color-accent`) is for fills and chrome only, never for price direction and never as text on the page background.
- No hex, `rgb()`, `hsl()` or named colors anywhere outside `tokens.css` (Stylelint blocks it).

## Trading-UI conventions
- Numbers are right-aligned in tabular-nums. Prices have 2 decimals, percents have 2 decimals with a sign.
- Selection state comes from the `selected` input, not from the grid's internal state.
- Show an interop status badge (`connecting` / `fdc3` / `in-memory`), an agent source badge (`model` / `fallback` plus the reason as text), the tool-call count and the `environment` from runtime config, all with `PocBadge`.

## Accessibility checklist (specs/accessibility.md)
- Every interactive element is reachable and operable by keyboard, with a visible `:focus-visible` ring from `--poc-focus-ring`.
- Pointer targets are at least 24×24 CSS px; sizes in `rem`.
- The row menu opens on right-click, Shift+F10 and the ContextMenu key; Escape returns focus to the row.
- Charts are `role="img"` with a summary `aria-label` and a hidden data table; lines use `currentColor` for forced-colors mode.
- Agent results go to a polite live region; price ticks are never announced.
- Motion: components animate only with `transition: var(--poc-transition-color)` / `var(--poc-transition-focus)` (list them with commas). Every interactive component has a hover and a `:focus-visible` state built from those tokens; the idle outline is `--poc-focus-ring-idle`. Never write `animation` or raw `transition` values (Stylelint blocks them). For motion driven by JS, read `prefers-reduced-motion` too. Add a new `--poc-transition-<purpose>` token before animating a new property.

## Swap test
Before calling the UI done:
- Running `grep -rE "ag-grid-(angular|community)" web/projects --include=*.ts | grep -v projects/ui` must return nothing.
- `web/package.json` must list no UI library other than AG Grid.
