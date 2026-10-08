import { TestBed } from '@angular/core/testing';
import { a11yViolations } from '../../testing/axe';
import { PocTabs } from './poc-tabs';

const TABS = [
  { id: 'quote', label: 'Quote' },
  { id: 'chart', label: 'Chart' },
  { id: 'news', label: 'News' },
];

function render(selected = 'quote') {
  const fixture = TestBed.createComponent(PocTabs);
  fixture.componentRef.setInput('tabs', TABS);
  fixture.componentRef.setInput('selected', selected);
  fixture.detectChanges();
  const host: HTMLElement = fixture.nativeElement;
  const tabs = () => Array.from(host.querySelectorAll<HTMLElement>('[role="tab"]'));
  const key = (i: number, k: string) => {
    tabs()[i].dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    fixture.detectChanges();
  };
  return { fixture, host, tabs, key };
}

describe('NFR-A3 PocTabs (WAI-ARIA tabs pattern)', () => {
  it('has a labelled tablist, tabs and one tabpanel', () => {
    const { host, tabs } = render();
    expect(host.querySelector('[role="tablist"]')).not.toBeNull();
    expect(tabs().map((t) => t.textContent?.trim())).toEqual(['Quote', 'Chart', 'News']);
    expect(host.querySelectorAll('[role="tabpanel"]').length).toBe(1);
  });

  it('marks only the selected tab aria-selected and tabbable (roving tabindex)', () => {
    const { tabs } = render('chart');
    expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(tabs().map((t) => t.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('links the panel to the selected tab and each tab to the panel', () => {
    const { host, tabs } = render('chart');
    const panel = host.querySelector('[role="tabpanel"]')!;
    expect(panel.getAttribute('aria-labelledby')).toBe(tabs()[1].id);
    expect(tabs()[1].getAttribute('aria-controls')).toBe(panel.id);
  });

  it('click selects a tab', () => {
    const { fixture, tabs } = render();
    tabs()[2].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selected()).toBe('news');
  });

  it('ArrowRight and ArrowLeft move selection and focus, wrapping around', () => {
    const { fixture, tabs, key } = render('news');
    key(2, 'ArrowRight');
    expect(fixture.componentInstance.selected()).toBe('quote');
    key(0, 'ArrowLeft');
    expect(fixture.componentInstance.selected()).toBe('news');
    expect(document.activeElement).toBe(tabs()[2]);
  });

  it('Home and End jump to the first and last tab', () => {
    const { fixture, key } = render('chart');
    key(1, 'End');
    expect(fixture.componentInstance.selected()).toBe('news');
    key(2, 'Home');
    expect(fixture.componentInstance.selected()).toBe('quote');
  });

  it('other keys do nothing', () => {
    const { fixture, key } = render('chart');
    key(1, 'a');
    expect(fixture.componentInstance.selected()).toBe('chart');
  });

  it('FR4 changing selected from outside does not steal focus', () => {
    const { fixture, tabs } = render();
    (document.activeElement as HTMLElement | null)?.blur();
    fixture.componentRef.setInput('selected', 'chart');
    fixture.detectChanges();
    expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).not.toBe(tabs()[1]);
  });

  it('NFR-A2 has no serious axe violations', async () => {
    expect(await a11yViolations(render().host)).toEqual([]);
  });
});
