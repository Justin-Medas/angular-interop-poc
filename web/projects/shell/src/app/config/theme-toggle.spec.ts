import { TestBed } from '@angular/core/testing';
import { a11yViolations } from '../../../../ui/src/testing/axe';
import { RuntimeConfig, RuntimeConfigStore } from './runtime-config';
import { ThemeToggle } from './theme-toggle';

function render() {
  TestBed.inject(RuntimeConfigStore).config.set({ theme: 'dark' } as RuntimeConfig);
  const fixture = TestBed.createComponent(ThemeToggle);
  fixture.detectChanges();
  const host: HTMLElement = fixture.nativeElement;
  return { fixture, host, button: host.querySelector('button') as HTMLButtonElement };
}

describe('FR11 ThemeToggle', () => {
  beforeEach(() => localStorage.clear());

  it('FR11 NFR-A3 is a button named for the action it performs', () => {
    expect(render().button.textContent?.trim()).toBe('Switch to light theme');
  });

  it('FR11 clicking switches the theme and the name follows', () => {
    const { fixture, button } = render();
    button.click();
    fixture.detectChanges();
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(button.textContent?.trim()).toBe('Switch to dark theme');
  });

  it('NFR-A2 has no serious axe violations', async () => {
    expect(await a11yViolations(render().host)).toEqual([]);
  });
});
