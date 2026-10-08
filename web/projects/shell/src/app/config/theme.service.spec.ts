import { TestBed } from '@angular/core/testing';
import { RuntimeConfig, RuntimeConfigStore } from './runtime-config';
import { ThemeService } from './theme.service';

const KEY = 'poc-theme';

function setup(configTheme?: 'dark' | 'light' | null) {
  const store = TestBed.inject(RuntimeConfigStore);
  if (configTheme !== null) store.config.set({ theme: configTheme } as RuntimeConfig);
  const service = TestBed.inject(ThemeService);
  TestBed.tick();
  return service;
}

describe('FR11 ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('FR11 defaults to dark when config has no theme', () => {
    expect(setup(undefined).theme()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('FR11 defaults to dark when the config failed to load', () => {
    expect(setup(null).theme()).toBe('dark');
  });

  it('FR11 starts from the theme in runtime config', () => {
    expect(setup('light').theme()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('FR11 toggle() flips data-theme on <html> at runtime', () => {
    const service = setup('dark');
    service.toggle();
    TestBed.tick();
    expect(service.theme()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
    service.toggle();
    TestBed.tick();
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('FR11 remembers the choice and a remembered choice beats the config theme', () => {
    setup('dark').toggle();
    expect(localStorage.getItem(KEY)).toBe('light');
    TestBed.resetTestingModule();
    expect(setup('dark').theme()).toBe('light');
  });

  it('FR11 ignores a stored value that is not a theme', () => {
    localStorage.setItem(KEY, 'neon');
    expect(setup('light').theme()).toBe('light');
  });

  it('FR11 still toggles when storage is unavailable (best effort)', () => {
    const deny = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(deny);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(deny);
    const service = setup('dark');
    service.toggle();
    expect(service.theme()).toBe('light');
    vi.restoreAllMocks();
  });
});
