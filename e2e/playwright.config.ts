import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // A test that only passes on a rerun is a flaky test, and CI must not be able
  // to hide one by accident.
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI === undefined ? 0 : 1,
  reporter: process.env.CI === undefined ? [['list']] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      // 360px is the narrowest layout the design system is checked at.
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      // The account journey is a flow, not a layout: running it a second time
      // at a second width proves nothing and doubles how many accounts a run
      // registers, which the API rate limits at ten per hour per address.
      testIgnore: /auth-journey\.spec\.ts/,
    },
  ],
  webServer: {
    // The production build, not the dev server: security headers, static
    // rendering and the real bundle are exactly what these tests are about.
    command: 'pnpm --filter @hireevo/web build && pnpm --filter @hireevo/web start',
    cwd: '..',
    url: `${baseURL}/api/health`,
    reuseExistingServer: process.env.CI === undefined,
    timeout: 180_000,
  },
});
