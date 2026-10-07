// Proves the lint gates actually fire. Each case lints a snippet as if it lived at `file`
// and asserts which rule (if any) reports. Run: npm run test:lint
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';
import stylelint from 'stylelint';
import { fileURLToPath } from 'node:url';

const eslint = new ESLint({ cwd: fileURLToPath(new URL('..', import.meta.url)) });

async function esRules(code, file) {
  const [res] = await eslint.lintText(code, {
    filePath: fileURLToPath(new URL(`../${file}`, import.meta.url)),
  });
  return res.messages.map((m) => m.ruleId);
}

async function cssRules(code, file) {
  const { results } = await stylelint.lint({
    code,
    codeFilename: fileURLToPath(new URL(`../${file}`, import.meta.url)),
  });
  return results[0].warnings.map((w) => w.rule);
}

const component = (tpl) =>
  `import { Component } from '@angular/core';\n@Component({ selector: 'poc-x', template: \`${tpl}\` })\nexport class X {}\n`;

test('NFR-ARCH2 ag-grid-* is banned outside projects/ui', async () => {
  const rules = await esRules(
    `import { GridApi } from 'ag-grid-community';\nexport type T = GridApi;\n`,
    'projects/blotter/src/lib/x.ts',
  );
  assert.ok(rules.includes('no-restricted-imports'), rules.join());
});

test('NFR-ARCH2 ag-grid-* is allowed inside projects/ui', async () => {
  const rules = await esRules(
    `import { GridApi } from 'ag-grid-community';\nexport type T = GridApi;\n`,
    'projects/ui/src/lib/x.ts',
  );
  assert.ok(!rules.includes('no-restricted-imports'), rules.join());
});

test('NFR-ARCH2 @finos/fdc3 is banned outside projects/interop', async () => {
  const rules = await esRules(
    `import { getAgent } from '@finos/fdc3';\nexport const g = getAgent;\n`,
    'projects/shell/src/app/x.ts',
  );
  assert.ok(rules.includes('no-restricted-imports'), rules.join());
});

test('NFR-ARCH2 @finos/fdc3 is allowed inside projects/interop', async () => {
  const rules = await esRules(
    `import { getAgent } from '@finos/fdc3';\nexport const g = getAgent;\n`,
    'projects/interop/src/lib/x.ts',
  );
  assert.ok(!rules.includes('no-restricted-imports'), rules.join());
});

test('NFR-ARCH2 a feature library cannot deep-import another library or reach into its internals', async () => {
  const rules = await esRules(
    `import { X } from '@poc/ui/src/lib/x';\nexport const y = X;\n`,
    'projects/blotter/src/lib/x.ts',
  );
  assert.ok(rules.includes('no-restricted-imports'), rules.join());
});

test('NFR-ARCH2 a feature library cannot import another feature library', async () => {
  const rules = await esRules(
    `import { DetailPage } from '@poc/detail';\nexport const y = DetailPage;\n`,
    'projects/blotter/src/lib/x.ts',
  );
  assert.ok(rules.includes('no-restricted-imports'), rules.join());
});

test('NFR-ARCH2 feature code may import @poc/ui and @poc/interop public APIs', async () => {
  const rules = await esRules(
    `import { A } from '@poc/ui';\nimport { B } from '@poc/interop';\nexport const y = [A, B];\n`,
    'projects/blotter/src/lib/x.ts',
  );
  assert.ok(!rules.includes('no-restricted-imports'), rules.join());
});

test('NFR-ARCH3 opting out of OnPush with Eager is reported', async () => {
  const code = `import { ChangeDetectionStrategy, Component } from '@angular/core';\n@Component({ selector: 'poc-x', template: '', changeDetection: ChangeDetectionStrategy.Eager })\nexport class X {}\n`;
  const rules = await esRules(code, 'projects/blotter/src/lib/x.ts');
  assert.ok(
    rules.includes('@angular-eslint/prefer-on-push-component-change-detection'),
    rules.join(),
  );
});

test('NFR-ARCH3 explicit OnPush is accepted (OnPush is the Angular 22 default, DECISIONS #22)', async () => {
  const code = `import { ChangeDetectionStrategy, Component } from '@angular/core';\n@Component({ selector: 'poc-x', template: '', changeDetection: ChangeDetectionStrategy.OnPush })\nexport class X {}\n`;
  const rules = await esRules(code, 'projects/blotter/src/lib/x.ts');
  assert.ok(
    !rules.includes('@angular-eslint/prefer-on-push-component-change-detection'),
    rules.join(),
  );
});

test('NFR-A7 img without alt is reported', async () => {
  const rules = await esRules(component('<img src="a.png">'), 'projects/blotter/src/lib/x.ts');
  assert.ok(rules.includes('@angular-eslint/template/alt-text'), rules.join());
});

