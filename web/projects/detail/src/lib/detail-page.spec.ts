import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { INTEROP, InstrumentRef } from '@poc/interop';
import { Subject } from 'rxjs';
import { a11yViolations } from '../../../ui/src/testing/axe';
import { DetailPage } from './detail-page';
import { DETAIL_SETTINGS } from './detail-settings';

const AAPL = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  last: 228.5,
  change: 1.93,
  changePct: 0.85,
  volume: 1000,
  currency: 'USD',
  asOf: '2026-01-01T00:00:00Z',
};

function render() {
  const instrument$ = new Subject<InstrumentRef>();
  const viewChart$ = new Subject<string>();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: DETAIL_SETTINGS, useValue: { apiBaseUrl: 'http://api.test' } },
      { provide: INTEROP, useValue: { instrument$, viewChart$ } },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(DetailPage);
  fixture.autoDetectChanges();
  return { fixture, http, instrument$, viewChart$, host: fixture.nativeElement as HTMLElement };
}

describe('NFR-ARCH1 DetailPage', () => {
  it('NFR-ARCH1 renders a main landmark with an h1 "Instrument Detail"', () => {
    const { host } = render();
    expect(host.querySelector('main > h1')?.textContent).toBe('Instrument Detail');
  });
});

describe('FR3 DetailPage listens for fdc3.instrument', () => {
  it('FR3 shows a prompt before any instrument is received', () => {
    const { host } = render();
    expect(host.textContent).toContain('Select an instrument');
  });

  it('FR3 fetches GET /quotes/{symbol} and shows the quote', async () => {
    const { http, instrument$, host, fixture } = render();
    instrument$.next({ ticker: 'AAPL' });
    http.expectOne('http://api.test/quotes/AAPL').flush(AAPL);
    await fixture.whenStable();
    expect(host.querySelector('h2')?.textContent).toContain('AAPL');
    expect(host.textContent).toContain('Apple Inc.');
    expect(host.textContent).toContain('228.50');
  });

  it('FR3 shows an "unknown instrument" state on 404', async () => {
    const { http, instrument$, host, fixture } = render();
    instrument$.next({ ticker: 'ZZZZ' });
    http
      .expectOne('http://api.test/quotes/ZZZZ')
      .flush({ code: 'not_found', message: 'x' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Unknown instrument ZZZZ');
  });

  it('FR3 shows a load error on other failures', async () => {
    const { http, instrument$, host, fixture } = render();
    instrument$.next({ ticker: 'AAPL' });
    http.expectOne('http://api.test/quotes/AAPL').flush('boom', { status: 500, statusText: 'x' });
    await fixture.whenStable();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Could not load');
  });

  it('FR3 a newer instrument replaces the previous one', async () => {
    const { http, instrument$, host, fixture } = render();
    instrument$.next({ ticker: 'AAPL' });
    instrument$.next({ ticker: 'MSFT' });
    expect(http.expectOne('http://api.test/quotes/AAPL').cancelled).toBe(true);
    http
      .expectOne('http://api.test/quotes/MSFT')
      .flush({ ...AAPL, symbol: 'MSFT', name: 'Microsoft' });
    await fixture.whenStable();
    expect(host.querySelector('h2')?.textContent).toContain('MSFT');
  });

  it('NFR-A2 has no serious axe violations with a quote shown', async () => {
    const { http, instrument$, host, fixture } = render();
    instrument$.next({ ticker: 'AAPL' });
    http.expectOne('http://api.test/quotes/AAPL').flush(AAPL);
    await fixture.whenStable();
    expect(await a11yViolations(host)).toEqual([]);
  });
});

const HISTORY = [
  { t: '2026-01-01T14:30:00Z', price: 226.58 },
  { t: '2026-01-01T14:35:00Z', price: 228.5 },
];

async function selectAapl(r: ReturnType<typeof render>) {
  r.instrument$.next({ ticker: 'AAPL' });
  r.http.expectOne('http://api.test/quotes/AAPL').flush(AAPL);
  await r.fixture.whenStable();
}

const tab = (host: HTMLElement, name: string) =>
  Array.from(host.querySelectorAll<HTMLElement>('[role="tab"]')).find((t) =>
    t.textContent?.includes(name),
  )!;

describe('FR12 DetailPage Quote and Chart tabs', () => {
  it('FR12 shows Quote and Chart tabs with Quote selected', async () => {
    const r = render();
    await selectAapl(r);
    expect(tab(r.host, 'Quote').getAttribute('aria-selected')).toBe('true');
    expect(tab(r.host, 'Chart').getAttribute('aria-selected')).toBe('false');
  });

  it('FR12 Chart tab fetches 1D history and draws the chart', async () => {
    const r = render();
    await selectAapl(r);
    tab(r.host, 'Chart').click();
    await r.fixture.whenStable();
    r.http.expectOne('http://api.test/quotes/AAPL/history?range=1D').flush(HISTORY);
    await r.fixture.whenStable();
    expect(r.host.querySelector('svg[role="img"]')?.getAttribute('aria-label')).toContain(
      'AAPL, 1 day',
    );
  });

  it('FR12 the range switch refetches with 5D and 1M and marks the choice', async () => {
    const r = render();
    await selectAapl(r);
    tab(r.host, 'Chart').click();
    await r.fixture.whenStable();
    r.http.expectOne('http://api.test/quotes/AAPL/history?range=1D').flush(HISTORY);
    await r.fixture.whenStable();
    const btn = (n: string) =>
      Array.from(r.host.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')).find(
        (b) => b.textContent?.trim() === n,
      )!;
    btn('5D').click();
    await r.fixture.whenStable();
    r.http.expectOne('http://api.test/quotes/AAPL/history?range=5D').flush(HISTORY);
    await r.fixture.whenStable();
    expect(btn('5D').getAttribute('aria-pressed')).toBe('true');
    expect(btn('1D').getAttribute('aria-pressed')).toBe('false');
    expect(r.host.querySelector('svg')?.getAttribute('aria-label')).toContain('5 days');
    btn('1M').click();
    await r.fixture.whenStable();
    r.http.expectOne('http://api.test/quotes/AAPL/history?range=1M').flush(HISTORY);
    await r.fixture.whenStable();
    expect(r.host.querySelector('svg')?.getAttribute('aria-label')).toContain('1 month');
  });

  it('FR12 shows an alert when history fails', async () => {
    const r = render();
    await selectAapl(r);
    tab(r.host, 'Chart').click();
    await r.fixture.whenStable();
    r.http
      .expectOne('http://api.test/quotes/AAPL/history?range=1D')
      .flush('boom', { status: 500, statusText: 'x' });
    await r.fixture.whenStable();
    expect(r.host.querySelector('[role="alert"]')?.textContent).toContain('Could not load chart');
  });

  it('NFR-A2 has no serious axe violations on the chart tab', async () => {
    const r = render();
    await selectAapl(r);
    tab(r.host, 'Chart').click();
    await r.fixture.whenStable();
    r.http.expectOne('http://api.test/quotes/AAPL/history?range=1D').flush(HISTORY);
    await r.fixture.whenStable();
    expect(await a11yViolations(r.host)).toEqual([]);
  });
});

describe('FR4 DetailPage handles ViewChart', () => {
  it('FR4 ViewChart selects the Chart tab and loads that ticker without moving focus', async () => {
    const r = render();
    const before = document.activeElement;
    r.viewChart$.next('AAPL');
    r.http.expectOne('http://api.test/quotes/AAPL').flush(AAPL);
    await r.fixture.whenStable();
    r.http.expectOne('http://api.test/quotes/AAPL/history?range=1D').flush(HISTORY);
    await r.fixture.whenStable();
    expect(tab(r.host, 'Chart').getAttribute('aria-selected')).toBe('true');
    expect(r.host.querySelector('svg[role="img"]')).not.toBeNull();
    expect(document.activeElement).toBe(before);
  });

  it('FR4 a later fdc3.instrument keeps the selected tab and follows the new ticker', async () => {
    const r = render();
    r.viewChart$.next('AAPL');
    r.http.expectOne('http://api.test/quotes/AAPL').flush(AAPL);
    await r.fixture.whenStable();
    r.http.expectOne('http://api.test/quotes/AAPL/history?range=1D').flush(HISTORY);
    r.instrument$.next({ ticker: 'MSFT' });
    r.http.expectOne('http://api.test/quotes/MSFT').flush({ ...AAPL, symbol: 'MSFT' });
    await r.fixture.whenStable();
    r.http.expectOne('http://api.test/quotes/MSFT/history?range=1D').flush(HISTORY);
    await r.fixture.whenStable();
    expect(tab(r.host, 'Chart').getAttribute('aria-selected')).toBe('true');
  });
});
