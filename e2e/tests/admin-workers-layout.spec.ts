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

async function open(page: Page) {
  await page.goto('/design-system/admin');
  await expect(page.getByRole('heading', { level: 1, name: 'Worker accounts' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test('the admin workers screen holds its layout at every window size', async ({ page }) => {
  test.setTimeout(FULL ? 900_000 : 240_000);
  await open(page);
  await sweep(page, 'admin workers');
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

  await page.getByRole('button', { name: 'Reset' }).click();
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
  await expect(row.getByText('Active')).toBeVisible();

  await row.getByRole('button', { name: /^Ban/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Ban Danielle Okafor?' })).toBeVisible();

  // Cancel leaves the account exactly as it was.
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(row.getByText('Active')).toBeVisible();

  await row.getByRole('button', { name: /^Ban/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Ban Danielle' }).click();
  await expect(row.getByText('Banned')).toBeVisible();

  // And letting them back in does not ask, because that is the undo.
  await row.getByRole('button', { name: /^Unban/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(row.getByText('Active')).toBeVisible();
});

test('the admin workers screen has no automatically detectable accessibility violations', async ({
  page,
}) => {
  await open(page);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
