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
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: DETAIL_SETTINGS, useValue: { apiBaseUrl: 'http://api.test' } },
      { provide: INTEROP, useValue: { instrument$ } },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(DetailPage);
  fixture.autoDetectChanges();
  return { fixture, http, instrument$, host: fixture.nativeElement as HTMLElement };
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
