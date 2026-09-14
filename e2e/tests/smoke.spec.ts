import { expect, test, type Page } from '@playwright/test';

test('the app opens on the sign-in screen', async ({ page, request }) => {
  // Temporary, so the root stays free to become a landing page or the signed-in
  // workspace without browsers holding on to this redirect.
  const response = await request.get('/', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers()['location']).toMatch(/\/sign-in$/);

  await page.goto('/');
  await expect(page).toHaveURL('/sign-in');
  await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible();
});

/** Answers one auth endpoint as the API would, preflight included. */
async function answer(page: Page, endpoint: string, body: unknown) {
  await page.route(`**/api/v1/auth/${endpoint}`, (route) => {
    const headers = {
      'access-control-allow-origin': route.request().headers()['origin'] ?? '*',
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'GET, POST',
    };
    return route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers })
      : route.fulfill({
          status: 200,
          headers,
          contentType: 'application/json',
          body: JSON.stringify(body),
        });
  });
}

test('someone already signed in is taken past sign-in to their workspace', async ({ page }) => {
  // The refresh cookie belongs to the API, so a restored session is answered
  // here: this is about where the app sends one, not about restoring it.
  const user = {
    id: '0199a3c4-0000-7000-8000-000000000001',
    email: 'signed-in@example.com',
    firstName: 'Signed',
    lastName: 'In',
    username: 'signedin',
    status: 'active',
    emailVerified: true,
    roles: ['freelancer'],
    permissions: [],
  };
  await answer(page, 'refresh', { accessToken: 'restored-token', user });
  await answer(page, 'me', user);

  await page.goto('/');
  await page.waitForURL('**/dashboard');
  await expect(
    page.getByRole('heading', { name: 'Your market-ready foundation', level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Account menu for Signed In' })).toBeVisible();
});

test('the design system showcase renders', async ({ page }) => {
  await page.goto('/design-system');
  await expect(page.getByRole('heading', { name: 'Design system', level: 1 })).toBeVisible();
});

test('an unknown path renders the 404 page rather than an error', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'This page does not exist' })).toBeVisible();

  // Its way back still leads somewhere real now that the root is a redirect.
  await page.getByRole('link', { name: 'Back to HireEvo' }).click();
  await expect(page).toHaveURL('/sign-in');
});

test('the health probe answers without touching anything external', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toContain('no-store');
  expect(await response.json()).toMatchObject({ status: 'ok' });
});

test('the layout does not scroll sideways at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of ['/sign-in', '/design-system']) {
    await page.goto(path);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows, `${path} overflows horizontally at 360px`).toBe(false);
  }
});
