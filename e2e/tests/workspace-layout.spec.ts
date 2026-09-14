import { expect, test } from '@playwright/test';

/**
 * The workspace dashboard across window sizes, checked against the rules any
 * layout has to keep (docs/engineering-standards.md §6.11).
 *
 * It sweeps the design preview, /design-system/workspace, not /dashboard: the
 * preview renders the same components with the design file's full sample
 * content — every trend, status, meta pill and the status bar — which is the
 * widest and tallest this layout gets, and it needs no account.
 *
 * Widths are the common sizes plus one pixel either side of each switch the
 * layout uses: `sm` 640, `md` 768, `lg` 1024, and 1084, where the 1036px column
 * stops growing. `SWEEP=full` adds the rest.
 */
const FULL = process.env['SWEEP'] === 'full';

const WIDTHS = FULL
  ? [
      320, 344, 360, 375, 390, 412, 430, 480, 540, 600, 639, 640, 641, 700, 767, 768, 769, 820, 900,
      1023, 1024, 1025, 1083, 1084, 1085, 1180, 1280, 1366, 1440, 1536, 1600, 1920, 2256, 2560,
      3440, 3840,
    ]
  : [320, 375, 639, 640, 767, 768, 1023, 1024, 1083, 1085, 1366, 1536, 1920, 2560, 3840];

const HEIGHTS = FULL ? [480, 568, 768, 900, 1080, 1440, 2160] : [568, 900];

const PREVIEW = '/design-system/workspace';

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
});

/** Every rule the page breaks at the current size, as sentences. Runs in the browser. */
async function layoutFaults(): Promise<string[]> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  window.scrollTo(0, 0);

  const faults = new Set<string>();
  const width = document.documentElement.clientWidth;
  const box = (element: Element) => element.getBoundingClientRect();
  const shown = (element: Element) => {
    if (element.closest('.sr-only') !== null) return false;
    const style = getComputedStyle(element);
    const rect = box(element);
    return (
      style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    );
  };
  const name = (element: Element) =>
    `${element.tagName.toLowerCase()} "${(element.getAttribute('aria-label') ?? element.textContent ?? '').trim().slice(0, 28)}"`;

  if (document.querySelector('#main-content') === null) return ['the page has no main content'];
  if (document.documentElement.scrollWidth > width + 1) faults.add('the page scrolls sideways');

  const elements = [
    ...document.querySelectorAll(
      'header a, header button, main a, main button, main h1, main h2, main p, main li, [role="switch"], [role="progressbar"], [data-slot="badge"]',
    ),
  ].filter(shown);

  for (const element of elements) {
    const rect = box(element);
    if (rect.left < -1 || rect.right > width + 1) faults.add(`${name(element)} is cut off`);
    if (
      (element.textContent ?? '').trim() !== '' &&
      parseFloat(getComputedStyle(element).fontSize) < 12
    ) {
      faults.add(`${name(element)} is under 12px`);
    }
    if (element.matches('button, [role="switch"]') && (rect.width < 23.5 || rect.height < 23.5)) {
      faults.add(`${name(element)} is under 24px`);
    }
  }

  const blocks = elements.filter((element) =>
    element.matches(
      'h1, h2, p, a, button, [role="switch"], [role="progressbar"], [data-slot="badge"]',
    ),
  );
  for (const [index, first] of blocks.entries()) {
    for (const second of blocks.slice(index + 1)) {
      if (first.contains(second) || second.contains(first)) continue;
      const a = box(first);
      const b = box(second);
      const across = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const down = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (across > 1 && down > 1) faults.add(`${name(first)} overlaps ${name(second)}`);
    }
  }

  return [...faults];
}

test('the workspace dashboard holds its layout at every window size', async ({ page }) => {
  test.setTimeout(FULL ? 900_000 : 240_000);

  await page.goto(PREVIEW);
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.evaluate(() => document.fonts.ready);

  const faults: string[] = [];
  for (const width of WIDTHS) {
    for (const height of HEIGHTS) {
      await page.setViewportSize({ width, height });
      const found = await page.evaluate(layoutFaults);
      faults.push(...found.map((fault) => `${width}x${height}: ${fault}`));
    }
  }

  expect(faults.slice(0, 40), `${faults.length} layout faults on the dashboard`).toEqual([]);
});

test('below 1024px the navigation is a menu that opens on screen and closes on Escape', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(PREVIEW);

  await expect(page.getByRole('navigation', { name: 'Workspace' })).toBeHidden();
  await page.getByRole('button', { name: 'Open menu' }).click();

  const menu = page.getByRole('navigation', { name: 'Workspace' });
  await expect(menu.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  for (const group of ['Profile', 'Projects', 'Account']) {
    await expect(menu.getByRole('list', { name: group })).toBeVisible();
  }
  const area = await menu.boundingBox();
  expect(area).not.toBeNull();
  if (area !== null) expect(area.x + area.width).toBeLessThanOrEqual(376);

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
});

test('from 1024px the navigation sits in the bar and the menu button is gone', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(PREVIEW);

  await expect(
    page.getByRole('navigation', { name: 'Workspace' }).getByRole('link', { name: 'Dashboard' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden();
});

test('from 1024px each header dropdown opens on screen, one at a time, and closes on Escape', async ({
  page,
}) => {
  for (const width of [1024, 1440, 2560]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(PREVIEW);
    const bar = page.getByRole('navigation', { name: 'Workspace' });

    for (const label of ['Profile', 'Projects', 'Account']) {
      const trigger = bar.getByRole('button', { name: label, exact: true });
      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');

      const id = await trigger.getAttribute('aria-controls');
      expect(id, `${label} at ${width}px has no panel`).not.toBeNull();
      const panel = page.locator(`[id="${id ?? ''}"]`);
      await expect(panel).toBeVisible();
      const area = await panel.boundingBox();
      expect(area).not.toBeNull();
      if (area !== null) {
        expect(area.x, `${label} at ${width}px`).toBeGreaterThanOrEqual(0);
        expect(area.x + area.width, `${label} at ${width}px`).toBeLessThanOrEqual(width + 1);
      }

      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden();
      await expect(trigger).toBeFocused();
    }

    const profile = bar.getByRole('button', { name: 'Profile', exact: true });
    const account = bar.getByRole('button', { name: 'Account', exact: true });
    await profile.click();
    await account.click();
    await expect(profile).toHaveAttribute('aria-expanded', 'false');
    await expect(account).toHaveAttribute('aria-expanded', 'true');
  }
});
