import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { FULL, sweep } from '../support/layout.ts';

/**
 * The client profile — where signing in lands — across window sizes, and the
 * behaviour the screen promises: the account holder's name, and each section's
 * editor opening in place.
 *
 * As in profile-setup-layout.spec.ts, the API is answered in the page so a
 * layout suite does not depend on a running backend, and every answer matches
 * its exact path so a request to the wrong URL fails the test rather than
 * passing it (§1.1).
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

const PROFILE = {
  id: '0199a3c4-0000-7000-8000-00000000000a',
  slug: 'opaque-slug-for-e2e',
  status: 'draft',
  version: 7,
  completeness: 20,
  displayName: null,
  avatarUrl: null,
  headline: null,
  overview: null,
  videoIntroUrl: null,
  locationCountry: null,
  locationRegion: null,
  locationCity: null,
  serviceArea: null,
  timezone: null,
  remoteMode: null,
  availability: null,
  availabilityNote: null,
  rateAmountMinor: null,
  rateWeeklyAmountMinor: null,
  rateMonthlyAmountMinor: null,
  rateCurrency: null,
  contact: {
    phoneE164: null,
    contactEmail: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    dateOfBirth: null,
  },
  // Empty, so the page opens on an unfilled profile as the design draws it —
  // and so the draft this suite writes is the newer of the two, which is what
  // reopening the page has to prefer.
  sections: {
    languages: [],
    skills: [],
    experience: [],
    education: [],
    licenses: [],
    portfolio: [],
  },
  visibility: {
    profilePublic: false,
    locationGranularity: 'country',
    sections: {
      nameHeadline: false,
      biography: false,
      location: false,
      languages: false,
      rate: false,
      skills: false,
      experience: false,
      education: false,
      licenses: false,
      portfolio: false,
      videoIntro: false,
      availability: false,
    },
    searchIndexable: false,
  },
  publishedAt: null,
  updatedAt: '2026-09-15T10:00:00.000Z',
};

/** The approved taxonomy, as the skills endpoint serves it. */
const SKILLS = {
  skills: [
    { slug: 'accessibility', name: 'Accessibility', category: 'Design' },
    { slug: 'content-design', name: 'Content design', category: 'Design' },
    { slug: 'design-systems', name: 'Design systems', category: 'Design' },
    { slug: 'service-design', name: 'Service design', category: 'Design' },
    { slug: 'user-research', name: 'User research', category: 'Research' },
  ],
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
    (url) => url.pathname === '/api/v1/profiles/me',
    (route) =>
      fulfil(route, route.request().method() === 'PATCH' ? { ...PROFILE, version: 8 } : PROFILE),
  );
  await page.route(
    (url) => url.pathname === '/api/v1/skills',
    (route) => fulfil(route, SKILLS),
  );
});

