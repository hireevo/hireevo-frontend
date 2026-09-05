import { expect, test } from '@playwright/test';

test('the home page renders and links into the design system', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.getByRole('link', { name: 'View the design system' }).click();
  await expect(page).toHaveURL('/design-system');
  await expect(page.getByRole('heading', { name: 'Design system', level: 1 })).toBeVisible();
});

test('an unknown path renders the 404 page rather than an error', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'This page does not exist' })).toBeVisible();
});

test('the health probe answers without touching anything external', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toContain('no-store');
  expect(await response.json()).toMatchObject({ status: 'ok' });
});

test('the layout does not scroll sideways at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of ['/', '/design-system']) {
    await page.goto(path);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows, `${path} overflows horizontally at 360px`).toBe(false);
  }
});
