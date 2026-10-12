// Playwright configuration for the visual snapshot suite (specs/testing.md §6, NFR-T1).
// Runs only inside the pinned Playwright Linux image (scripts/visual.mjs locally, the `visual` job in ci.yml),
// so baselines render with the same fonts and Chromium build everywhere.
import { defineConfig, devices } from '@playwright/test';

const ci = !!process.env['CI'];
// scripts/visual.mjs cross-compiles the API for the container (which has no Go toolchain); CI uses `go run`.
const apiCommand = process.env['VISUAL_API_BIN'] ?? 'go run ./cmd/server';

export default defineConfig({
  testDir: 'e2e/visual',
  testMatch: '**/*.visual.ts',
  // Baselines live in __screenshots__/<file>/<name>.png, independent of OS or project name (testing.md §6).
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFileName}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: ci,
  retries: 0,
  reporter: ci ? [['github'], ['html', { open: 'never' }]] : [['list']],
  expect: {
    toHaveScreenshot: {
      // Determinism (testing.md §6): no animation, no blinking caret, tiny tolerance for anti-aliasing.
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.002,
    },
  },
  use: {
    baseURL: 'http://localhost:4200',
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: [
    {
      command: apiCommand,
      cwd: '../api',
      url: 'http://localhost:8080/healthz',
      reuseExistingServer: !ci,
      env: { ANTHROPIC_API_KEY: '' },
    },
    {
      // The ci build configuration: in-memory interop, no polling, dark theme (config/ci/config.json).
      command: 'npx ng serve shell --configuration ci --port 4200',
      url: 'http://localhost:4200',
      reuseExistingServer: !ci,
      timeout: 120_000,
    },
  ],
});
