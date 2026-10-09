import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { INTEROP_OPTIONS, provideInterop } from '@poc/interop';
import { RouterTestingHarness } from '@angular/router/testing';
import { a11yViolations } from '../../../../ui/src/testing/axe';
import { routes } from '../app.routes';
import { RuntimeConfig, RuntimeConfigStore } from '../config/runtime-config';

async function visit(url: string, config: Partial<RuntimeConfig> = { environment: 'local' }) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideInterop(),
      { provide: INTEROP_OPTIONS, useValue: { provider: 'in-memory', connectTimeoutMs: 100 } },
    ],
  });
  TestBed.inject(RuntimeConfigStore).config.set({ theme: 'dark', ...config } as RuntimeConfig);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  harness.detectChanges();
  return harness.fixture.nativeElement as HTMLElement;
}

describe('FR14 shell layout at /', () => {
  it('FR14 has banner, main and one h1 landmark structure (accessibility.md §4)', async () => {
    const el = await visit('/');
    expect(el.querySelectorAll('header')).toHaveLength(1);
    expect(el.querySelectorAll('main')).toHaveLength(1);
    expect(el.querySelectorAll('h1')).toHaveLength(1);
    expect(el.querySelector('header h1')?.textContent).toBe('Interop Workspace');
  });

  it('FR14 shows the environment from runtime config as a badge with text', async () => {
    const el = await visit('/', { environment: 'docker' });
    expect(el.querySelector('header poc-badge')?.textContent?.trim()).toBe('docker');
  });

  it('FR14 shows no environment badge when no config is loaded', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideInterop(),
        { provide: INTEROP_OPTIONS, useValue: { provider: 'in-memory', connectTimeoutMs: 100 } },
      ],
    });
    TestBed.inject(RuntimeConfigStore).config.set(null);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    expect(harness.fixture.nativeElement.querySelector('header poc-badge')).toBeNull();
  });

  it('FR11 puts the theme toggle in the header', async () => {
    const el = await visit('/');
    expect(el.querySelector('header poc-theme-toggle button')?.textContent).toContain(
      'Switch to light theme',
    );
  });

  it('FR8 renders the empty workspace inside main until a plan arrives', async () => {
    const el = await visit('/');
    expect(el.querySelector('main h2')?.textContent).toBe('Workspace');
    expect(el.querySelector('main')?.textContent).toContain('No modules loaded yet');
  });

  it('NFR-A2 has no axe violations', async () => {
    const el = await visit('/');
    expect(await a11yViolations(el)).toEqual([]);
  });
});

describe('NFR-ARCH1 routing keeps chrome out of /apps/*', () => {
  it('NFR-ARCH1 /apps/blotter has no shell header or toggle', async () => {
    const el = await visit('/apps/blotter');
    expect(el.querySelector('header')).toBeNull();
    expect(el.querySelector('poc-theme-toggle')).toBeNull();
  });
});
