import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { FULL, sweep } from '../support/layout.ts';

/**
 * The profile preview across window sizes (docs/engineering-standards.md §6.11),
 * and what the screen promises: everything the person entered, with whatever a
 * buyer cannot see marked as hidden.
 *
 * As in client-profile-layout.spec.ts, the API is answered in the page so a
 * layout suite does not depend on a running backend, and every answer matches
 * its exact path so a request to the wrong URL fails the test rather than being
 * intercepted (§1.1). What the screen does against the real API is checked by
 * driving a browser at it, not here.
 */
const USER = {
  id: '0199a3c4-0000-7000-8000-000000000002',
  email: 'ayesha.khan.designer@example-company.com',
  firstName: 'Ayesha',
  lastName: 'Khan',
  username: 'ayeshakhan',
  status: 'active',
  emailVerified: true,
  roles: ['freelancer'],
  permissions: [],
};

/** A one-pixel image, so thumbnails render from somewhere this suite controls. */
const SWATCH = 'data:image/gif;base64,R0lGODlhAQABAIAAAMLBwQAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==';

const file = (index: number) => ({
  kind: 'image' as const,
  url: SWATCH,
  thumbUrl: SWATCH,
  objectKey: `profiles/p/portfolio/${String(index).padStart(16, '0')}.webp`,
  thumbKey: `profiles/p/portfolio/${String(index).padStart(16, '0')}-thumb.webp`,
  contentType: 'image/webp',
  byteSize: 302_114,
  width: 2048,
  height: 1365,
  fileName: `screen-${index}.png`,
});

/**
 * A profile with every section filled and every field at its longest.
 *
 * The preview's whole job is to show what somebody entered, so the fixture that
 * measures it is the widest thing it could be asked to show: a name that runs
 * past the card, five prices, and a portfolio piece with a title that does not
 * fit on one line.
 */
/**
 * What `/profiles/me/preview` answers with: the public shape, built by the same
 * serializer the published page uses.
 *
 * Only the sections this profile's visibility settings made public are in it —
 * name and headline, the biography, the location, skills, portfolio and
 * availability. Languages, the rate, work experience, education, certifications
 * and the video intro are private, so the API does not send them and this page
 * has nothing to draw. That is the point of reading this endpoint rather than
 * the owner's own: the rules live in one place.
 */
const PREVIEW = {
  slug: 'opaque-slug-for-e2e',
  displayName: 'Ayesha Khan, Senior Service and Product Designer',
  avatarUrl: SWATCH,
  headline:
    'Service designer working with regulated marketplaces on onboarding, payments and trust',
  overview:
    'I map difficult customer journeys end to end and ship the parts that move the numbers. Eleven years across marketplaces, fintech and public services, most recently rebuilding a checkout that eleven countries share.',
  location: 'Pakistan',
  availability: 'available',
  availabilityNote: 'Open to one discovery engagement starting October 2026',
  responseTime: null,
  projectLength: null,
  availableFrom: null,
  remoteMode: null,
  rates: [],
  languages: [],
  skills: [
    { name: 'Service design', proficiency: 'expert' },
    { name: 'Design systems', proficiency: 'advanced' },
    { name: 'Accessibility', proficiency: 'advanced' },
  ],
  experience: [],
  education: [],
  licenses: [],
  portfolio: [
    {
      title: 'Redesigning the checkout for a regulated marketplace in eleven countries',
      url: 'https://example.com/case-study',
      summary: 'Cut abandonment by a fifth.',
      files: [file(0), file(1)],
    },
    { title: 'Marketing site', url: null, summary: 'Web design', files: [file(2)] },
    { title: 'Mobile banking app', url: null, summary: 'UI / UX', files: [file(3)] },
    { title: 'Wellness app', url: null, summary: 'Mobile', files: [] },
  ],
  videoIntroUrl: null,
  searchIndexable: false,
  publishedAt: null,
};

function fulfil(route: Route, body: unknown, status = 200) {
  const headers = {
    'access-control-allow-origin': route.request().headers()['origin'] ?? '*',
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'authorization, content-type, x-client-platform',
    'access-control-allow-methods': 'GET, POST, PATCH, PUT',
  };
  return route.request().method() === 'OPTIONS'
    ? route.fulfill({ status: 204, headers })
    : route.fulfill({
        status,
        headers,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
}

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

  await page.route(
    (url) => url.pathname === '/api/v1/auth/refresh',
    (route) => fulfil(route, { accessToken: 'restored-token', user: USER }),
  );
  await page.route(
    (url) => url.pathname === '/api/v1/auth/me',
    (route) => fulfil(route, USER),
  );
  await page.route(
    (url) => url.pathname === '/api/v1/profiles/me/preview',
    (route) => fulfil(route, PREVIEW),
  );
});

async function open(page: Page) {
  await page.goto('/profile/preview');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test('the profile preview holds its layout at every window size', async ({ page }) => {
  test.setTimeout(FULL ? 900_000 : 240_000);
  await open(page);
  await sweep(page, 'profile preview');
});

/**
 * Only what the visibility settings made public.
 *
 * The page draws what the API sent and nothing else, and the API sends what the
 * published page would show — so a section missing here is a section a buyer
 * would not find either.
 */
test('shows the public sections and none of the private ones', async ({ page }) => {
  await open(page);

  await expect(page.getByRole('heading', { name: /Ayesha Khan/, level: 1 })).toBeVisible();

  for (const name of ['About', 'Skills and expertise', 'Portfolio']) {
    await expect(page.getByRole('region', { name, exact: true })).toBeVisible();
  }

  for (const name of [
    'Work experience',
    'Education',
    'Certifications',
    'Video intro',
    'Languages',
  ]) {
    await expect(page.getByRole('region', { name, exact: true })).toHaveCount(0);
  }
});

/**
 * The notice is the one thing this page adds to the public profile.
 *
 * Without it somebody reads a page that is missing half their work and has no
 * way to tell "not public" from "not saved". The editor is where the second
 * question is answered, and this says so.
 */
test('says it is the buyer’s view, and offers the way back', async ({ page }) => {
  await open(page);

  const notice = page.getByRole('complementary', { name: 'Preview notice' });
  await expect(notice.getByText(/exactly as a buyer sees it/)).toBeVisible();
  await expect(notice.getByRole('link', { name: /Back to editing/ })).toHaveAttribute(
    'href',
    '/client-profile',
  );
});

test('has no accessibility violations', async ({ page }) => {
  await open(page);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
