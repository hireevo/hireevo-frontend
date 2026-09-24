import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { FULL, sweep } from '../support/layout.ts';

/**
 * The account screens across window sizes (docs/engineering-standards.md §6.11),
 * and what they promise: the hub's four cards, two of them leading somewhere.
 *
 * As in client-profile-layout.spec.ts, the API is answered in the page so a
 * layout suite does not depend on a running backend, and every answer matches
 * its exact path so a request to the wrong URL fails the test rather than being
 * intercepted (§1.1).
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

/** Long enough to measure the row at its worst: a desktop agent string wraps or truncates. */
const SESSIONS = [
  {
    id: '0199a3c4-0000-7000-8000-00000000f001',
    current: true,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36',
    devicePlatform: null,
    deviceModel: null,
    issuedAt: '2026-09-20T09:15:00.000Z',
    expiresAt: '2026-10-20T09:15:00.000Z',
  },
  {
    id: '0199a3c4-0000-7000-8000-00000000f002',
    current: false,
    userAgent: 'HireEvo/1.4 (iPhone; iOS 18.2)',
    devicePlatform: 'ios',
    deviceModel: 'iPhone 15 Pro',
    issuedAt: '2026-09-18T20:02:00.000Z',
    expiresAt: '2026-10-18T20:02:00.000Z',
  },
];

const PROFILE = {
  id: '0199a3c4-0000-7000-8000-00000000000a',
  slug: 'opaque-slug-for-e2e',
  status: 'draft',
  version: 7,
  completeness: 40,
  displayName: 'Ayesha Khan',
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
  availability: 'available',
  availabilityNote: null,
  responseTime: null,
  projectLength: null,
  availableFrom: null,
  rates: [],
  contact: {
    phoneE164: null,
    contactEmail: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    dateOfBirth: null,
  },
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
      nameHeadline: true,
      biography: true,
      location: true,
      languages: true,
      rate: true,
      skills: true,
      experience: true,
      education: true,
      licenses: true,
      portfolio: true,
      videoIntro: true,
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
    'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE',
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
    (url) => url.pathname === '/api/v1/auth/sessions',
    (route) => fulfil(route, SESSIONS),
  );
  await page.route(
    (url) => url.pathname === '/api/v1/profiles/me',
    (route) => fulfil(route, PROFILE),
  );
});

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test('the account settings hub holds its layout at every window size', async ({ page }) => {
  test.setTimeout(FULL ? 900_000 : 240_000);
  await open(page, '/account');
  await sweep(page, 'account settings');
});

test('personal information holds its layout at every window size', async ({ page }) => {
  test.setTimeout(FULL ? 900_000 : 240_000);
  await open(page, '/account/personal');

  // The address is shown masked, as the design draws it, and the rows carry the
  // Edit the frame puts at the end of each.
  await expect(page.getByText('a******************r@e*************y.com')).toBeVisible();
  await expect(page.getByText('ayesha.khan.designer@example-company.com')).toHaveCount(0);

  await sweep(page, 'personal information');
});

