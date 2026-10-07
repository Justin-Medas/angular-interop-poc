import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('NFR-ARCH1 /apps/* routes render a library full-page without shell chrome', () => {
  async function visit(url: string): Promise<HTMLElement> {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
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
