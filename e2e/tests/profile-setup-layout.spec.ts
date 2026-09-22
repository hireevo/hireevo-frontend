import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { FULL, sweep } from '../support/layout.ts';

/**
 * Profile setup across window sizes (docs/engineering-standards.md §6.11).
 *
 * The screen needs a signed-in session and a profile. A real account would make
 * a layout suite depend on a running backend, which the layout does not, so the
 * API is answered in the page. Every answer matches its exact path — a predicate
 * on the pathname, not a glob — so a request to the wrong URL is not answered
 * and fails the test rather than passing it (§1.1).
 *
 * The profile carries long values in every field, and one run opens the publish
 * issues list: the tallest and widest the screen gets.
 *
 * The sweep itself — its sizes and the rules it checks — is in
 * ../support/layout.ts.
 */
const USER = {
  id: '0199a3c4-0000-7000-8000-000000000002',
  email: 'muhammad.abdullah.khan.freelancer@example-company.com',
  firstName: 'Muhammad Abdullah',
  lastName: 'Khan',
  username: 'abdullahkhan',
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
  completeness: 50,
  displayName: 'Muhammad Abdullah Khan, Senior Service and Product Designer',
  headline:
    'Senior service designer helping public-sector and enterprise teams turn complex, regulated journeys into measurable products',
  overview:
    'I partner with product and operations leaders to map difficult customer journeys, validate ideas through evidence-based research, and ship accessible services with measurable business outcomes. '.repeat(
      3,
    ),
  avatarUrl: null,
  videoIntroUrl: null,
  locationCountry: null,
  locationRegion: null,
  locationCity: null,
  serviceArea: null,
  timezone: null,
  remoteMode: null,
  availability: null,
  availabilityNote: 'Open to one discovery engagement starting October 2026, remote or in Lahore',
  rates: [],
  responseTime: null,
  projectLength: null,
  availableFrom: null,
  contact: {
    phoneE164: null,
    contactEmail: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    dateOfBirth: null,
  },
  // Empty, so the sweep fills every list itself: seeded entries are covered by
  // the unit tests, and here they would arrive in the fields this suite types
  // its own longest values into.
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
  updatedAt: '2026-09-14T10:00:00.000Z',
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

const NOT_READY = {
  error: {
    code: 'VALIDATION_FAILED',
    message: 'This profile is not ready to publish yet',
    requestId: 'e2e',
    details: {
      issues: [
        {
          path: 'locationCountry',
          code: 'invalid_type',
          message: 'Choose the country you work from',
        },
        { path: 'availability', code: 'invalid_value', message: 'Set your availability' },
      ],
    },
  },
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

async function answerTheApi(page: Page) {
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
    (url) => url.pathname === '/api/v1/profiles/me/visibility',
    (route) => fulfil(route, PROFILE.visibility),
  );
  await page.route(
    (url) => url.pathname === '/api/v1/profiles/me/publish',
    (route) => fulfil(route, NOT_READY, 400),
  );
  await page.route(
    (url) => url.pathname === '/api/v1/skills',
    (route) => fulfil(route, SKILLS),
  );
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
  await answerTheApi(page);
});

async function open(page: Page) {
  await page.goto('/profile/setup');
  await expect(page.getByLabel('Display name')).toHaveValue(PROFILE.displayName);
  await page.evaluate(() => document.fonts.ready);
}

test('profile setup holds its layout at every window size', async ({ page }) => {
  test.setTimeout(FULL ? 900_000 : 240_000);
  await open(page);
  await sweep(page, 'profile setup');
});

test('profile setup holds its layout with the publish issues open', async ({ page }) => {
  test.setTimeout(FULL ? 900_000 : 240_000);
  await open(page);
  await page.getByRole('button', { name: 'Publish current revision' }).click();
  await expect(page.getByRole('alert').getByText('Choose the country you work from')).toBeVisible();
  await sweep(page, 'profile setup with publish issues');
});

