// Component tests for the FR13 shell modules: one describe per module, each fed its payload as the renderer does.
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { a11yViolations } from '../../../../ui/src/testing/axe';
import { RUNTIME_CONFIG, RuntimeConfig } from '../config/runtime-config';
import { MODULE_LOADERS, loaderFor } from './module-registry';

const API = 'http://api.test';

const quote = (symbol: string, name: string, last: number, change: number, changePct: number) => ({
  symbol,
  name,
  last,
  change,
  changePct,
  volume: 1,
  currency: 'USD',
  asOf: '2026-10-07T15:30:00Z',
});
const AAPL = quote('AAPL', 'Apple Inc.', 228.5, 1.93, 0.85);
const MSFT = quote('MSFT', 'Microsoft Corp.', 415.1, 1.74, 0.42);
const NVDA = quote('NVDA', 'NVIDIA Corp.', 130.2, 2.95, 2.31);
const TSLA = quote('TSLA', 'Tesla Inc.', 240.1, -7.73, -3.12);
const GS = quote('GS', 'Goldman Sachs', 500.3, -5.3, -1.05);

async function mount(name: string, payload: unknown) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: RUNTIME_CONFIG, useValue: { apiBaseUrl: API } as RuntimeConfig },
    ],
  });
  const type = (await loaderFor(name)!()) as Type<unknown>;
  const fixture = TestBed.createComponent(type);
  fixture.componentRef.setInput('payload', payload);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const http = TestBed.inject(HttpTestingController);
  const settle = async () => {
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 50));
    fixture.detectChanges();
  };
  return { fixture, host, http, settle };
}

describe('FR13 registry', () => {
  it('FR13 registers all six modules the schema can plan', () => {
    expect(Object.keys(MODULE_LOADERS).sort()).toEqual([
      'blotter',
      'compare',
      'instrument-detail',
      'none',
      'price-chart',
      'watchlist-movers',
    ]);
  });
});

describe('FR13 blotter module', () => {
  it('FR13 shows the whole watchlist when symbols is null', async () => {
    const t = await mount('blotter', { symbols: null });
    t.http.expectOne(`${API}/quotes`).flush([AAPL, MSFT]);
    await t.settle();
    expect(t.host.querySelector('h2')?.textContent).toBe('Watchlist');
    expect(t.host.querySelector('[row-id="AAPL"] [col-id="last"]')?.textContent?.trim()).toBe(
      '228.50',
    );
    expect(t.host.querySelector('[row-id="MSFT"]')).not.toBeNull();
  });

  it('FR13 asks the API for only the filtered symbols', async () => {
    const t = await mount('blotter', { symbols: ['AAPL', 'MSFT'] });
    t.http.expectOne(`${API}/quotes?symbols=AAPL,MSFT`).flush([AAPL, MSFT]);
    await t.settle();
    expect(t.host.querySelector('[row-id="AAPL"]')).not.toBeNull();
  });

  it('FR13 shows an alert when quotes fail to load', async () => {
    const t = await mount('blotter', { symbols: null });
    t.http.expectOne(`${API}/quotes`).flush('x', { status: 500, statusText: 'Server Error' });
    await t.settle();
    expect(t.host.querySelector('[role="alert"]')?.textContent).toContain('Could not load quotes');
  });
});

describe('FR13 instrument-detail module', () => {
  it('FR13 fetches the quote for payload.symbol and shows it under the symbol heading', async () => {
    const t = await mount('instrument-detail', { symbol: 'AAPL' });
    expect(t.host.querySelector('h2')?.textContent).toContain('AAPL');
    t.http.expectOne(`${API}/quotes/AAPL`).flush(AAPL);
    await t.settle();
    const text = t.host.textContent!;
    expect(text).toContain('Apple Inc.');
    expect(text).toContain('228.50 USD');
    expect(text).toContain('+1.93');
    expect(text).toContain('+0.85%');
    expect(await a11yViolations(t.host)).toEqual([]);
  });

  it('FR13 shows an alert for an unknown instrument (404)', async () => {
    const t = await mount('instrument-detail', { symbol: 'ZZZZ' });
    t.http.expectOne(`${API}/quotes/ZZZZ`).flush('x', { status: 404, statusText: 'Not Found' });
    await t.settle();
    expect(t.host.querySelector('[role="alert"]')?.textContent).toContain('Unknown instrument');
  });

  it('FR13 shows a generic alert for other failures', async () => {
    const t = await mount('instrument-detail', { symbol: 'AAPL' });
    t.http.expectOne(`${API}/quotes/AAPL`).flush('x', { status: 500, statusText: 'Error' });
    await t.settle();
    expect(t.host.querySelector('[role="alert"]')?.textContent).toContain('Could not load AAPL');
  });
});

