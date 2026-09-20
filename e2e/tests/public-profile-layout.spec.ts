import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { FULL, sweep } from '../support/layout.ts';

/**
 * The public profile across window sizes (docs/engineering-standards.md §6.11).
 *
 * Swept at `/design-system/public-profile` rather than at a real `/p/[slug]`.
 * The real page is rendered on the server, so its data never passes through the
 * browser and cannot be answered here the way the other layout suites answer
 * theirs; the preview renders the same component from a fixture whose every
 * field is at its longest. `/design-system/workspace` exists for the same
 * reason.
 *
 * The sweep itself — its sizes and the rules it checks — is in
 * ../support/layout.ts.
 */
test.beforeEach(async ({ page }) => {
  // As in resolution-sweep.spec.ts: WebKit applies `upgrade-insecure-requests`
  // to localhost and would measure an unstyled page.
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') {
      await route.fallback();
      return;
    }
    const response = await route.fetch();
    const headers = { ...response.headers() };
    delete headers['content-security-policy'];
    await route.fulfill({ response, headers });
  });
});

async function open(page: Page) {
  await page.goto('/design-system/public-profile');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test('the public profile holds its layout at every window size', async ({ page }) => {
  test.setTimeout(FULL ? 900_000 : 240_000);
  await open(page);
  await sweep(page, 'public profile');
});

test('shows every section a freelancer can share', async ({ page }) => {
  await open(page);

  for (const name of [
    'About',
    'Video intro',
    'Skills',
    'Languages',
    'Work experience',
    'Education',
    'Certifications',
    'Portfolio',
  ]) {
    await expect(page.getByRole('region', { name })).toBeVisible();
  }

  // The rate is shown in its currency rather than in minor units, and says
  // what it buys — the fixture prices a week.
  await expect(page.getByText('per week')).toBeVisible();
});

test('sends a visitor to the video rather than framing it', async ({ page }) => {
  await open(page);

  const watch = page.getByRole('link', { name: 'Watch the introduction' });
  await expect(watch).toHaveAttribute('href', 'https://vimeo.com/123456789');
  await expect(watch).toHaveAttribute('target', '_blank');
  // Somebody else's page, linked from ours: no referrer, no ranking passed on.
  await expect(watch).toHaveAttribute('rel', /noopener/);
  await expect(watch).toHaveAttribute('rel', /nofollow/);
});

test('the public profile has no automatically detectable accessibility violations', async ({
  page,
}) => {
  await open(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
