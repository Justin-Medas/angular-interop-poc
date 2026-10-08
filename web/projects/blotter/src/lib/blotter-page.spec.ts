import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { a11yViolations } from '../../../ui/src/testing/axe';
import { BlotterPage } from './blotter-page';
import { BLOTTER_SETTINGS, BlotterSettings } from './blotter-settings';

const QUOTES = [
  { symbol: 'AAPL', name: 'Apple Inc.', last: 228.5, change: 1.93, changePct: 0.85, volume: 1, currency: 'USD', asOf: '2026-01-01T00:00:00Z' },
  { symbol: 'MSFT', name: 'Microsoft', last: 415.1, change: -5, changePct: -1.2, volume: 1, currency: 'USD', asOf: '2026-01-01T00:00:00Z' },
];

const settle = (ms = 50) => new Promise((r) => setTimeout(r, ms));

async function render(settings: Partial<BlotterSettings> = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: BLOTTER_SETTINGS, useValue: { apiBaseUrl: 'http://api.test', pollIntervalMs: 0, ...settings } },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(BlotterPage);
  fixture.autoDetectChanges();
  return { fixture, http, host: fixture.nativeElement as HTMLElement };
}

const text = (host: HTMLElement, symbol: string, col: string) =>
  host.querySelector(`[row-id="${symbol}"] [col-id="${col}"]`)?.textContent?.trim();

describe('NFR-ARCH1 BlotterPage', () => {
  it('NFR-ARCH1 renders a main landmark with an h1 "Blotter"', async () => {
    const { host } = await render();
    expect(host.querySelector('main > h1')?.textContent).toBe('Blotter');
  });
});

describe('FR1 BlotterPage quotes', () => {
  it('FR1 lists last, change and change % from GET /quotes', async () => {
    const { http, host, fixture } = await render();
    http.expectOne('http://api.test/quotes').flush(QUOTES);
    await fixture.whenStable();
    await settle();
    expect(text(host, 'AAPL', 'last')).toBe('228.50');
    expect(text(host, 'AAPL', 'change')).toBe('+1.93');
    expect(text(host, 'MSFT', 'changePct')).toBe('−1.20%');
  });

  it('FR1 fetches once when pollIntervalMs is 0', async () => {
    const { http } = await render({ pollIntervalMs: 0 });
    http.expectOne('http://api.test/quotes').flush(QUOTES);
    await settle(60);
    http.expectNone('http://api.test/quotes');
  });

  it('FR1 re-fetches every pollIntervalMs and updates rows in place', async () => {
    const { http, host, fixture } = await render({ pollIntervalMs: 30 });
    http.expectOne('http://api.test/quotes').flush(QUOTES);
    await settle(60);
    http.expectOne('http://api.test/quotes').flush([{ ...QUOTES[0], last: 230 }, QUOTES[1]]);
    await fixture.whenStable();
    await settle();
    expect(text(host, 'AAPL', 'last')).toBe('230.00');
    expect(host.querySelectorAll('[role="row"][row-id]').length).toBe(2);
  });

  it('FR1 shows an alert when GET /quotes fails and keeps polling', async () => {
    const { http, host, fixture } = await render({ pollIntervalMs: 30 });
    http.expectOne('http://api.test/quotes').flush('boom', { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Could not load quotes');
    await settle(60);
    http.expectOne('http://api.test/quotes').flush(QUOTES);
    await fixture.whenStable();
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });

  it('NFR-A2 has no serious axe violations once quotes are shown', async () => {
    const { http, host, fixture } = await render();
    http.expectOne('http://api.test/quotes').flush(QUOTES);
    await fixture.whenStable();
    await settle();
    expect(await a11yViolations(host)).toEqual([]);
  });
});
