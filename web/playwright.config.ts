import { defineConfig, devices } from '@playwright/test';

// specs/testing.md §5: Chromium only; servers started here; 0 retries locally, 1 in CI with a trace.
// The API runs with the SPEC §6.3 defaults and no ANTHROPIC_API_KEY. The web app will switch to
// config.ci.json (in-memory interop, no polling) once runtime config lands (FR10).
const ci = !!process.env['CI'];

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL: 'http://localhost:4200', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'go run ./cmd/server',
      cwd: '../api',
      url: 'http://localhost:8080/healthz',
      reuseExistingServer: !ci,
      env: { ANTHROPIC_API_KEY: '' },
    },
    {
      command: 'npx ng serve shell --port 4200',
      url: 'http://localhost:4200',
      reuseExistingServer: !ci,
      timeout: 120_000,
    },
  ],
});
