import { TestBed } from '@angular/core/testing';
import { a11yViolations } from '../../testing/axe';
import { PocLineChart } from './poc-line-chart';

const POINTS = [
  { t: '2026-01-01T14:30:00Z', price: 100 },
  { t: '2026-01-01T14:35:00Z', price: 102 },
  { t: '2026-01-01T14:40:00Z', price: 101 },
];

function render(points = POINTS, title = 'AAPL, 1 day') {
  const fixture = TestBed.createComponent(PocLineChart);
  fixture.componentRef.setInput('points', points);
  fixture.componentRef.setInput('title', title);
  fixture.detectChanges();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

describe('FR12 PocLineChart', () => {
  it('FR12 draws an svg role=img with a summarizing aria-label', () => {
    const { host } = render();
    const svg = host.querySelector('svg[role="img"]');
    expect(svg?.getAttribute('aria-label')).toBe('AAPL, 1 day: 100.00 to 101.00, up 1.00%');
  });

  it('FR12 summarizes a falling series with "down" and a minus sign', () => {
    const { host } = render([POINTS[1], POINTS[0]]);
    expect(host.querySelector('svg')?.getAttribute('aria-label')).toContain('down −1.96%');
  });

  it('FR12 draws one polyline using currentColor with one vertex per point', () => {
    const { host } = render();
    const line = host.querySelector('polyline')!;
    expect(line.getAttribute('points')!.trim().split(' ').length).toBe(3);
    expect(line.getAttribute('stroke')).toBe('currentColor');
  });

  it('FR12 offers the points in a visually hidden data table', () => {
    const { host } = render();
    expect(host.querySelectorAll('table tbody tr').length).toBe(3);
    expect(host.querySelector('table caption')?.textContent).toContain('AAPL, 1 day');
  });

  it('FR12 renders an empty-state message and no svg without points', () => {
    const { host } = render([]);
    expect(host.querySelector('svg')).toBeNull();
    expect(host.textContent).toContain('No data');
  });

  it('FR12 a single point does not divide by zero', () => {
    const { host } = render([POINTS[0]]);
    expect(host.querySelector('polyline')!.getAttribute('points')).not.toContain('NaN');
  });

  it('NFR-A2 has no serious axe violations', async () => {
    const { host } = render();
    expect(await a11yViolations(host)).toEqual([]);
  });
});
