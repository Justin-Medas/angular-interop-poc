---
name: poc-design-system
description: Design-system rules for this POC's Angular UI. Use whenever creating or editing a component template, styles, or anything under web/projects/ui, or when choosing a UI component for a feature.
---

# POC design system

The design system is the swappable seam. Feature apps (`shell`, `blotter`, `detail`) never know what's underneath. See `docs/DECISIONS.md` #7.

## What's in `web/projects/ui`
- **Design tokens.** CSS custom properties in `src/styles/tokens.css`. They are the single source for color, spacing, type, radius and motion.
- **Our own components**, built only from tokens: `PocButton`, `PocCard`, `PocBadge`, `PocTabs`, `PocCommandBar`. `@angular/cdk` may be used for accessibility primitives (focus, keyboard navigation, overlay).
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
- No hard-coded hex values anywhere outside `tokens.css`.

## Trading-UI conventions
- Numbers are right-aligned in tabular-nums. Prices have 2 decimals, percents have 2 decimals with a sign.
- Selection state comes from the `selected` input, not from the grid's internal state.
- Show an interop status badge (`fdc3` / `in-memory` / `disconnected`), an agent source badge (`model` / `fallback`) and the `environment` from runtime config, all with `PocBadge`.

## Swap test
Before calling the UI done:
- Running `grep -rE "ag-grid-(angular|community)" web/projects --include=*.ts | grep -v projects/ui` must return nothing.
- `web/package.json` must list no UI library other than AG Grid.
