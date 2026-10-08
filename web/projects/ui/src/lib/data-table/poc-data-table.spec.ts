import { TestBed } from '@angular/core/testing';
import { a11yViolations } from '../../testing/axe';
import { PocColumn, PocDataTable } from './poc-data-table';

interface Row {
  symbol: string;
  last: number;
  change: number;
  changePct: number;
}

const COLUMNS: PocColumn<Row>[] = [
  { key: 'symbol', header: 'Symbol', pinned: 'left' },
  { key: 'last', header: 'Last', format: 'number' },
  { key: 'change', header: 'Chg', format: 'signed' },
  { key: 'changePct', header: 'Chg %', format: 'percent' },
];

const ROWS: Row[] = [
  { symbol: 'AAPL', last: 228.5, change: 1.93, changePct: 0.85 },
  { symbol: 'MSFT', last: 415.1, change: -5, changePct: -1.2 },
];

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

function stubReducedMotion(reduce: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
  }));
}

afterEach(() => vi.unstubAllGlobals());

async function render(rows: Row[] = ROWS, selected: Row | null = null) {
  const fixture = TestBed.createComponent(PocDataTable<Row>);
  fixture.componentRef.setInput('rows', rows);
  fixture.componentRef.setInput('columns', COLUMNS);
  fixture.componentRef.setInput('rowId', 'symbol');
  fixture.componentRef.setInput('selected', selected);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r, 50));
  const host: HTMLElement = fixture.nativeElement;
  const cell = (symbol: string, col: string) =>
    host.querySelector(`[row-id="${symbol}"] [col-id="${col}"]`) as HTMLElement | null;
  return { fixture, host, cell };
}

