---
name: poc-design-system
description: Design-system rules for this POC's Angular UI. Use whenever creating or editing a component template, styles, or anything under web/projects/ui, or when choosing a UI component for a feature.
---

# POC design system

The design system is the swappable seam. Feature apps (`shell`, `blotter`, `detail`) never know which UI library is underneath.

## The wrapper rule
- Only `web/projects/ui` may import from `primeng/*` (or whatever library DECISIONS #1 settles on).
- Feature code imports wrappers from `@poc/ui`: `PocDataTable`, `PocButton`, `PocCard`, `PocBadge`, `PocTabs`, `PocMenu`.
- Each wrapper is a standalone OnPush component with a **library-neutral API**: signal `input()`s and `output()`s named for the domain, not for PrimeNG (`rowSelect`, not `onRowSelect`; `columns`, not `cols`).
- Add a wrapper only when a feature needs it. Don't pre-build a full kit.

## Wrapper API shape
```ts
// web/projects/ui/src/lib/data-table/poc-data-table.ts
export interface PocColumn<T> { key: keyof T & string; header: string; format?: 'number' | 'percent' | 'signed'; }
@Component({ selector: 'poc-data-table', changeDetection: ChangeDetectionStrategy.OnPush, ... })
export class PocDataTable<T> {
  rows = input.required<T[]>();
  columns = input.required<PocColumn<T>[]>();
  trackBy = input.required<keyof T & string>();
  selected = input<T | null>(null);
  rowSelect = output<T>();
  rowContextAction = output<{ row: T; action: string }>();   // e.g. 'view-chart'
}
```

## Tokens
- Colors, spacing and type come from CSS custom properties defined once in `web/projects/ui/src/styles/tokens.css` (`--poc-color-up`, `--poc-color-down`, `--poc-surface`, `--poc-space-2`, …). Map the PrimeNG theme preset onto these tokens, not the other way around.
- Price direction always uses `--poc-color-up` and `--poc-color-down`, and is never color-only: also show a sign (+/−) for accessibility.
- No hard-coded hex values in feature components.

## Trading-UI conventions
- Numbers are right-aligned in tabular-nums. Prices have 2 decimals, percents have 2 decimals with a sign.
- Selected row state comes from the `selected` input (driven by signals in the feature), not from internal library state, so FDC3-driven selection and click selection render the same way.
- Show an interop status badge (`fdc3` / `in-memory` / `disconnected`) and an agent source badge (`model` / `fallback`) using `PocBadge`.

## Swap test
Before calling the UI done, check that replacing PrimeNG would touch only `web/projects/ui`. Running `grep -r "primeng" web/projects --include=*.ts | grep -v projects/ui` must return nothing.