test('below 1024px the step list folds behind a button; from 1024px it is open', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await open(page);

  const identity = page.getByRole('link', { name: /Identity & story/ });
  await expect(identity).toBeHidden();
  await page.getByRole('button', { name: 'All steps' }).click();
  await expect(identity).toBeVisible();
  await expect(identity).toHaveAttribute('aria-current', 'step');

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.getByRole('button', { name: 'All steps' })).toBeHidden();
  await expect(page.getByRole('link', { name: /Visibility & publication/ })).toBeVisible();
});

test('profile setup has no automatically detectable accessibility violations', async ({ page }) => {
  // Not in accessibility.spec.ts's route list: that suite loads each route with
  // no session, and this one would show only the sign-in redirect.
  await open(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByRole('button', { name: 'Publish current revision' }).click();
  await expect(page.getByRole('alert').getByText('Set your availability')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

const region = (page: Page, name: RegExp) => page.getByRole('region', { name });

/**
 * Every section filled: long values, a second entry in each list, and an error
 * showing in every section that can have one — the tallest and widest the page
 * gets.
 */
async function fillEverything(page: Page) {
  const location = region(page, /Location and rate/);
  await location.getByLabel('Country').fill('Bosnia & Herzegovina');
  await location
    .getByLabel('City', { exact: true })
    .fill('Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch');
  await location
    .getByLabel('Service area')
    .fill('Remote across Europe, the Gulf and South Asia; on-site in Vienna, Lahore and Dubai');
  await location.getByLabel('Remote availability').selectOption('hybrid');
  // The widest a rate can be, so the row is measured at its worst.
  await location.getByLabel('Rate in USD').fill('9999999999999');
  await location.getByLabel('What that rate covers').selectOption('yearly');
  await location.getByLabel('Timezone').fill('Mars/Olympus');
  await location.getByRole('button', { name: /Save and next/ }).click();
  await expect(
    location.getByText('Choose a timezone from the list', { exact: false }),
  ).toBeVisible();

  const skills = region(page, /Languages and skills/);
  await skills.getByRole('group', { name: 'Language 1' }).getByRole('combobox').fill('Portuguese');
  await skills.getByRole('button', { name: 'Add language' }).click();
  await skills.getByRole('group', { name: 'Language 2' }).getByRole('combobox').fill('portuguese');
  const skill1 = skills.getByRole('group', { name: 'Skill 1' });
  await skill1.getByLabel('Skill', { exact: true }).fill('Accessibility');
  await skill1.getByLabel('Proficiency', { exact: true }).fill('Intermediate');
  await skill1.getByLabel('Years', { exact: true }).fill('99');
  await skills.getByRole('button', { name: 'Add skill' }).click();
  const skill2 = skills.getByRole('group', { name: 'Skill 2' });
  await skill2
    .getByLabel('Skill', { exact: true })
    .fill('Accessibility and inclusive design for regulated public services');
  await skill2.getByLabel('Proficiency', { exact: true }).fill('Expert');
  await skill2.getByLabel('Years', { exact: true }).fill('12');
  await skills.getByRole('button', { name: /Save and next/ }).click();
  await expect(skills.getByText('This language is already listed.')).toBeVisible();

  const experience = region(page, /Step 4:\s?Experience/);
  const role1 = experience.getByRole('group', { name: 'Role 1' });
  await role1
    .getByLabel('Role', { exact: true })
    .fill('Lead Service Designer, Digital Banking Platforms');
  await role1
    .getByLabel('Organization', { exact: true })
    .fill('Erste Group Bank AG — Digital Innovation and Customer Experience Division');
  await role1.getByLabel('Start date').fill('2024-05-01');
  await role1.getByLabel('End date').fill('2023-01-01');
  await role1
    .getByLabel('Summary')
    .fill(
      'Led cross-functional discovery and prototyping for customer-facing banking services. '.repeat(
        6,
      ),
    );
  await experience.getByRole('button', { name: /Save and next/ }).click();
  await expect(experience.getByText('The end date is before the start date.')).toBeVisible();
  // A second entry, added after the check: it is incomplete, so the section
  // locks, as the design draws it — and a locked button cannot be clicked.
  await experience.getByRole('button', { name: 'Add experience entry' }).click();
  await experience
    .getByRole('group', { name: 'Role 2' })
    .getByLabel('Role', { exact: true })
    .fill('Service Designer');

  const education = region(page, /Education and licenses/);
  await education
    .getByLabel('Institution', { exact: true })
    .fill('University of Applied Arts Vienna, Institute of Design');
  await education
    .getByLabel('Qualification')
    .fill('Master of Arts in Social Design and Service Innovation');
  await education.getByLabel('Field of study').fill('Interaction & Service Design');
  await education.getByLabel('Start date').fill('2013-09-01');
  await education.getByLabel('End date').fill('2017-06-30');
  await education
    .getByLabel('License', { exact: true })
    .fill('Accessibility Fundamentals for Digital Services');
  await education.getByLabel('Issuer').fill('Interaction Design Foundation');
  await education.getByLabel('Issued').fill('2025-03-10');
  await education.getByLabel('Expires').fill('2025-01-01');
  await education.getByRole('button', { name: /Save and next/ }).click();
  await expect(education.getByText('The expiry date is before the issue date.')).toBeVisible();

  const visibility = region(page, /Visibility and publication/);
  await visibility.getByRole('radio', { name: 'Public after publishing' }).check();
  await visibility
    .getByRole('checkbox', { name: 'Allow search engines to index the public profile' })
    .check();
  await visibility.getByRole('button', { name: 'Save section' }).click();
  await expect(visibility.getByRole('alert')).toBeVisible();
}

test('profile setup holds its layout filled to its limits, with errors showing', async ({
  page,
}) => {
  test.setTimeout(FULL ? 900_000 : 240_000);
  await open(page);
  await fillEverything(page);
  // Read back in the currency, so a number typed as 9999999999999 is visibly
  // that many dollars and not a hundredth of them.
  await expect(page.getByText('$9,999,999,999,999.00')).toBeVisible();
  await sweep(page, 'profile setup, filled');
});

test('profile setup filled in has no automatically detectable accessibility violations', async ({
  page,
}) => {
  await open(page);
  await fillEverything(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('a step link brings its section into view, and the step list follows the scroll', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await open(page);
  const steps = region(page, /Profile setup steps/);

  await steps.getByRole('link', { name: 'Experience' }).click();
  const heading = page.getByRole('heading', { level: 2, name: /Step 4:\s?Experience/ });
  await expect(heading).toBeFocused();
  await expect(heading).toBeInViewport();
  await expect(page).toHaveURL(/step=experience/);
  await expect(steps.getByRole('link', { name: 'Experience' })).toHaveAttribute(
    'aria-current',
    'step',
  );

  // The list stays beside the page and marks what is being read.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(steps).toBeInViewport();
  await expect(steps.getByRole('link', { name: /Visibility & publication/ })).toHaveAttribute(
    'aria-current',
    'step',
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(steps.getByRole('link', { name: /Identity & story/ })).toHaveAttribute(
    'aria-current',
    'step',
  );
});

test('an address naming a section opens the page there', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/profile/setup?step=education');
  await expect(
    page.getByRole('heading', { level: 2, name: /Education and licenses/ }),
  ).toBeInViewport();
});

test('save and next registers the click that leaves a field with a problem in it', async ({
  page,
}) => {
  // Errors that appeared on leaving a field pushed the button out from under
  // the pointer between press and release, so the click never happened. jsdom
  // has no layout, so only a real browser can catch that.
  await page.setViewportSize({ width: 1366, height: 900 });
  await open(page);
  const location = region(page, /Location and rate/);
  await location.getByLabel('Country').fill('Austria');
  await location.getByLabel('City', { exact: true }).fill('Vienna');
  await location.getByLabel('Service area').fill('Remote across Europe');
  await location.getByLabel('Remote availability').selectOption('remote');
  await location.getByLabel('Rate in USD').fill('140');
  await location.getByLabel('What that rate covers').selectOption('weekly');
  await location.getByLabel('Timezone').fill('Mars/Olympus');
  await location.getByRole('button', { name: /Save and next/ }).click();

  await expect(
    location.getByText('Choose a timezone from the list', { exact: false }),
  ).toBeVisible();
  await expect(location.getByLabel('Timezone')).toBeFocused();
  await expect(page).not.toHaveURL(/step=skills/);
});
