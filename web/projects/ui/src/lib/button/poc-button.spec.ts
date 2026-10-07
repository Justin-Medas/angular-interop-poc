import { TestBed } from '@angular/core/testing';
import { a11yViolations } from '../../testing/axe';
import { PocButton } from './poc-button';

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(PocButton);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  const host: HTMLElement = fixture.nativeElement;
  return { host, button: host.querySelector('button') as HTMLButtonElement };
}

describe('NFR-DS PocButton', () => {
  it('NFR-A3 renders a real button of type "button" by default', () => {
    const { button } = render();
    expect(button.type).toBe('button');
  });

  it('NFR-A3 can be a submit button', () => {
    expect(render({ type: 'submit' }).button.type).toBe('submit');
  });

  it('NFR-DS1 variant defaults to primary and can be secondary', () => {
    expect(render().button.classList).toContain('primary');
    expect(render({ variant: 'secondary' }).button.classList).toContain('secondary');
  });

  it('NFR-A3 disabled is a native disabled button', () => {
    expect(render({ disabled: true }).button.disabled).toBe(true);
  });

  it('NFR-A5 FR8 busy sets aria-busy and disables the button', () => {
    const { button } = render({ busy: true });
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.disabled).toBe(true);
  });

  it('NFR-A5 not busy leaves aria-busy off', () => {
    expect(render().button.hasAttribute('aria-busy')).toBe(false);
  });

  it('NFR-A2 has no serious axe violations when labelled', async () => {
    const fixture = TestBed.createComponent(PocButton);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    host.querySelector('button')!.setAttribute('aria-label', 'Go');
    expect(await a11yViolations(host)).toEqual([]);
  });
});