test('NFR-A7 click handler on a div without keyboard support is reported', async () => {
  const rules = await esRules(
    component('<div (click)="go()">go</div>'),
    'projects/blotter/src/lib/x.ts',
  );
  assert.ok(rules.includes('@angular-eslint/template/click-events-have-key-events'), rules.join());
});

test('security: [innerHTML] is banned (untrusted agent text)', async () => {
  const rules = await esRules(
    component('<p [innerHTML]="t"></p>'),
    'projects/blotter/src/lib/x.ts',
  );
  assert.ok(rules.includes('no-restricted-syntax'), rules.join());
});

test('security: bypassSecurityTrust* is banned', async () => {
  const rules = await esRules(
    `export const f = (s: any, v: string) => s.bypassSecurityTrustHtml(v);\n`,
    'projects/blotter/src/lib/x.ts',
  );
  assert.ok(rules.includes('no-restricted-syntax'), rules.join());
});

test('NFR-DS2 hex colors are banned outside tokens.css', async () => {
  assert.ok(
    (await cssRules('a { color: #fff; }', 'projects/blotter/src/lib/x.scss')).includes(
      'color-no-hex',
    ),
  );
});

test('NFR-DS2 rgb() is banned outside tokens.css', async () => {
  assert.ok(
    (await cssRules('a { color: rgb(0 0 0); }', 'projects/blotter/src/lib/x.scss')).includes(
      'function-disallowed-list',
    ),
  );
});

test('NFR-DS2 named colors are banned outside tokens.css', async () => {
  assert.ok(
    (await cssRules('a { color: red; }', 'projects/blotter/src/lib/x.scss')).includes(
      'color-named',
    ),
  );
});

test('NFR-DS2 hex colors are allowed in tokens.css', async () => {
  assert.deepEqual(
    await cssRules(':root { --poc-color-bg: #0b0e14; }', 'projects/ui/src/lib/tokens/tokens.css'),
    [],
  );
});

test('NFR-DS2 custom properties must be --poc-*', async () => {
  assert.ok(
    (await cssRules('a { --foo: 1px; }', 'projects/blotter/src/lib/x.scss')).includes(
      'custom-property-pattern',
    ),
  );
});

for (const [name, css] of [
  ['px length', 'a { min-height: 28px; }'],
  ['rem length', 'a { padding: 1rem; }'],
  ['border width', 'a { border: 1px solid var(--poc-color-border); }'],
  ['duration', 'a { transition: color 200ms; }'],
  ['font-weight', 'a { font-weight: 600; }'],
  ['opacity', 'a { opacity: 0.6; }'],
  ['line-height', 'a { line-height: 1.5; }'],
  ['z-index', 'a { z-index: 10; }'],
]) {
  test(`NFR-DS5 physical value is banned outside tokens.css: ${name}`, async () => {
    assert.ok(
      (await cssRules(css, 'projects/blotter/src/lib/x.scss')).includes(
        'declaration-property-value-disallowed-list',
      ),
    );
  });
}

for (const [name, css] of [
  ['raw transition with a motion token', 'a { transition: color var(--poc-motion-fast); }'],
  ['animation shorthand', 'a { animation: spin var(--poc-motion-base); }'],
  ['animation-name', 'a { animation-name: spin; }'],
]) {
  test(`NFR-DS6 only transition tokens may animate: ${name}`, async () => {
    assert.ok(
      (await cssRules(css, 'projects/blotter/src/lib/x.scss')).includes(
        'declaration-property-value-allowed-list',
      ),
    );
  });
}

test('NFR-DS6 transition tokens, lists of them and none pass', async () => {
  assert.deepEqual(
    await cssRules(
      'a { transition: var(--poc-transition-color), var(--poc-transition-focus); } b { transition: none; }',
      'projects/blotter/src/lib/x.scss',
    ),
    [],
  );
});

test('NFR-DS5 physical values are allowed in tokens.css', async () => {
  assert.deepEqual(
    await cssRules(':root { --poc-size-target: 1.75rem; }', 'projects/ui/src/styles/tokens.css'),
    [],
  );
});

test('NFR-DS5 zero, percentages and tokens pass', async () => {
  assert.deepEqual(
    await cssRules(
      'a { margin: 0; width: 100%; clip-path: inset(50%); font-weight: var(--poc-font-weight-strong); min-height: var(--poc-size-target); border: var(--poc-border-width) solid var(--poc-color-border); }',
      'projects/blotter/src/lib/x.scss',
    ),
    [],
  );
});

test('NFR-DS2 semantic tokens via var(--poc-*) pass', async () => {
  assert.deepEqual(
    await cssRules('a { color: var(--poc-color-text); }', 'projects/blotter/src/lib/x.scss'),
    [],
  );
});
