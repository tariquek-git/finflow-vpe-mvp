import { defineConfig } from '@playwright/test';

const playwrightPort = Number(process.env.PW_PORT || 4173);
const playwrightHost = `http://127.0.0.1:${playwrightPort}`;
const reuseExistingServer = process.env.PW_REUSE_SERVER === '1';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: playwrightHost,
    trace: 'on-first-retry',
    viewport: { width: 1440, height: 900 }
  },
  webServer: {
    command: `npm run dev -- --port ${playwrightPort}`,
    url: playwrightHost,
    // Deterministic by default; opt-in reuse only with PW_REUSE_SERVER=1.
    reuseExistingServer,
    timeout: 120_000
  }
});
