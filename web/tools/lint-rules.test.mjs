// Proves the lint gates actually fire. Each case lints a snippet as if it lived at `file`
// and asserts which rule (if any) reports. Run: npm run test:lint
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';
import stylelint from 'stylelint';

const eslint = new ESLint({ cwd: new URL('..', import.meta.url).pathname });

async function esRules(code, file) {
  const [res] = await eslint.lintText(code, { filePath: new URL(`../${file}`, import.meta.url).pathname });
  return res.messages.map((m) => m.ruleId);
}

async function cssRules(code, file) {
  const { results } = await stylelint.lint({ code, codeFilename: new URL(`../${file}`, import.meta.url).pathname });
  return results[0].warnings.map((w) => w.rule);
}

const component = (tpl) => `import { Component } from '@angular/core';\n@Component({ selector: 'poc-x', template: \`${tpl}\` })\nexport class X {}\n`;

test('NFR-ARCH2 ag-grid-* is banned outside projects/ui', async () => {
  const rules = await esRules(`import { GridApi } from 'ag-grid-community';\nexport type T = GridApi;\n`, 'projects/blotter/src/lib/x.ts');
  assert.ok(rules.includes('no-restricted-imports'), rules.join());
});

test('NFR-ARCH2 ag-grid-* is allowed inside projects/ui', async () => {
  const rules = await esRules(`import { GridApi } from 'ag-grid-community';\nexport type T = GridApi;\n`, 'projects/ui/src/lib/x.ts');
  assert.ok(!rules.includes('no-restricted-imports'), rules.join());
});

test('NFR-ARCH2 @finos/fdc3 is banned outside projects/interop', async () => {
  const rules = await esRules(`import { getAgent } from '@finos/fdc3';\nexport const g = getAgent;\n`, 'projects/shell/src/app/x.ts');
  assert.ok(rules.includes('no-restricted-imports'), rules.join());
});

test('NFR-ARCH2 @finos/fdc3 is allowed inside projects/interop', async () => {
  const rules = await esRules(`import { getAgent } from '@finos/fdc3';\nexport const g = getAgent;\n`, 'projects/interop/src/lib/x.ts');
  assert.ok(!rules.includes('no-restricted-imports'), rules.join());
});

test('NFR-ARCH2 a feature library cannot deep-import another library or reach into its internals', async () => {
  const rules = await esRules(`import { X } from '@poc/ui/src/lib/x';\nexport const y = X;\n`, 'projects/blotter/src/lib/x.ts');
  assert.ok(rules.includes('no-restricted-imports'), rules.join());
});

test('NFR-ARCH2 a feature library cannot import another feature library', async () => {
  const rules = await esRules(`import { DetailPage } from '@poc/detail';\nexport const y = DetailPage;\n`, 'projects/blotter/src/lib/x.ts');
  assert.ok(rules.includes('no-restricted-imports'), rules.join());
});

test('NFR-ARCH2 feature code may import @poc/ui and @poc/interop public APIs', async () => {
  const rules = await esRules(`import { A } from '@poc/ui';\nimport { B } from '@poc/interop';\nexport const y = [A, B];\n`, 'projects/blotter/src/lib/x.ts');
  assert.ok(!rules.includes('no-restricted-imports'), rules.join());
});

test('NFR-ARCH3 components must be OnPush', async () => {
  const rules = await esRules(component('<p>x</p>'), 'projects/blotter/src/lib/x.ts');
  assert.ok(rules.includes('@angular-eslint/prefer-on-push-component-change-detection'), rules.join());
});

test('NFR-A7 img without alt is reported', async () => {
  const rules = await esRules(component('<img src="a.png">'), 'projects/blotter/src/lib/x.ts');
  assert.ok(rules.includes('@angular-eslint/template/alt-text'), rules.join());
});

test('NFR-A7 click handler on a div without keyboard support is reported', async () => {
  const rules = await esRules(component('<div (click)="go()">go</div>'), 'projects/blotter/src/lib/x.ts');
  assert.ok(rules.includes('@angular-eslint/template/click-events-have-key-events'), rules.join());
});

test('security: [innerHTML] is banned (untrusted agent text)', async () => {
  const rules = await esRules(component('<p [innerHTML]="t"></p>'), 'projects/blotter/src/lib/x.ts');
  assert.ok(rules.includes('@angular-eslint/template/no-inner-html') || rules.includes('no-restricted-syntax'), rules.join());
});

test('security: bypassSecurityTrust* is banned', async () => {
  const rules = await esRules(`export const f = (s: any, v: string) => s.bypassSecurityTrustHtml(v);\n`, 'projects/blotter/src/lib/x.ts');
  assert.ok(rules.includes('no-restricted-syntax'), rules.join());
});

test('NFR-DS2 hex colors are banned outside tokens.css', async () => {
  assert.ok((await cssRules('a { color: #fff; }', 'projects/blotter/src/lib/x.scss')).includes('color-no-hex'));
});

test('NFR-DS2 rgb() is banned outside tokens.css', async () => {
  assert.ok((await cssRules('a { color: rgb(0 0 0); }', 'projects/blotter/src/lib/x.scss')).includes('function-disallowed-list'));
});

test('NFR-DS2 named colors are banned outside tokens.css', async () => {
  assert.ok((await cssRules('a { color: red; }', 'projects/blotter/src/lib/x.scss')).includes('color-named'));
});

test('NFR-DS2 hex colors are allowed in tokens.css', async () => {
  assert.deepEqual(await cssRules(':root { --poc-color-bg: #0b0e14; }', 'projects/ui/src/lib/tokens/tokens.css'), []);
});

test('NFR-DS2 custom properties must be --poc-*', async () => {
  assert.ok((await cssRules('a { --foo: 1px; }', 'projects/blotter/src/lib/x.scss')).includes('custom-property-pattern'));
});

test('NFR-DS2 semantic tokens via var(--poc-*) pass', async () => {
  assert.deepEqual(await cssRules('a { color: var(--poc-color-text); }', 'projects/blotter/src/lib/x.scss'), []);
});
