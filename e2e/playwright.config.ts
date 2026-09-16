import { defineConfig, devices } from '@playwright/test';

/**
 * Its own port, not the dev server's.
 *
 * These tests are about a production build — the security headers differ from
 * development's on purpose — so the suite starts its own and never reuses
 * whatever is already listening. Sharing 3100 meant a developer with `pnpm dev`
 * running got a failure that was really a mis-run.
 */
const PORT = 3101;
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
      // The panel is hidden below `lg`, so its geometry has nothing to check
      // at a phone width. The resolution sweep resizes one page from 320px to
      // 4K, which a phone's fixed screen cannot be; the desktop engines run it.
      testIgnore:
        /auth-journey\.spec\.ts|marketing-panel\.spec\.ts|resolution-sweep\.spec\.ts|workspace-layout\.spec\.ts|client-profile-layout\.spec\.ts|profile-setup-layout\.spec\.ts/,
    },
    // Layout is where rendering engines disagree — container query units,
    // `dvh`, blend modes, flex and grid sizing — so the layout suites run on
    // every engine a HireEvo user can arrive with. Everything else in the suite
    // is behaviour rather than layout, and running it three more times would
    // prove nothing new while registering three times as many accounts.
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch:
        /(responsive|resolution-sweep|workspace-layout|client-profile-layout|profile-setup-layout)\.spec\.ts/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch:
        /(responsive|resolution-sweep|workspace-layout|client-profile-layout|profile-setup-layout)\.spec\.ts/,
    },
    // A phone Safari, not just a narrow desktop one: touch, mobile viewport
    // handling and the dynamic toolbar are what break layouts on real iPhones.
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
      testMatch: /responsive\.spec\.ts/,
    },
  ],
  webServer: {
    // The production build, not the dev server: security headers, static
    // rendering and the real bundle are exactly what these tests are about.
    command: `pnpm --filter @hireevo/web build && pnpm --filter @hireevo/web exec next start --port ${PORT}`,
    cwd: '..',
    url: `${baseURL}/api/health`,
    // Never reuse: anything already on this port would be another run's server,
    // and the point of the port is that nothing else uses it.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