describe('FR13 price-chart module', () => {
  const points = [
    { t: '2026-10-07T13:30:00Z', price: 100 },
    { t: '2026-10-07T14:30:00Z', price: 101 },
  ];

  it('FR13 loads history for the payload range and draws a titled chart', async () => {
    const t = await mount('price-chart', { symbol: 'NVDA', range: '5D' });
    expect(t.host.querySelector('h2')?.textContent).toContain('NVDA');
    t.http.expectOne(`${API}/quotes/NVDA/history?range=5D`).flush(points);
    await t.settle();
    expect(t.host.querySelector('svg')).not.toBeNull();
    expect(t.host.textContent).toContain('5 days');
    expect(await a11yViolations(t.host)).toEqual([]);
  });

  it('FR13 shows an alert when history fails', async () => {
    const t = await mount('price-chart', { symbol: 'NVDA', range: '1D' });
    t.http
      .expectOne(`${API}/quotes/NVDA/history?range=1D`)
      .flush('x', { status: 404, statusText: 'Not Found' });
    await t.settle();
    expect(t.host.querySelector('[role="alert"]')?.textContent).toContain(
      'Could not load chart for NVDA',
    );
  });
});

describe('FR13 watchlist-movers module', () => {
  const ALL = [AAPL, MSFT, NVDA, TSLA, GS];
  const symbols = (host: HTMLElement, group: string) =>
    Array.from(host.querySelectorAll(`[data-testid="${group}"] li`)).map(
      (li) => li.textContent!.trim().split(/\s/)[0],
    );

  it('FR13 up ranks the top N gainers by change %', async () => {
    const t = await mount('watchlist-movers', { direction: 'up', limit: 2 });
    t.http.expectOne(`${API}/quotes`).flush(ALL);
    await t.settle();
    expect(symbols(t.host, 'gainers')).toEqual(['NVDA', 'AAPL']);
    expect(t.host.querySelector('[data-testid="losers"]')).toBeNull();
  });

  it('FR13 down ranks the top N losers, worst first', async () => {
    const t = await mount('watchlist-movers', { direction: 'down', limit: 2 });
    t.http.expectOne(`${API}/quotes`).flush(ALL);
    await t.settle();
    expect(symbols(t.host, 'losers')).toEqual(['TSLA', 'GS']);
    expect(t.host.querySelector('[data-testid="gainers"]')).toBeNull();
  });

  it('FR13 both shows N gainers and N losers, with explicit signs (not color alone)', async () => {
    const t = await mount('watchlist-movers', { direction: 'both', limit: 1 });
    t.http.expectOne(`${API}/quotes`).flush(ALL);
    await t.settle();
    expect(symbols(t.host, 'gainers')).toEqual(['NVDA']);
    expect(symbols(t.host, 'losers')).toEqual(['TSLA']);
    expect(t.host.textContent).toContain('+2.31%');
    expect(t.host.textContent).toContain('−3.12%');
    expect(await a11yViolations(t.host)).toEqual([]);
  });

  it('FR13 shows an alert when quotes fail', async () => {
    const t = await mount('watchlist-movers', { direction: 'both', limit: 5 });
    t.http.expectOne(`${API}/quotes`).flush('x', { status: 500, statusText: 'Error' });
    await t.settle();
    expect(t.host.querySelector('[role="alert"]')?.textContent).toContain('Could not load');
  });
});

describe('FR13 compare module', () => {
  it('FR13 shows one card per symbol in the requested order', async () => {
    const t = await mount('compare', { symbols: ['TSLA', 'AAPL'] });
    t.http.expectOne(`${API}/quotes?symbols=TSLA,AAPL`).flush([TSLA, AAPL]);
    await t.settle();
    const cards = Array.from(t.host.querySelectorAll('h3')).map((h) => h.textContent!.trim());
    expect(cards).toEqual(['TSLA', 'AAPL']);
    expect(t.host.textContent).toContain('240.10 USD');
    expect(t.host.textContent).toContain('−3.12%');
    expect(await a11yViolations(t.host)).toEqual([]);
  });

  it('FR13 shows an alert when the comparison fails', async () => {
    const t = await mount('compare', { symbols: ['TSLA', 'AAPL'] });
    t.http
      .expectOne(`${API}/quotes?symbols=TSLA,AAPL`)
      .flush('x', { status: 500, statusText: 'Error' });
    await t.settle();
    expect(t.host.querySelector('[role="alert"]')?.textContent).toContain('Could not load');
  });
});
