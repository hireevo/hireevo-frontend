import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { FULL, sweep } from '../support/layout.ts';

/**
 * The admin workers screen across window sizes (docs/engineering-standards.md §6.11).
 *
 * Swept at `/design-system/admin` rather than at `/admin/workers`, which sits
 * behind a session this suite has none of. The preview renders the same two
 * components over the same rows, so what is measured is the screen itself.
 */
test.beforeEach(async ({ page }) => {
  // As in the other suites: WebKit applies `upgrade-insecure-requests` to
  // localhost and would measure an unstyled page.
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

/**
 * `fonts` is for the sweep and for nothing else.
 *
 * Waiting on `document.fonts.ready` is what makes a measured layout the one a
 * reader sees. The behaviour tests measure nothing, and under a full sweep —
 * four engines, a hundred window sizes — that wait is where they time out
 * instead of testing anything.
 */
async function open(page: Page, { fonts = false }: { fonts?: boolean } = {}) {
  await page.goto('/design-system/admin');
  await expect(page.getByRole('heading', { level: 1, name: 'Worker accounts' })).toBeVisible();
  if (fonts) await page.evaluate(() => document.fonts.ready);
}

test('the admin workers screen holds its layout at every window size', async ({ page }) => {
  test.setTimeout(FULL ? 900_000 : 240_000);
  await open(page, { fonts: true });
  await sweep(page, 'admin workers');
});

/**
 * The header with its account menu open, at every window size.
 *
 * The panel is anchored to the right edge of a header that runs the full width,
 * so the size it is most likely to fall off the side of is the narrowest one.
 * Swept separately because the sweep above measures the page as it opens, and a
 * panel that is shut is a panel nothing measures (§6.11).
 */
test('the account menu holds its layout at every window size', async ({ page }) => {
  test.setTimeout(FULL ? 900_000 : 240_000);
  await open(page, { fonts: true });

  await page.getByRole('button', { name: /Account menu for/ }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

  await sweep(page, 'the console account menu');
});

/**
 * The console's way out.
 *
 * It shipped without one — the header named a person in its source and offered
 * nothing to press — so this is the guard for the screen having the same exit
 * every other signed-in screen has. Escape rather than only a click outside: a
 * panel a keyboard is stuck behind is the trap §6.8 is about.
 */
test('the account menu opens on Sign out alone, and closes on Escape', async ({ page }) => {
  await open(page);

  const button = page.getByRole('button', { name: /Account menu for/ });
  await expect(button).toHaveAttribute('aria-expanded', 'false');

  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  const signOut = page.getByRole('button', { name: 'Sign out' });
  await expect(signOut).toBeVisible();
  // Signing out and nothing else: the account page is a freelancer's, and a
  // link into it from here leads out of the console (§6.7).
  await expect(page.getByRole('link', { name: 'Account settings' })).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(signOut).toBeHidden();
  await expect(button).toBeFocused();
});

/**
 * The sidebar has to fold rather than stay beside a table.
 *
 * Seventeen entries in a column next to a seven-column table is most of a
 * phone's width spent on navigation, so below `lg` it becomes a disclosure.
 * The disclosure is the part worth testing: a menu that covers the page and
 * cannot be dismissed from the keyboard is a trap (§6.11).
 */
test('the sections fold into a menu on a narrow window, and Escape closes it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);

  await expect(page.getByRole('complementary', { name: 'Admin sections' })).toBeHidden();

  const toggle = page.getByRole('button', { name: 'Open sections' });
  await toggle.click();
  const workers = page.getByRole('link', { name: 'Workers' });
  await expect(workers).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(workers).toBeHidden();
});

test('only Workers can be opened; every other section says it is not ready', async ({ page }) => {
  await open(page);

  const sidebar = page.getByRole('complementary', { name: 'Admin sections' });
  await expect(sidebar.getByRole('link')).toHaveCount(1);
  await expect(sidebar.getByRole('link', { name: 'Workers' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(sidebar.getByText('Soon')).toHaveCount(16);
});

test('the search narrows the table, and the state control follows the country', async ({
  page,
}) => {
  await open(page);

  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(10);

  const state = page.getByRole('combobox', { name: 'State' });
  await expect(state).toBeDisabled();

  await page.getByRole('combobox', { name: 'Country' }).selectOption('Canada');
  await expect(state).toBeEnabled();
  await state.selectOption('Ontario');
  await expect(rows).toHaveCount(1);

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(rows).toHaveCount(10);
  await expect(state).toBeDisabled();
});

/**
 * Banning is the one thing here that changes somebody's account.
 *
 * Driven in a real browser because the whole point is the two-step: the row an
 * administrator meant to press and the row they did press are one line apart,
 * so the question has to name the person before anything happens.
 */
test('banning asks first, names the person, and changes the row', async ({ page }) => {
  await open(page);

  const row = page.locator('tbody tr').filter({ hasText: 'danielle.okafor@example.com' });
  await expect(row.getByText('Unflagged')).toBeVisible();

  await row.getByRole('button', { name: /^Actions for/ }).click();
  await page.getByRole('menuitem', { name: 'Ban user' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Ban Danielle Okafor?' })).toBeVisible();

  // Cancel leaves the account exactly as it was.
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(row.getByText('Unflagged')).toBeVisible();

  await row.getByRole('button', { name: /^Actions for/ }).click();
  await page.getByRole('menuitem', { name: 'Ban user' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Ban Danielle' }).click();
  await expect(row.getByText('Flagged')).toBeVisible();

  // And letting them back in does not ask, because that is the undo.
  await row.getByRole('button', { name: /^Actions for/ }).click();
  await page.getByRole('menuitem', { name: 'Unban user' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(row.getByText('Unflagged')).toBeVisible();
});

test('the admin workers screen has no automatically detectable accessibility violations', async ({
  page,
}) => {
  // Axe walks the whole tree, and under a full sweep it does so on a machine
  // already running three engines through a hundred window sizes.
  test.setTimeout(FULL ? 120_000 : 30_000);
  await open(page);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

/**
 * The search box carries its own two controls.
 *
 * The magnifier and the cross are where a reader looks for them — inside the
 * field — rather than as a pair of buttons underneath it. The cross only exists
 * while there is something to cancel, so it cannot be a control that does
 * nothing (§6.7).
 */
test('the search box searches and cancels from inside itself', async ({ page }) => {
  // The whole sweep is running beside this one on three other engines, and the
  // page it opens is a production bundle being hydrated on a busy machine.
  test.setTimeout(FULL ? 180_000 : 60_000);
  await open(page);

  const name = page.getByRole('textbox', { name: 'Worker name' });
  const rows = page.locator('tbody tr');
  await expect(page.getByRole('button', { name: 'Clear the search' })).toBeHidden();

  // Wait for the page to be interactive before typing into it. The field is
  // only controlled once React has attached, and a fill that lands before that
  // sets the value and has it thrown away by the first render — which is not a
  // thing this test is about. Opening a menu is pure client behaviour, so it
  // answering at all is the signal.
  const menu = rows.first().getByRole('button', { name: /^Actions for/ });
  await expect(async () => {
    await menu.click();
    await expect(page.getByRole('menu')).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 60_000 });
  await page.keyboard.press('Escape');

  await name.fill('nwosu');
  await expect(rows).toHaveCount(1);

  const clear = page.getByRole('button', { name: 'Clear the search' });
  await expect(clear).toBeVisible();
  await clear.click();

  await expect(name).toHaveValue('');
  await expect(rows).toHaveCount(10);
  // The field keeps the focus, so the next search is typed rather than aimed at.
  await expect(name).toBeFocused();
});
