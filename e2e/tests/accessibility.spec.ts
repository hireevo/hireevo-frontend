import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// The Step 1.2 gate: axe plus a keyboard-only pass over the showcase. Every
// route added to the app belongs in this list. The root is not one: it
// redirects to sign-in, which is already here.
const ROUTES = [
  '/design-system',
  '/sign-up',
  '/sign-in',
  '/recover',
  '/confirm-email',
  '/reset-password?token=example',
  '/design-system/workspace',
];

for (const path of ROUTES) {
  test(`${path} has no automatically detectable accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(
      violations.map((violation) => `${violation.id}: ${violation.help}`),
      'axe reported violations',
    ).toEqual([]);
  });
}

test.describe('with the operating system set to dark', () => {
  test.use({ colorScheme: 'dark' });

  // Nothing in the design file is drawn dark. Until something is, a machine set
  // to dark must still get the palette the screens were designed and reviewed
  // in — anything else is a version nobody has looked at.
  for (const path of ROUTES) {
    test(`${path} still renders the light palette`, async ({ page }) => {
      await page.goto(path);
      const surface = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--he-surface').trim(),
      );
      expect(surface).toBe('#fff');
    });
  }
});

test('the skip link is the first thing a keyboard reaches, and it works', async ({ page }) => {
  await page.goto('/sign-in');
  await page.keyboard.press('Tab');

  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/sign-in#main-content');
});

test('every control on the showcase is reachable by keyboard', async ({ page }) => {
  await page.goto('/design-system');

  const controls = page.getByRole('button');
  // `all()` resolves against whatever matches at that instant and never waits,
  // so it has to be preceded by an assertion that does.
  await expect(controls.first()).toBeVisible();

  for (const control of await controls.all()) {
    // A disabled control is correctly skipped by the tab order; the rest must
    // all be able to take focus.
    if (await control.isDisabled()) continue;
    await control.focus();
    await expect(control).toBeFocused();
  }
});
