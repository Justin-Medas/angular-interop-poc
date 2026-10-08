import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';

async function visit(): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/dev/ui-gallery');
  await new Promise((r) => setTimeout(r, 50));
  return harness.routeNativeElement as HTMLElement;
}

describe('NFR-DS /dev/ui-gallery', () => {
  it('NFR-A1 has one main landmark with an h1 "UI Gallery"', async () => {
    const el = await visit();
    expect(el.querySelectorAll('main')).toHaveLength(1);
    expect(el.querySelector('h1')?.textContent).toBe('UI Gallery');
  });

  it('FR11 offers the theme toggle', async () => {
    const el = await visit();
    expect(el.querySelector('poc-theme-toggle button')?.textContent?.trim()).toBe(
      'Switch to light theme',
    );
  });

  it('NFR-DS renders every component in both the dark and the light theme', async () => {
    const el = await visit();
    for (const theme of ['dark', 'light']) {
      const scope = el.querySelector(`[data-theme="${theme}"]`)!;
      expect(scope, theme).not.toBeNull();
      for (const tag of ['poc-button', 'poc-card', 'poc-badge', 'poc-tabs', 'poc-data-table']) {
        expect(scope.querySelector(tag), `${theme} ${tag}`).not.toBeNull();
      }
    }
  });

  it('NFR-DS the gallery tabs switch their panel', async () => {
    const el = await visit();
    const tab = el.querySelector<HTMLElement>('[data-theme="dark"] [role="tab"]:nth-of-type(2)')!;
    tab.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(el.querySelector('[data-theme="dark"] [role="tabpanel"]')?.textContent).toContain(
      'Chart',
    );
  });

  it('FR3 clicking a gallery row selects it', async () => {
    const el = await visit();
    const dark = el.querySelector('[data-theme="dark"]')!;
    dark.querySelector<HTMLElement>('[row-id="AAPL"] [col-id="symbol"]')!.click();
    await new Promise((r) => setTimeout(r, 50));
    expect(dark.querySelector('[row-id="AAPL"]')?.getAttribute('aria-selected')).toBe('true');
  });
});
