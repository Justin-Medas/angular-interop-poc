import { readFileSync } from 'node:fs';
import { contrast } from './contrast';

const tokensCss = readFileSync('projects/ui/src/styles/tokens.css', 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

type Tokens = Record<string, string>;

/** Collects `--name: value` declarations from every block whose selector equals `selector`. */
function block(selector: string): Tokens {
  const out: Tokens = {};
  const re = /([^{}]+)\{([^}]*)\}/g;
  for (const [, sel, body] of tokensCss.matchAll(re)) {
    if (sel.replace(/\s+/g, ' ').replace(/'/g, '"').trim() !== selector) continue;
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      out[name] = value.trim();
    }
  }
  return out;
}

const primitives = block(':root');
const themes: Record<string, Tokens> = {
  dark: block(':root, [data-theme="dark"]'),
  light: block('[data-theme="light"]'),
};

/** Resolves `var(--x)` chains to a hex value. */
function resolve(theme: Tokens, name: string): string {
  const raw = theme[name] ?? primitives[name];
  const ref = /^var\((--[\w-]+)\)$/.exec(raw ?? '');
  return ref ? resolve(theme, ref[1]) : (raw ?? '');
}

const surfaces = ['bg', 'surface', 'surface-raised', 'surface-hover', 'surface-selected'];
const texts: [string, number][] = [
  ['text', 4.5],
  ['text-muted', 4.5],
  ['link', 4.5],
  ['accent-text', 4.5],
  ['up', 4.5],
  ['down', 4.5],
  ['danger', 4.5],
  ['border-control', 3],
  ['focus', 3],
];

describe('NFR-DS tokens.css', () => {
  it('NFR-DS1 defines primitives, a dark default and a light theme', () => {
    expect(Object.keys(primitives)).toContain('--poc-neutral-950');
    expect(Object.keys(themes['dark'])).toContain('--poc-color-bg');
    expect(Object.keys(themes['light'])).toContain('--poc-color-bg');
  });

  it('NFR-DS4 both themes define the same semantic colors', () => {
    expect(Object.keys(themes['light']).sort()).toEqual(Object.keys(themes['dark']).sort());
  });

  it('NFR-DS2 semantic colors resolve to hex values', () => {
    for (const [theme, tokens] of Object.entries(themes)) {
      for (const name of Object.keys(tokens)) {
        expect(resolve(tokens, name), `${theme} ${name}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });

  it('NFR-A5 reduced motion zeroes both motion tokens', () => {
    const reduced = tokensCss.slice(tokensCss.indexOf('prefers-reduced-motion'));
    expect(reduced).toMatch(/--poc-motion-fast:\s*0ms/);
    expect(reduced).toMatch(/--poc-motion-base:\s*0ms/);
  });

  it('NFR-DS6 transition tokens exist for color and focus', () => {
    expect(Object.keys(primitives)).toEqual(
      expect.arrayContaining(['--poc-transition-color', '--poc-transition-focus']),
    );
  });

  it('NFR-A5 NFR-DS6 transition tokens use only motion tokens, never literal times', () => {
    const transitions = Object.entries(primitives).filter(([n]) =>
      n.startsWith('--poc-transition-'),
    );
    expect(transitions.length).toBeGreaterThan(0);
    for (const [name, value] of transitions) {
      expect(value, name).not.toMatch(/\d(ms|s)\b/);
      expect(value, name).toContain('var(--poc-motion-fast)');
      expect(value, name).toContain('var(--poc-motion-ease)');
    }
  });

  it('NFR-DS6 the idle focus ring is transparent so the ring can animate in', () => {
    expect(primitives['--poc-focus-ring-idle']).toContain('transparent');
  });

  for (const theme of Object.keys(themes)) {
    describe(`NFR-DS4 contrast, ${theme} theme`, () => {
      for (const [name, min] of texts) {
        for (const surface of surfaces) {
          it(`${name} on ${surface} is at least ${min}:1`, () => {
            const t = themes[theme];
            const ratio = contrast(
              resolve(t, `--poc-color-${name}`),
              resolve(t, `--poc-color-${surface}`),
            );
            expect(ratio).toBeGreaterThanOrEqual(min);
          });
        }
      }
      for (const fill of ['accent', 'accent-hover']) {
        it(`on-accent on ${fill} is at least 4.5:1`, () => {
          const t = themes[theme];
          expect(
            contrast(resolve(t, '--poc-color-on-accent'), resolve(t, `--poc-color-${fill}`)),
          ).toBeGreaterThanOrEqual(4.5);
        });
      }
    });
  }
});
