import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PocBadge, PocButton, PocCard, PocColumn, PocDataTable, PocTab, PocTabs } from '@poc/ui';

interface DemoRow {
  symbol: string;
  last: number;
  change: number;
  changePct: number;
}

/** Dev-only page that renders every projects/ui component in each theme (visual tests snapshot it). */
@Component({
  selector: 'poc-ui-gallery',
  imports: [PocBadge, PocButton, PocCard, PocDataTable, PocTabs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ui-gallery.html',
  styleUrl: './ui-gallery.scss',
})
export class UiGallery {
  protected readonly themes = ['dark', 'light'] as const;
  protected readonly tabs: PocTab[] = [
    { id: 'quote', label: 'Quote' },
    { id: 'chart', label: 'Chart' },
  ];
  protected readonly tab = signal('quote');
  protected readonly columns: PocColumn<DemoRow>[] = [
    { key: 'symbol', header: 'Symbol', pinned: 'left' },
    { key: 'last', header: 'Last', format: 'number' },
    { key: 'change', header: 'Chg', format: 'signed' },
    { key: 'changePct', header: 'Chg %', format: 'percent' },
  ];
  protected readonly rows: DemoRow[] = [
    { symbol: 'AAPL', last: 228.5, change: 1.93, changePct: 0.85 },
    { symbol: 'MSFT', last: 415.1, change: -5.04, changePct: -1.2 },
  ];
  protected readonly selected = signal<DemoRow | null>(this.rows[1]);
}