async function open(page: Page) {
  await page.goto('/client-profile');
  await expect(
    page.getByRole('heading', { name: 'Build a profile that wins briefs', level: 1 }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/**
 * The page with editing turned on.
 *
 * Landing here shows the profile and nothing to press; the button in the
 * strength card is what puts a pencil on every section, so it is how any of
 * them is opened.
 */
async function openForEditing(page: Page) {
  await open(page);
  await page.getByRole('button', { name: /Complete your profile/ }).click();
}

test('opens on the account holder’s name', async ({ page }) => {
  await open(page);

  await expect(page.getByRole('button', { name: 'Edit display name: Ayesha Khan' })).toBeVisible();
  await expect(page.getByText('@ayeshakhan')).toBeVisible();
});

test('lands on the profile with nothing to press until editing is turned on', async ({ page }) => {
  const corners = ['Edit About', 'Edit skills and expertise', 'Edit expected rates'];
  await open(page);

  // Filled or empty, no section offers a way in yet: this page is the profile,
  // and a profile is read before it is written.
  for (const name of corners) {
    await expect(page.getByRole('button', { name })).toHaveCount(0);
  }

  await page.getByRole('button', { name: /Complete your profile/ }).click();

  for (const name of corners) {
    await expect(page.getByRole('button', { name })).toBeVisible();
  }
});

test('fetches a section’s editor only when that section is opened', async ({ page }) => {
  // The reason the editors are not in this page's bundle (§8.1: the claim in
  // section-editors.tsx is checked here rather than asserted in a comment).
  await openForEditing(page);
  // What the page loads on its own first: Next fetches its route's chunks after
  // hydration, so the count has to settle before anything is claimed about it.
  await page.waitForLoadState('networkidle');

  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(request.url());
  });
  await page.waitForTimeout(300);
  const settled = scripts.length;

  await page.getByRole('button', { name: 'Edit skills and expertise' }).click();
  await expect(page.getByRole('group', { name: 'Skill 1' })).toBeVisible();

  expect(scripts.length, 'opening a section fetches its editor').toBeGreaterThan(settled);
});

test('opens About in place, and saves the whole form from the end of it', async ({ page }) => {
  await openForEditing(page);
  await page.getByRole('button', { name: 'Edit About' }).click();

  const about = page.getByRole('region', { name: /About/ });
  await about
    .getByLabel('Biography')
    .fill('I map difficult journeys and ship accessible services.');
  // The section itself has no save: the form has one, at its end.
  await expect(about.getByRole('button', { name: /Save and/ })).toHaveCount(0);

  const saved = page.waitForRequest(
    (request) => request.url().endsWith('/api/v1/profiles/me') && request.method() === 'PATCH',
  );
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await saved;

  await expect(page.getByText('All changes saved')).toBeVisible();
});

test('opens again on what was typed but never saved', async ({ page }) => {
  await openForEditing(page);

  await page.getByRole('button', { name: 'Edit skills and expertise' }).click();
  await page
    .getByRole('group', { name: 'Skill 1' })
    .getByLabel('Skill', { exact: true })
    .fill('Service design');
  await expect(
    page.getByRole('group', { name: 'Skill 1' }).getByLabel('Skill', { exact: true }),
  ).toHaveValue('Service design');
  // The draft is written a moment after the last keystroke.
  await page.waitForTimeout(700);

  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Build a profile that wins briefs', level: 1 }),
  ).toBeVisible();

  await expect(page.getByRole('region', { name: /Skills and expertise/ })).toContainText(
    'Service design',
  );
});

test('the client profile holds its layout at every window size, open and closed', async ({
  page,
}) => {
  test.setTimeout(FULL ? 900_000 : 240_000);
  await openForEditing(page);
  await sweep(page, 'client profile');

  await page.getByRole('button', { name: 'Edit About' }).click();
  await expect(page.getByRole('region', { name: /About/ }).getByLabel('Biography')).toBeVisible();
  await sweep(page, 'client profile with the About editor open');
});

test('the rates and visibility editors hold their layout at every window size', async ({
  page,
}) => {
  test.setTimeout(FULL ? 900_000 : 240_000);
  await openForEditing(page);

  // A row of four — the label and three periods — is the widest thing on this
  // page, and the one most likely to be unusable on a phone.
  await page.getByRole('button', { name: 'Edit expected rates' }).click();
  const rates = page.getByRole('region', { name: /Expected rates/ });
  await expect(rates.getByLabel('Hourly Rate')).toBeVisible();
  await sweep(page, 'client profile with the rates editor open');

  await page.getByRole('button', { name: 'Edit visibility' }).click();
  const visibility = page.getByRole('region', { name: /Visibility/ });
  await expect(visibility.getByRole('button', { name: 'Save section' })).toBeVisible();
  await sweep(page, 'client profile with the visibility editor open');
});

test('the client profile has no automatically detectable accessibility violations', async ({
  page,
}) => {
  await openForEditing(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByRole('button', { name: 'Edit skills and expertise' }).click();
  await expect(page.getByRole('group', { name: 'Skill 1' })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
