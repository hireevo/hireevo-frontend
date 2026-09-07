import { expect, test, type Page } from '@playwright/test';

/**
 * The account journey, against a real API.
 *
 * These are the only tests here that need something other than the web app:
 * the accounts API, its database and Redis, and a mailbox to read the
 * confirmation code out of. When that stack is not up they skip rather than
 * fail, so a frontend-only run stays green — and so a skipped run is visibly
 * skipped rather than quietly passing.
 *
 * Bring the stack up from `hireevo-backend`: `pnpm db:up`, `pnpm db:migrate`,
 * then `pnpm dev`. Per ADR-001 this eventually runs against the pinned backend
 * image named in `.api-version` rather than whatever is on the machine.
 *
 * Registration is rate limited to ten per hour per address, deliberately, so a
 * run that repeats often enough will start seeing "too many attempts". That is
 * the limit working. Against a disposable stack the fix is to restart Redis;
 * against a shared one, wait.
 */
const API = process.env.E2E_API_URL ?? 'http://localhost:3000';
const MAIL = process.env.E2E_MAILBOX_URL ?? 'http://localhost:8025';
const PASSWORD = 'Passw0rd';

async function reachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

/** Polls the mailbox, because the API sends mail through an outbox worker. */
async function waitForCode(email: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const body = (await (await fetch(`${MAIL}/api/v1/messages?limit=20`)).json()) as {
      messages?: Array<{ Subject?: string; To?: Array<{ Address?: string }> }>;
    };

    for (const message of body.messages ?? []) {
      const forUs = (message.To ?? []).some((to) => to.Address === email);
      const code = /^(\d{6})/.exec(message.Subject ?? '');
      if (forUs && code?.[1] !== undefined) return code[1];
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`No confirmation code arrived for ${email}`);
}

async function signUp(page: Page, email: string, username: string): Promise<void> {
  await page.goto('/sign-up');
  await page.getByLabel('First Name').fill('Ayesha');
  await page.getByLabel('Last Name').fill('Khan');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('User Name').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Re-Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create Account' }).click();
}

test.describe('account journey', () => {
  // Probed once per worker rather than per test: `test.skip` takes a boolean,
  // and reachability is a question that has to be asked over the network.
  let stackIsUp = false;

  test.beforeAll(async () => {
    stackIsUp =
      (await reachable(`${API}/health/live`)) &&
      (await reachable(`${MAIL}/api/v1/messages?limit=1`));
  });

  test.beforeEach(() => {
    test.skip(!stackIsUp, 'the accounts API and its mailbox are not running');
  });

  test('sign up, confirm by code, sign in, stay signed in, sign out', async ({ page }) => {
    const stamp = `${Date.now()}${process.env.TEST_PARALLEL_INDEX ?? ''}`;
    const email = `journey${stamp}@example.com`;

    await signUp(page, email, `journey${stamp}`);
    await page.waitForURL('**/confirm-email**');

    const code = await waitForCode(email);
    const digits = page.getByRole('textbox', { name: /digit/i });
    for (const [index, digit] of [...code].entries()) {
      await digits.nth(index).fill(digit);
    }
    await page.getByRole('button', { name: 'Submit' }).click();

    // Confirming deliberately does not sign anyone in: a forwarded code must
    // not become a session.
    await page.waitForURL('**/sign-in**');

    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/account');

    // Read back from `/auth/me`, so this only appears if the access token was
    // sent and accepted on an ordinary authenticated request.
    await expect(page.getByText('Loaded from the API with your access token.')).toBeVisible();
    await expect(page.getByText(email).first()).toBeVisible();

    // The access token lives in memory and dies with the reload. Surviving it
    // means the refresh cookie was stored and spent, which is the whole of
    // "stay signed in".
    await page.reload();
    await expect(page.getByText(email).first()).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('**/sign-in');

    await page.goto('/account');
    await page.waitForURL('**/sign-in');
  });

  test('a taken username is reported under the field, as the design draws it', async ({ page }) => {
    const stamp = `${Date.now()}${process.env.TEST_PARALLEL_INDEX ?? ''}`;
    const username = `taken${stamp}`;

    await signUp(page, `taken${stamp}@example.com`, username);
    await page.waitForURL('**/confirm-email**');

    await page.goto('/sign-up');

    // Blurred directly rather than by clicking the next field: what triggers
    // the check is leaving the input, and where the next field happens to sit
    // is a property of the viewport, not of the behaviour under test.
    const usernameField = page.getByLabel('User Name');
    await usernameField.fill(username);
    await usernameField.blur();
    await expect(page.getByText('User name is already taken')).toBeVisible();

    // A free one clears it. Without this the test would pass on a component
    // that simply always complains.
    await usernameField.fill(`${username}free`);
    await usernameField.blur();
    await expect(page.getByText('User name is already taken')).toBeHidden();
  });

  test('the wrong password is refused without saying which half was wrong', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByLabel('E-mail').fill('nobody@example.com');
    await page.getByLabel('Password').fill('Wrongpass0rd');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // The same message for an unknown address and a wrong password: anything
    // else is a way to find out who has an account here.
    await expect(page.getByRole('alert').filter({ hasText: /incorrect/i })).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
