import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { appConfig } from './app.config';

describe('NFR-ARCH1 appConfig', () => {
  it('NFR-ARCH1 wires the router so the production config can reach /apps/blotter', async () => {
    TestBed.configureTestingModule({ providers: appConfig.providers });
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
