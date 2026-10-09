import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { INTEROP_OPTIONS, provideInterop } from '@poc/interop';
import { RouterTestingHarness } from '@angular/router/testing';
import { blotterSettings, routes } from './app.routes';
import { RUNTIME_CONFIG, RuntimeConfig } from './config/runtime-config';

const CONFIG = {
  apiBaseUrl: 'http://api.test',
  quotes: { pollIntervalMs: 0 },
} as RuntimeConfig;

describe('FR1 blotterSettings maps runtime config to the blotter library settings', () => {
  it('FR1 uses apiBaseUrl and quotes.pollIntervalMs', () => {
    expect(blotterSettings(CONFIG)).toEqual({ apiBaseUrl: 'http://api.test', pollIntervalMs: 0 });
  });

  it('FR1 defaults pollIntervalMs to 2000 when config.quotes is omitted (schema default)', () => {
    expect(blotterSettings({ apiBaseUrl: 'http://api.test' } as RuntimeConfig)).toEqual({
      apiBaseUrl: 'http://api.test',
      pollIntervalMs: 2000,
    });
  });

  it('FR1 /apps/blotter gets its settings from RUNTIME_CONFIG and fetches /quotes', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideInterop(),
        { provide: INTEROP_OPTIONS, useValue: { provider: 'in-memory', connectTimeoutMs: 100 } },
        { provide: RUNTIME_CONFIG, useValue: CONFIG },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/apps/blotter');
    TestBed.inject(HttpTestingController).expectOne('http://api.test/quotes').flush([]);
  });
});

describe('NFR-ARCH1 /apps/* routes render a library full-page without shell chrome', () => {
  async function visit(url: string): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideInterop(),
        { provide: INTEROP_OPTIONS, useValue: { provider: 'in-memory', connectTimeoutMs: 100 } },
        { provide: RUNTIME_CONFIG, useValue: CONFIG },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return harness.routeNativeElement as HTMLElement;
  }

  it('NFR-ARCH1 /apps/blotter shows one main landmark with an h1 "Blotter"', async () => {
    const el = await visit('/apps/blotter');
    expect(el.querySelectorAll('main')).toHaveLength(1);
    expect(el.querySelector('h1')?.textContent).toBe('Blotter');
    expect(el.querySelector('header')).toBeNull();
  });

  it('NFR-ARCH1 /apps/detail shows one main landmark with an h1 "Instrument Detail"', async () => {
    const el = await visit('/apps/detail');
    expect(el.querySelectorAll('main')).toHaveLength(1);
    expect(el.querySelector('h1')?.textContent).toBe('Instrument Detail');
    expect(el.querySelector('header')).toBeNull();
  });
});
