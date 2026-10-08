import { TestBed } from '@angular/core/testing';
import { a11yViolations } from '../../testing/axe';
import { PocBadge } from './poc-badge';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(PocBadge);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('NFR-DS PocBadge', () => {
  it('NFR-A1 always shows its text', () => {
    expect(render({ text: 'fdc3' }).textContent?.trim()).toBe('fdc3');
  });

  it('NFR-A1 tone defaults to neutral and can be set', () => {
    expect(render({ text: 'x' }).querySelector('.badge')!.classList).toContain('neutral');
    expect(render({ text: 'x', tone: 'warn' }).querySelector('.badge')!.classList).toContain(
      'warn',
    );
  });

  it('NFR-A1 an abbreviated badge exposes its long label to assistive tech', () => {
    const host = render({ text: 'fb', label: 'Fallback plan' });
    expect(host.querySelector('[aria-hidden="true"]')!.textContent).toBe('fb');
    expect(host.querySelector('.sr-only')!.textContent).toBe('Fallback plan');
  });

  it('NFR-A1 without a label there is no hidden duplicate', () => {
    const host = render({ text: 'model' });
    expect(host.querySelector('.sr-only')).toBeNull();
    expect(host.querySelector('[aria-hidden]')).toBeNull();
  });

  it('NFR-A2 has no serious axe violations', async () => {
    expect(await a11yViolations(render({ text: 'fb', label: 'Fallback plan' }))).toEqual([]);
  });
});
