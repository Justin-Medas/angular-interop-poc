import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { appConfig } from './app.config';

const VALID_CONFIG = {
  environment: 'local',
  apiBaseUrl: 'http://localhost:8080',
  interop: { provider: 'in-memory', connectTimeoutMs: 3000 },
  quotes: { pollIntervalMs: 0 },
  auth: {
    enabled: false,
    clientId: '',
    authority: '',
    redirectUri: '',
    cacheLocation: 'memory',
    scopes: [],
  },
};

describe('NFR-ARCH1 appConfig', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('NFR-ARCH1 wires the router so the production config can reach /apps/blotter', async () => {
    const real = globalThis.fetch;
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) =>
      url === '/config.json' ? new Response(JSON.stringify(VALID_CONFIG)) : real(url, init),
    );
    TestBed.configureTestingModule({ providers: appConfig.providers });
    await TestBed.inject(ApplicationInitStatus).donePromise;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/apps/blotter');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Blotter');
  });
});

describe('FR10 appConfig', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('FR10 loads /config.json before the app is usable', async () => {
    const fetchMock = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({ providers: appConfig.providers });
    await TestBed.inject(ApplicationInitStatus).donePromise;
    expect(fetchMock).toHaveBeenCalledWith('/config.json', { cache: 'no-store' });
  });
});
