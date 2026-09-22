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
const PROFILE = {
  id: '0199a3c4-0000-7000-8000-00000000000a',
  slug: 'opaque-slug-for-e2e',
  status: 'draft',
  version: 7,
  completeness: 100,
  displayName: 'Ayesha Khan, Senior Service and Product Designer',
  avatarUrl: SWATCH,
  headline:
    'Senior service designer helping public-sector and enterprise teams turn complex, regulated journeys into measurable products',
  overview:
    'I partner with product and operations leaders to map difficult customer journeys, validate ideas through evidence-based research, and ship accessible services with measurable business outcomes. '.repeat(
      3,
    ),
  videoIntroUrl: 'https://vimeo.com/123456789',
  locationCountry: 'PK',
  locationRegion: 'Punjab',
  locationCity: 'Lahore',
  serviceArea: 'Remote across Europe and on-site in Lahore',
  timezone: 'Asia/Karachi',
  remoteMode: 'hybrid',
  availability: 'open_to_offers',
  availabilityNote: 'Open to one discovery engagement starting October 2026',
  responseTime: 'within_a_day',
  projectLength: 'three_to_six_months',
  availableFrom: '2026-10-01',
  rates: [
    { period: 'hourly', amountMinor: '4500', currency: 'USD' },
    { period: 'daily', amountMinor: '102000', currency: 'USD' },
    { period: 'weekly', amountMinor: '500000', currency: 'USD' },
    { period: 'monthly', amountMinor: '520000', currency: 'USD' },
    { period: 'yearly', amountMinor: '999999999999999', currency: 'USD' },
  ],
  contact: {
    phoneE164: null,
    contactEmail: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    dateOfBirth: null,
  },
  sections: {
    languages: [
      { name: 'Urdu', proficiency: 'native', starred: true },
      { name: 'English', proficiency: 'fluent', starred: true },
      { name: 'Portuguese', proficiency: 'conversational', starred: false },
    ],
    skills: [
      {
        name: 'Accessibility and inclusive design for regulated public services',
        proficiency: 'expert',
        years: 9,
        approved: true,
      },
      { name: 'Service design', proficiency: 'expert', years: 7, approved: true },
      { name: 'Design systems', proficiency: 'advanced', years: 5, approved: true },
    ],
    experience: [
      {
        role: 'Lead Service Designer, Digital Identity and Payments',
        organization: 'Erste Digital',
        startDate: '2022-02-01',
        endDate: null,
        summary:
          'Led discovery across eleven teams and shipped the first accessible onboarding journey in the group.',
      },
    ],
    education: [
      {
        institution: 'Central Saint Martins, University of the Arts London',
        qualification: 'Bachelor of Fine Arts',
        fieldOfStudy: 'Graphic Design',
        startDate: '2013-09-01',
        endDate: '2017-06-30',
      },
    ],
    licenses: [
      {
        name: 'Adobe Certified Expert (ACE)',
        issuer: 'Adobe',
        issuedOn: '2022-04-01',
        expiresOn: null,
        files: [],
      },
      {
        name: 'Brand Strategy Fundamentals',
        issuer: 'Coursera',
        issuedOn: '2021-03-01',
        expiresOn: null,
        files: [],
      },
    ],
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
  },
  // Two sections public and the rest not, so both states of the card are on the
  // page at every size the sweep measures.
  visibility: {
    profilePublic: false,
    locationGranularity: 'country',
    sections: {
      nameHeadline: true,
      biography: true,
      location: true,
      languages: false,
      rate: false,
      skills: true,
      experience: false,
      education: false,
      licenses: false,
      portfolio: true,
      videoIntro: false,
      availability: true,
    },
    searchIndexable: false,
  },
  publishedAt: null,
  updatedAt: '2026-09-15T10:00:00.000Z',
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
    (route) => fulfil(route, PROFILE),
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

test('shows every section the person filled in', async ({ page }) => {
  await open(page);

  await expect(page.getByRole('heading', { name: /Ayesha Khan/, level: 1 })).toBeVisible();
  await expect(page.getByText('@ayeshakhan')).toBeVisible();

  for (const name of [
    'About',
    'Skills and expertise',
    'Work experience',
    'Education',
    'Certifications',
    'Portfolio',
    'Video intro',
    'Languages',
    'Expected rates',
  ]) {
    await expect(page.getByRole('region', { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('region', { name: 'Working preferences' })).toBeVisible();

  // Every price, in its currency rather than in minor units.
  await expect(page.getByText('$45.00').first()).toBeVisible();
  await expect(page.getByText('$5,200.00').first()).toBeVisible();
});

/**
 * The one thing this page says that the client profile does not.
 *
 * A section is filled in whether or not a buyer may see it, and only the
 * visibility settings decide which. Without the marker, a person looking at a
 * complete-looking preview has no way to learn that half of it is private.
 */
test('marks the sections a buyer cannot see, and leaves the rest unmarked', async ({ page }) => {
  await open(page);

  const hidden = page.getByText('Hidden from buyers');
  // Languages, rate, experience, education, licenses and the video intro are
  // private in the fixture; About, skills and portfolio are not.
  await expect(hidden).toHaveCount(6);

  const about = page.getByRole('region', { name: 'About', exact: true });
  await expect(about.getByText('Hidden from buyers')).toHaveCount(0);
});

test('only starred languages sit beside the name, and all of them in the section', async ({
  page,
}) => {
  await open(page);

  const identity = page.getByRole('region', { name: 'Name and details' });
  await expect(identity.getByText('Urdu', { exact: false })).toBeVisible();
  await expect(identity.getByText('Portuguese', { exact: false })).toHaveCount(0);

  const languages = page.getByRole('region', { name: 'Languages', exact: true });
  for (const name of ['Urdu', 'English', 'Portuguese']) {
    await expect(languages.getByText(name, { exact: false }).first()).toBeVisible();
  }
});

test('has no accessibility violations', async ({ page }) => {
  await open(page);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
