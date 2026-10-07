import { TestBed } from '@angular/core/testing';
import { a11yViolations } from '../../testing/axe';
import { PocCard } from './poc-card';

function render(heading?: string) {
  const fixture = TestBed.createComponent(PocCard);
  if (heading) fixture.componentRef.setInput('heading', heading);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('NFR-DS PocCard', () => {
  it('NFR-A1 renders a region named by its heading', () => {
    const host = render('Movers');
    const section = host.querySelector('section')!;
    const h2 = host.querySelector('h2')!;
    expect(h2.textContent).toBe('Movers');
    expect(section.getAttribute('aria-labelledby')).toBe(h2.id);
  });

  it('NFR-A1 without a heading renders no h2 and no aria-labelledby', () => {
    const host = render();
    expect(host.querySelector('h2')).toBeNull();
    expect(host.querySelector('section')!.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('NFR-A2 has no serious axe violations', async () => {
    expect(await a11yViolations(render('Movers'))).toEqual([]);
  });
});
