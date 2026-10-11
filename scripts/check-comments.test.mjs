// Tests for check-comments.mjs (NFR-C1, NFR-C4, NFR-C5): proves the header rule fires per file type
// and that exempt files are skipped. Run: node --test scripts/check-comments.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { headerProblem, isChecked } from './check-comments.mjs';

test('NFR-C1 a TypeScript file without a header is reported', () => {
  assert.match(headerProblem('a.ts', 'export const x = 1;\n'), /header/);
});

test('NFR-C1 a TypeScript file with a leading // or /** comment passes', () => {
  assert.equal(headerProblem('a.ts', '// What and why.\nexport const x = 1;\n'), null);
  assert.equal(headerProblem('a.ts', '/** What and why. */\nexport const x = 1;\n'), null);
});

test('NFR-C4 a shebang line is skipped before looking for the header', () => {
  assert.equal(headerProblem('a.mjs', '#!/usr/bin/env node\n// Does X.\nimport x from "x";\n'), null);
  assert.match(headerProblem('a.mjs', '#!/usr/bin/env node\nimport x from "x";\n'), /header/);
});

test('NFR-C4 Go, SCSS and CSS need a comment first', () => {
  assert.match(headerProblem('a.go', 'package x\n'), /header/);
  assert.equal(headerProblem('a.go', '// Package x does y.\npackage x\n'), null);
  assert.match(headerProblem('a.scss', ':host { display: block; }\n'), /header/);
  assert.equal(headerProblem('a.css', '/* Tokens. */\n:root {}\n'), null);
});

test('NFR-C4 YAML, Dockerfiles and git hooks need a # comment first', () => {
  assert.match(headerProblem('ci.yml', 'name: ci\n'), /header/);
  assert.equal(headerProblem('ci.yml', '# Runs the tests.\nname: ci\n'), null);
  assert.match(headerProblem('docker/api.Dockerfile', 'FROM golang\n'), /header/);
  assert.equal(headerProblem('.githooks/pre-push', '#!/bin/sh\n# Blocks pushes to main.\nexit 0\n'), null);
});

test('NFR-C4 tests, declarations, JSON and templates are exempt', () => {
  for (const f of ['a.spec.ts', 'a_test.go', 'a.e2e.ts', 'a.d.ts', 'package.json', 'a.html', 'web/node_modules/x/a.ts'])
    assert.equal(isChecked(f), false, f);
  for (const f of ['a.ts', 'a.go', 'a.scss', '.github/workflows/ci.yml', 'docker/api.Dockerfile', '.githooks/pre-push'])
    assert.equal(isChecked(f), true, f);
});
