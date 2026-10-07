import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  use: { baseURL: 'http://localhost:4200' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
