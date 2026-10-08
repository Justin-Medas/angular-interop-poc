import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { RuntimeConfig, RuntimeConfigStore } from './config/runtime-config';

function render() {
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('NFR-ARCH1 App', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('NFR-ARCH1 hosts a router outlet when the config is valid', () => {
    TestBed.inject(RuntimeConfigStore).config.set({ theme: 'dark' } as RuntimeConfig);
    const el = render();
    expect(el.querySelector('router-outlet')).not.toBeNull();
    expect(el.querySelector('poc-config-error')).toBeNull();
  });

  it('FR10 shows the config error screen instead of the app when the config is invalid', () => {
    TestBed.inject(RuntimeConfigStore).errors.set(['/environment is wrong']);
    const el = render();
    expect(el.querySelector('router-outlet')).toBeNull();
    expect(el.querySelector('h1')?.textContent).toBe('Configuration error');
    expect(el.textContent).toContain('/environment is wrong');
  });

  it('FR11 applies the theme from config to <html>', () => {
    TestBed.inject(RuntimeConfigStore).config.set({ theme: 'light' } as RuntimeConfig);
    render();
    TestBed.tick();
    expect(document.documentElement.dataset['theme']).toBe('light');
  });
});