test('the visibility row is the one that can be changed, and it writes', async ({ page }) => {
  let sent: unknown = null;
  await page.route(
    (url) => url.pathname === '/api/v1/profiles/me',
    async (route) => {
      if (route.request().method() !== 'PATCH') return fulfil(route, PROFILE);
      sent = route.request().postDataJSON();
      return fulfil(route, { ...PROFILE, version: 8, availability: 'unavailable' });
    },
  );

  await open(page, '/account/personal');
  await expect(page.getByText('Online', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Edit' }).last().click();
  await page.getByLabel('Visibility', { exact: true }).selectOption('unavailable');

  await expect(page.getByText('Offline', { exact: true })).toBeVisible();
  expect(sent).toMatchObject({ version: 7, profile: { availability: 'unavailable' } });

  // The other two rows say what they are rather than opening a form nothing
  // could save: there is no endpoint behind either of them yet.
  for (const label of ['Edit', 'Deactivate']) {
    const refused = page.getByRole('button', { name: label, exact: true }).first();
    await expect(refused).toHaveAttribute('aria-disabled', 'true');
  }
});

test('account security holds its layout at every window size', async ({ page }) => {
  test.setTimeout(FULL ? 900_000 : 240_000);
  await open(page, '/account/security');

  // The five rows the design draws, in its order, with the device count where
  // it puts it — two sessions, written the way the frame writes them.
  await expect(page.getByText('Password', { exact: true })).toBeVisible();
  await expect(page.getByText('Connected devices')).toBeVisible();
  await expect(page.getByText('02', { exact: true })).toBeVisible();

  await sweep(page, 'account security');
});

test('the password row opens a box that writes, and says what went wrong', async ({ page }) => {
  let sent: unknown = null;
  await page.route(
    (url) => url.pathname === '/api/v1/auth/password/change',
    (route) => {
      sent = route.request().postDataJSON();
      return fulfil(route, { accessToken: 'rotated', expiresIn: 900, user: USER });
    },
  );

  await open(page, '/account/security');
  await page.getByRole('button', { name: 'Edit' }).first().click();

  const box = page.getByRole('dialog');
  await expect(box).toBeVisible();
  await expect(box.getByRole('heading', { name: 'Change password' })).toBeVisible();

  // Refused before a round trip: a new password that breaks the rules never
  // reaches the API, and the reason is on screen rather than in a console.
  await box.getByLabel('Current password').fill('Correct-Horse-9');
  await box.getByLabel('New password').fill('short');
  await box.getByRole('button', { name: 'Change password' }).click();
  await expect(box.getByText(/8\+ characters/)).toBeVisible();
  expect(sent).toBeNull();

  await box.getByLabel('New password').fill('N3w!Password9');
  await box.getByRole('button', { name: 'Change password' }).click();

  await expect(box.getByRole('heading', { name: 'Password changed' })).toBeVisible();
  expect(sent).toEqual({ currentPassword: 'Correct-Horse-9', newPassword: 'N3w!Password9' });
});

test('the box keeps the keyboard, and Escape closes it', async ({ page }) => {
  await open(page, '/account/security');
  await page.getByRole('button', { name: 'Edit' }).first().click();

  const box = page.getByRole('dialog');
  await expect(box).toBeVisible();

  // Focus starts in the first field rather than on the page behind the box.
  await expect(box.getByLabel('Current password')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(box).toBeHidden();

  // And it comes back to the control that opened it, not to the top of the page.
  await expect(page.getByRole('button', { name: 'Edit' }).first()).toBeFocused();
});

test('the devices box lists the sessions, and ends one', async ({ page }) => {
  let ended: string | null = null;
  await page.route(
    (url) => /^\/api\/v1\/auth\/sessions\//.test(url.pathname),
    (route) => {
      ended = route.request().url().split('/').at(-1) ?? null;
      return fulfil(route, {}, 204);
    },
  );

  await open(page, '/account/security');
  await page.getByRole('button', { name: 'Edit' }).last().click();

  const box = page.getByRole('dialog');
  await expect(box.getByText('iPhone 15 Pro · ios')).toBeVisible();
  // The agent string is not what a person recognises their phone by.
  await expect(box.getByText('HireEvo/1.4 (iPhone; iOS 18.2)')).toBeHidden();
  // The session asking cannot end itself, so it carries no button.
  await expect(box.getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(1);

  await box.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect.poll(() => ended).toBe('0199a3c4-0000-7000-8000-00000000f002');
});

test('the security screen holds its layout with a box open', async ({ page }) => {
  test.setTimeout(FULL ? 900_000 : 240_000);
  await open(page, '/account/security');
  await page.getByRole('button', { name: 'Edit' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await sweep(page, 'the change password box');
});

test('the hub leads to the two screens that exist, and marks the two that do not', async ({
  page,
}) => {
  await open(page, '/account');

  await expect(page.getByRole('link', { name: /Personal information/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Account security/ })).toBeVisible();
  await expect(page.getByText('Soon')).toHaveCount(2);

  await page.getByRole('link', { name: /Account security/ }).click();
  await expect(page.getByRole('heading', { name: 'Account security', level: 1 })).toBeVisible();

  // And back, by the link every settings screen carries.
  await page.getByRole('link', { name: 'Account settings' }).click();
  await expect(page.getByRole('heading', { name: 'Account settings', level: 1 })).toBeVisible();
});

test('the account screens have no accessibility violations', async ({ page }) => {
  for (const path of ['/account', '/account/personal', '/account/security']) {
    await open(page, path);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});
