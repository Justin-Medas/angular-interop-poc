// Blotter micro-app (FR1, FR2, FR4, FR15). Lists the watchlist from GET /quotes, broadcasts the selected instrument through
// INTEROP, and offers a row menu whose "View chart" raises the ViewChart intent. Knows nothing about AG Grid or FDC3:
// it uses poc-data-table and the INTEROP token only (NFR-ARCH2).
import { HttpClient } from '@angular/common/http';
import { CdkContextMenuTrigger, CdkMenu, CdkMenuItem } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { INTEROP } from '@poc/interop';
import { PocColumn, PocDataTable, PocRowContextMenu } from '@poc/ui';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, of, switchMap, tap, timer } from 'rxjs';
import { BLOTTER_SETTINGS } from './blotter-settings';

/** One row of GET /quotes (the Quote schema in openapi.yaml). Fields shown in the grid are a subset. */
export interface Quote {
  symbol: string;
  name: string;
  last: number;
  change: number;
  changePct: number;
  volume: number;
  currency: string;
  asOf: string;
}

/** Full-page blotter: quotes table, polling, selection broadcast and the row context menu. */
@Component({
  selector: 'poc-blotter-page',
  imports: [PocDataTable, CdkContextMenuTrigger, CdkMenu, CdkMenuItem],
  templateUrl: './blotter-page.html',
  styleUrl: './blotter-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlotterPage {
  private readonly http = inject(HttpClient);
  private readonly settings = inject(BLOTTER_SETTINGS);
  private readonly interop = inject(INTEROP);

  protected readonly columns: PocColumn<Quote>[] = [
    { key: 'symbol', header: 'Symbol', pinned: 'left' },
    { key: 'last', header: 'Last', format: 'number' },
    { key: 'change', header: 'Chg', format: 'signed' },
    { key: 'changePct', header: 'Chg %', format: 'percent' },
  ];
  protected readonly quotes = signal<Quote[]>([]);
  protected readonly failed = signal(false);
  protected readonly selected = signal<Quote | null>(null);
  /** The row the open menu belongs to; cleared when the menu closes so a stale row cannot be charted. */
  protected readonly menuRow = signal<Quote | null>(null);

  /** Set when ViewChart found no handler (NoAppsFound), so the failure is visible rather than swallowed. */
  protected readonly viewChartFailed = signal(false);

  constructor() {
    const { apiBaseUrl, pollIntervalMs } = this.settings;
    // switchMap drops a slow in-flight request when the next tick fires, so stale data never overwrites newer data.
    // 0 means fetch once. A failed poll shows an alert and the next tick tries again.
    (pollIntervalMs > 0 ? timer(0, pollIntervalMs) : of(0))
      .pipe(
        switchMap(() =>
          this.http.get<Quote[]>(`${apiBaseUrl}/quotes`).pipe(
            tap(() => this.failed.set(false)),
            catchError(() => {
              this.failed.set(true);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((q) => this.quotes.set(q));
  }

  /** FR2: pointer or keyboard selection broadcasts the instrument to linked apps. */
  protected onRowSelect(row: Quote): void {
    this.selected.set(row);
    void this.interop.broadcastInstrument({ ticker: row.symbol, name: row.name });
  }

  /** Remembers which row the menu is for. Opening is left to the CDK trigger for the pointer; see the keyboard note below. */
  protected onRowContextMenu(e: PocRowContextMenu<Quote>, menu: CdkContextMenuTrigger): void {
    this.menuRow.set(e.row);
    // The CDK trigger opens itself on the native contextmenu event. The keyboard has none on every platform, so open it here.
    if (e.source === 'keyboard') menu.open({ x: e.x, y: e.y });
  }

  /** "View chart" item (FR4, FR15): raises the ViewChart intent. Does nothing when no row is set, e.g. a right-click on the header (DECISIONS #28). */
  protected onViewChart(): void {
    const row = this.menuRow();
    if (!row) return;
    this.viewChartFailed.set(false);
    // Rejects with NoAppsFound when no Detail is open (fdc3-contract.md §5); say so instead of doing nothing.
    this.interop.raiseViewChart(row.symbol).catch(() => this.viewChartFailed.set(true));
  }
}
