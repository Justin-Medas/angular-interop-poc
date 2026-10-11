// ESLint flat config. Enforces the architecture rules as code: import boundaries (NFR-ARCH2), Angular conventions
// (NFR-ARCH3), template accessibility (NFR-A7), banned untrusted-HTML sinks (NFR-S5) and doc comments on exports (NFR-C2).
// tools/lint-rules.test.mjs proves each rule fires, so a rule cannot be silently weakened.
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import jsdoc from 'eslint-plugin-jsdoc';

// Import boundaries (SPEC NFR-ARCH2). Flat config lets a later block replace an earlier
// `no-restricted-imports`, so each library gets one complete list built from these parts.
const ban = (group, message) => ({ group, message });
const DEEP = ban(
  ['@poc/*/*', '**/projects/**'],
  'Import a library only through its public API (@poc/ui, @poc/interop).',
);
const AG_GRID = ban(
  ['ag-grid-*'],
  'ag-grid-* is allowed only inside projects/ui. Use <poc-data-table>.',
);
const FDC3 = ban(
  ['@finos/fdc3', '@finos/fdc3/*'],
  '@finos/fdc3 is allowed only inside projects/interop. Inject INTEROP.',
);
const NO_FEATURES = ban(
  ['@poc/blotter', '@poc/detail'],
  'ui and interop must not depend on feature libraries.',
);
const NO_SIBLINGS = ban(
  ['@poc/blotter', '@poc/detail'],
  'Feature libraries talk only through InteropService, never by import.',
);

const restrict = (...patterns) => ({ 'no-restricted-imports': ['error', { patterns }] });

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', '.angular/**', 'node_modules/**', 'tools/**'] },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'poc', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'poc', style: 'kebab-case' },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-standalone': 'error',
      // Agent output is untrusted text (project.md Forbidden): never bypass Angular's sanitizer.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'MemberExpression[property.name=/^bypassSecurityTrust/]',
          message: 'bypassSecurityTrust* is banned; render untrusted text with interpolation.',
        },
      ],
    },
  },
  // Code documentation (NFR-C2, specs/code-documentation.md): every exported symbol carries a doc
  // comment with a real description. File headers are checked by scripts/check-comments.mjs.
  // Tests are exempt; their names carry the spec ID (testing.md §10).
  {
    files: ['**/*.ts', '**/*.mjs'],
    ignores: ['**/*.spec.ts', '**/*.e2e.ts', '**/*.d.ts', '**/*.test.mjs', 'e2e/a11y.ts'],
    plugins: { jsdoc },
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          // Only the export context below fires, so a function is not reported twice.
          require: { FunctionDeclaration: false },
          contexts: ['ExportNamedDeclaration[declaration]'],
        },
      ],
      'jsdoc/require-description': ['error', { contexts: ['ExportNamedDeclaration[declaration]'] }],
    },
  },
  { files: ['projects/ui/**/*.ts'], rules: restrict(DEEP, FDC3, NO_FEATURES) },
  { files: ['projects/interop/**/*.ts'], rules: restrict(DEEP, AG_GRID, NO_FEATURES) },
  {
    files: ['projects/blotter/**/*.ts', 'projects/detail/**/*.ts'],
    rules: restrict(DEEP, AG_GRID, FDC3, NO_SIBLINGS),
  },
  // The shell lazy-loads the feature libraries, so it may import them, but nothing deeper.
  { files: ['projects/shell/**/*.ts'], rules: restrict(DEEP, AG_GRID, FDC3) },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      // Agent output is untrusted text: [innerHTML] / [outerHTML] bindings are banned.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'BoundAttribute[name=/^(innerHTML|outerHTML)$/]',
          message: '[innerHTML] is banned; render untrusted text with interpolation.',
        },
      ],
      '@angular-eslint/template/prefer-control-flow': 'error',
    },
  },
);
