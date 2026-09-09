import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// The Step 1.2 gate: axe plus a keyboard-only pass over the showcase. Every
// route added to the app belongs in this list.
const ROUTES = ['/', '/design-system'];

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

test('the skip link is the first thing a keyboard reaches, and it works', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');

  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/#main-content');
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
