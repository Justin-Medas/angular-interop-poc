import { TestBed } from '@angular/core/testing';
import { a11yViolations } from '../../../../ui/src/testing/axe';
import { ConfigErrorScreen } from './config-error';

function render(issues: string[]) {
  const fixture = TestBed.createComponent(ConfigErrorScreen);
  fixture.componentRef.setInput('issues', issues);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('FR10 ConfigErrorScreen', () => {
  it('FR10 shows a main landmark, an h1 and every issue', () => {
    const host = render(['/environment must be equal to one of the allowed values', 'HTTP 404']);
    expect(host.querySelectorAll('main')).toHaveLength(1);
    expect(host.querySelector('h1')?.textContent).toBe('Configuration error');
    const items = [...host.querySelectorAll('li')].map((li) => li.textContent);
    expect(items).toEqual(['/environment must be equal to one of the allowed values', 'HTTP 404']);
  });

  it('FR10 NFR-A4 announces itself as an alert and says how to fix it', () => {
    const host = render(['x']);
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    expect(host.textContent).toContain('specs/runtime-config.schema.json');
  });

  it('NFR-A2 has no serious axe violations', async () => {
    expect(await a11yViolations(render(['x']))).toEqual([]);
  });
});
