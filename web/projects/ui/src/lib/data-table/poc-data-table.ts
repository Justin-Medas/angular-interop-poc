import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import {
  CellContextMenuEvent,
  CellKeyDownEvent,
  FullWidthCellKeyDownEvent,
  CellStyleModule,
  ClientSideRowModelApiModule,
  ClientSideRowModelModule,
  ColDef,
  GridApi,
  GridReadyEvent,
  ModuleRegistry,
  RowClickedEvent,
  RowApiModule,
  RowSelectionModule,
  themeQuartz,
} from 'ag-grid-community';

// Only the Community modules the wrapper uses, to keep the bundle small.
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  ClientSideRowModelApiModule,
  RowApiModule,
  RowSelectionModule,
  CellStyleModule,
]);

export interface PocRowContextMenu<T> {
  row: T;
  /** Viewport coordinates where a menu should appear. */
  x: number;
  y: number;
  source: 'pointer' | 'keyboard';
}

export interface PocColumn<T> {
  key: keyof T & string;
  header: string;
  /** number: 2 decimals. signed: explicit sign. percent: explicit sign, 2 decimals and %. */
  format?: 'number' | 'percent' | 'signed';
  pinned?: 'left';
}

const MINUS = '−';

function fmt(value: number, format: 'number' | 'percent' | 'signed'): string {
  const abs = Math.abs(value).toFixed(2);
  if (format === 'number') return value.toFixed(2);
  const sign = value < 0 ? MINUS : '+';
  return format === 'percent' ? `${sign}${abs}%` : `${sign}${abs}`;
}

/** Every color, font and spacing value comes from the design tokens (specs/design-tokens.md §6). */
const POC_THEME = themeQuartz.withParams({
  backgroundColor: 'var(--poc-color-surface)',
  foregroundColor: 'var(--poc-color-text)',
  headerBackgroundColor: 'var(--poc-color-bg)',
  headerTextColor: 'var(--poc-color-text-muted)',
  borderColor: 'var(--poc-color-border)',
  rowHoverColor: 'var(--poc-color-surface-hover)',
  selectedRowBackgroundColor: 'var(--poc-color-surface-selected)',
  accentColor: 'var(--poc-color-accent)',
  rangeSelectionBorderColor: 'var(--poc-color-focus)',
  fontFamily: 'var(--poc-font-sans)',
  fontSize: 'var(--poc-text-sm)',
  spacing: 'var(--poc-space-1)',
});

/** Library-neutral wrapper around AG Grid Community. Feature code never imports ag-grid-*. */
@Component({
  selector: 'poc-data-table',
  imports: [AgGridAngular],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ag-grid-angular
      [theme]="theme"
      [rowData]="rows()"
      [columnDefs]="columnDefs()"
      [getRowId]="getRowId()"
      [defaultColDef]="defaultColDef"
      [rowSelection]="rowSelection"
      [animateRows]="animateRows"
      [domLayout]="'autoHeight'"
      (modelUpdated)="syncSelection()"
      (gridReady)="onGridReady($event)"
      (rowClicked)="onRowClicked($event)"
      (cellKeyDown)="onCellKeyDown($event)"
      (cellContextMenu)="onCellContextMenu($event)"
    />
  `,
  styleUrl: './poc-data-table.scss',
})
export class PocDataTable<T> {
  rows = input.required<T[]>();
  columns = input.required<PocColumn<T>[]>();
  /** Property that uniquely identifies a row, so updates change cells in place. */
  rowId = input.required<keyof T & string>();
  /** Driven by the feature's signals so click and FDC3 selection render the same way. */
  selected = input<T | null>(null);
  rowSelect = output<T>();
  /** Right-click, Shift+F10 or the ContextMenu key on a row (FR15). The feature owns the menu itself. */
  rowContextMenu = output<PocRowContextMenu<T>>();

  protected readonly theme = POC_THEME;
  /** Motion driven by JS must honor prefers-reduced-motion like the CSS tokens do (NFR-A5). */
  protected readonly animateRows = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  protected readonly rowSelection = {
    mode: 'singleRow',
    checkboxes: false,
    enableClickSelection: false,
  } as const;
  protected readonly defaultColDef: ColDef = { flex: 1 };

  private readonly api = signal<GridApi<T> | null>(null);

  protected readonly columnDefs = computed(() =>
    this.columns().map((c): ColDef => {
      const numeric = c.format !== undefined;
      return {
        field: c.key,
        headerName: c.header,
        pinned: c.pinned,
        headerClass: numeric ? 'ag-right-aligned-header' : undefined,
        valueFormatter: numeric
          ? (p) => fmt(p.value as number, c.format as 'number' | 'percent' | 'signed')
          : undefined,
        cellClass: (p) => {
          if (!numeric) return [];
          const v = p.value as number;
          const direction = c.format === 'number' || v === 0 ? [] : [v > 0 ? 'poc-up' : 'poc-down'];
          return ['poc-num', 'ag-right-aligned-cell', ...direction];
        },
      };
    }),
  );

  protected readonly getRowId = () => (p: { data: T }) => String(p.data[this.rowId()]);

  constructor() {
    effect(() => {
      this.selected();
      this.syncSelection();
    });
  }

  /** Mirrors the `selected` input into the grid. Runs when it changes and when the row model updates. */
  protected syncSelection(): void {
    const api = this.api();
    const selected = this.selected();
    if (!api) return;
    api.deselectAll();
    if (selected) api.getRowNode(String(selected[this.rowId()]))?.setSelected(true);
  }

  protected onGridReady(e: GridReadyEvent<T>): void {
    this.api.set(e.api);
  }

  protected onRowClicked(e: RowClickedEvent<T>): void {
    this.rowSelect.emit(e.data as T);
  }

  protected onCellKeyDown(e: CellKeyDownEvent<T> | FullWidthCellKeyDownEvent<T>): void {
    const event = e.event as KeyboardEvent;
    if (event.key === 'Enter' || event.key === ' ') this.rowSelect.emit(e.data as T);
    if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
      // Stops the browser's own menu and the contextmenu event some platforms would also fire.
      event.preventDefault();
      const cell = (event.target as HTMLElement).getBoundingClientRect();
      this.rowContextMenu.emit({
        row: e.data as T,
        x: cell.left,
        y: cell.bottom,
        source: 'keyboard',
      });
    }
  }

  protected onCellContextMenu(e: CellContextMenuEvent<T>): void {
    const { clientX, clientY } = e.event as MouseEvent;
    this.rowContextMenu.emit({ row: e.data as T, x: clientX, y: clientY, source: 'pointer' });
  }
}