describe('FR1 PocDataTable', () => {
  it('FR1 renders a header per column and a row per item', async () => {
    const { host } = await render();
    const headers = Array.from(
      host.querySelectorAll('.ag-header-cell[col-id] .ag-header-cell-text'),
    ).map((h) => h.textContent);
    // AG Grid adds an unnamed filler header next to a pinned column.
    expect(headers.filter(Boolean)).toEqual(['Symbol', 'Last', 'Chg', 'Chg %']);
    expect(host.querySelectorAll('[role="row"][row-id]').length).toBe(2);
  });

  it('FR1 formats numbers to 2 decimals, signed with an explicit sign, percents with sign and %', async () => {
    const { cell } = await render();
    expect(cell('AAPL', 'last')?.textContent?.trim()).toBe('228.50');
    expect(cell('AAPL', 'changePct')?.textContent?.trim()).toBe('+0.85%');
    expect(cell('MSFT', 'changePct')?.textContent?.trim()).toBe('−1.20%');
    expect(cell('AAPL', 'change')?.textContent?.trim()).toBe('+1.93');
    expect(cell('MSFT', 'change')?.textContent?.trim()).toBe('−5.00');
  });

  it('FR1 numeric cells are right-aligned', async () => {
    const { cell } = await render();
    expect(cell('AAPL', 'last')?.classList).toContain('poc-num');
    expect(cell('AAPL', 'symbol')?.classList).not.toContain('poc-num');
  });

  it('FR1 price direction classes accompany the sign', async () => {
    const { cell } = await render();
    expect(cell('AAPL', 'changePct')?.classList).toContain('poc-up');
    expect(cell('MSFT', 'changePct')?.classList).toContain('poc-down');
  });

  it('FR1 updates a changed row in place via rowId', async () => {
    const { fixture, cell } = await render();
    const before = cell('AAPL', 'last');
    fixture.componentRef.setInput('rows', [{ ...ROWS[0], last: 230 }, ROWS[1]]);
    await new Promise((r) => setTimeout(r, 50));
    expect(cell('AAPL', 'last')).toBe(before);
    expect(cell('AAPL', 'last')?.textContent?.trim()).toBe('230.00');
  });

  it('FR2 clicking a row emits rowSelect with that row', async () => {
    const { fixture, cell } = await render();
    const emitted: Row[] = [];
    fixture.componentInstance.rowSelect.subscribe((r) => emitted.push(r));
    cell('MSFT', 'symbol')!.click();
    await tick();
    expect(emitted).toEqual([ROWS[1]]);
  });

  it('FR2 Enter on a focused cell emits rowSelect', async () => {
    const { fixture, cell } = await render();
    const emitted: Row[] = [];
    fixture.componentInstance.rowSelect.subscribe((r) => emitted.push(r));
    const el = cell('AAPL', 'symbol')!;
    el.focus();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await tick();
    expect(emitted).toEqual([ROWS[0]]);
  });

  it('FR2 Space emits rowSelect and other keys do not', async () => {
    const { fixture, cell } = await render();
    const emitted: Row[] = [];
    fixture.componentInstance.rowSelect.subscribe((r) => emitted.push(r));
    const el = cell('AAPL', 'symbol')!;
    el.focus();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    await tick();
    expect(emitted).toEqual([]);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await tick();
    expect(emitted).toEqual([ROWS[0]]);
  });

  it('FR1 an unchanged value shows +0.00 with no direction color', async () => {
    const { cell } = await render([{ symbol: 'FLAT', last: 10, change: 0, changePct: 0 }]);
    expect(cell('FLAT', 'change')?.textContent?.trim()).toBe('+0.00');
    expect(cell('FLAT', 'change')?.classList).not.toContain('poc-up');
    expect(cell('FLAT', 'change')?.classList).not.toContain('poc-down');
  });

  it('FR3 the selected input marks the row selected', async () => {
    const { host } = await render(ROWS, ROWS[1]);
    const row = host.querySelector('[row-id="MSFT"]')!;
    expect(row.getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('[row-id="AAPL"]')!.getAttribute('aria-selected')).not.toBe('true');
  });

  it('FR3 selecting from outside does not emit rowSelect', async () => {
    const { fixture } = await render();
    const emitted: Row[] = [];
    fixture.componentInstance.rowSelect.subscribe((r) => emitted.push(r));
    fixture.componentRef.setInput('selected', ROWS[1]);
    await new Promise((r) => setTimeout(r, 50));
    expect(emitted).toEqual([]);
  });

  it('FR15 right-click on a cell emits rowContextMenu with that row and source "pointer"', async () => {
    const { fixture, cell } = await render();
    const emitted: unknown[] = [];
    fixture.componentInstance.rowContextMenu.subscribe((e) => emitted.push(e));
    cell('MSFT', 'last')!.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 7, clientY: 9 }),
    );
    await tick();
    expect(emitted).toEqual([{ row: ROWS[1], x: 7, y: 9, source: 'pointer' }]);
  });

  it.each([
    ['ContextMenu', { key: 'ContextMenu' }],
    ['Shift+F10', { key: 'F10', shiftKey: true }],
  ])('FR15 %s on a focused cell emits rowContextMenu with source "keyboard"', async (_n, init) => {
    const { fixture, cell } = await render();
    const emitted: { row: Row; source: string }[] = [];
    fixture.componentInstance.rowContextMenu.subscribe((e) => emitted.push(e));
    const el = cell('AAPL', 'symbol')!;
    el.focus();
    const ev = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    await tick();
    expect(emitted.map((e) => [e.row, e.source])).toEqual([[ROWS[0], 'keyboard']]);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('FR15 F10 without Shift does not emit rowContextMenu', async () => {
    const { fixture, cell } = await render();
    const emitted: unknown[] = [];
    fixture.componentInstance.rowContextMenu.subscribe((e) => emitted.push(e));
    cell('AAPL', 'symbol')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F10', bubbles: true }),
    );
    expect(emitted).toEqual([]);
  });

  it('NFR-A2 keeps AG Grid ARIA grid roles and has no serious axe violations', async () => {
    const { host } = await render();
    expect(host.querySelector('[role="treegrid"], [role="grid"]')).not.toBeNull();
    expect(await a11yViolations(host)).toEqual([]);
  });

  // Rows animating when motion is allowed needs real layout, so E2E covers it (ui-gallery.e2e.ts).
  it('NFR-A5 rows do not animate under prefers-reduced-motion', async () => {
    stubReducedMotion(true);
    const { host } = await render();
    await tick(400);
    expect(host.querySelector('.ag-row-no-animation')).not.toBeNull();
    expect(host.querySelector('.ag-row-animation')).toBeNull();
  });
});
