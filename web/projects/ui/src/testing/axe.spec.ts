import { a11yViolations } from './axe';

describe('NFR-A2 a11yViolations helper', () => {
  it('reports a serious violation (image without alt text)', async () => {
    const el = document.createElement('div');
    el.innerHTML = '<img src="x.png">';
    expect((await a11yViolations(el)).join()).toContain('image-alt');
  });

  it('returns nothing for accessible markup and removes the element again', async () => {
    const el = document.createElement('div');
    el.innerHTML = '<button type="button">Go</button>';
    expect(await a11yViolations(el)).toEqual([]);
    expect(el.isConnected).toBe(false);
  });
});
