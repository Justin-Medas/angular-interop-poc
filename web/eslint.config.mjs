import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

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
