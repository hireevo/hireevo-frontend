import { expect, test } from '@playwright/test';

/**
 * The auth screens across a grid of window sizes rather than a handful of
 * devices, checked against the rules a layout has to keep at any size.
 *
 * "Works at every resolution" cannot be proven one resolution at a time, but
 * this layout does not change continuously: it changes where a breakpoint or a
 * clamp switches over. So the grid is the common device and window sizes plus
 * one pixel either side of every switch — `sm` at 640, `lg` at 1024, the
 * centring at 2000, the `short` variant at 709, and the 640 and 1024 ends of
 * `--fit`. A fault that exists anywhere in between shows at one of them.
 *
 * Pull requests run the switches and the commonest sizes on every desktop
 * engine. `SWEEP=full` runs the whole grid: the nightly layout workflow does,
 * and it is the one to run locally after touching the auth layout.
 *
 * Each screen loads once and is resized in place. The layout is CSS, so a
 * resize reflows it exactly as a reload would, at a fraction of the cost.
 */
const FULL = process.env['SWEEP'] === 'full';

const WIDTHS = FULL
  ? [
      320, 360, 375, 390, 412, 430, 480, 540, 600, 639, 640, 641, 700, 768, 800, 820, 900, 1023,
      1024, 1025, 1100, 1180, 1280, 1366, 1440, 1536, 1600, 1680, 1920, 1999, 2000, 2001, 2256,
      2560, 3000, 3440, 3840,
    ]
  : [320, 375, 639, 640, 768, 1023, 1024, 1180, 1366, 1440, 1920, 1999, 2000, 2560, 3840];

const HEIGHTS = FULL
  ? [
      400, 480, 568, 600, 633, 639, 640, 641, 667, 700, 709, 710, 768, 800, 844, 900, 945, 1023,
      1024, 1025, 1080, 1200, 1366, 1440, 2160,
    ]
  : [480, 568, 633, 640, 709, 710, 768, 900, 1024, 1440, 2160];

const LONG_ADDRESS = encodeURIComponent('muhammad.abdullah.khan.freelancer@example-company.com');

/**
 * Every screen, and the ones with fields also with every field in error: an
 * error line under each field is the tallest and widest a form gets, and it is
 * where text most often runs into the control beside it.
 */
const SCREENS: Array<{ name: string; path: string; submitFirst?: string }> = [
  { name: 'sign in', path: '/sign-in' },
  { name: 'sign in with every error', path: '/sign-in', submitFirst: 'Sign in' },
  { name: 'sign up', path: '/sign-up' },
  { name: 'sign up with every error', path: '/sign-up', submitFirst: 'Continue' },
  { name: 'confirm email', path: `/confirm-email?email=${LONG_ADDRESS}` },
  { name: 'recover', path: '/recover' },
  { name: 'recover with every error', path: '/recover', submitFirst: 'Reset password' },
  { name: 'recovery code', path: `/recover/verify?email=${LONG_ADDRESS}` },
  { name: 'reset password', path: '/reset-password?token=example' },
  {
    name: 'reset password with every error',
    path: '/reset-password?token=example',
    submitFirst: 'Change',
  },
];

test.beforeEach(async ({ page }) => {
  // The same reason as responsive.spec.ts: WebKit applies the policy's
  // `upgrade-insecure-requests` to localhost and measures an unstyled page.
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
 * Every rule the page breaks at the current size, as sentences. Runs in the
 * browser, so it must not reach for anything outside itself.
 */
async function layoutFaults({ foldRule }: { foldRule: boolean }): Promise<string[]> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  window.scrollTo(0, 0);

  const faults = new Set<string>();
  const width = document.documentElement.clientWidth;
  const height = window.innerHeight;
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
    `${element.tagName.toLowerCase()} "${(element.getAttribute('aria-label') ?? element.textContent ?? '').trim().slice(0, 24)}"`;

  const main = document.querySelector('#main-content');
  if (main === null) return ['the page has no main content'];
  const panel = document.querySelector('aside');
  const panelShown = panel !== null && getComputedStyle(panel).display !== 'none';

  if (document.documentElement.scrollWidth > width + 1) faults.add('the page scrolls sideways');
  if (width >= 1024 && !panelShown) faults.add('the panel is missing at 1024px and up');
  if (width < 1024 && panelShown) faults.add('the panel shows below 1024px');

  // Nothing in the form column crosses the window's edge or runs under the panel.
  const columnRight = panel !== null && panelShown ? box(panel).left : width;
  for (const element of main.querySelectorAll(
    'input, button, a, label, h1, p, li, [role="group"]',
  )) {
    if (!shown(element)) continue;
    const rect = box(element);
    if (rect.left < -1 || rect.right > columnRight + 1) faults.add(`${name(element)} is cut off`);
  }

  // Readable text, and controls at least WCAG 2.2's 24px target size. A text
  // input is hit through its bordered shell rather than its own line box.
  for (const element of main.querySelectorAll('h1, p, label, a, button, li')) {
    if (!shown(element) || (element.textContent ?? '').trim() === '') continue;
    if (parseFloat(getComputedStyle(element).fontSize) < 12) {
      faults.add(`${name(element)} is under 12px`);
    }
  }
  const fields = [...main.querySelectorAll('input:not([type="checkbox"])')].map((input) =>
    input.closest('[role="group"]') === null ? (input.parentElement ?? input) : input,
  );
  for (const element of [...fields, ...main.querySelectorAll('button')]) {
    if (!shown(element)) continue;
    const rect = box(element);
    if (rect.width < 23.5 || rect.height < 23.5) faults.add(`${name(element)} is under 24px`);
  }

  // Blocks in the flow never land on one another.
  const blocks = [
    ...main.querySelectorAll('h1, p, label, li, [role="group"]'),
    ...fields.filter((field) => field.closest('[role="group"]') === null),
    ...[...main.querySelectorAll('button')].filter((button) =>
      fields.every((field) => !field.contains(button)),
    ),
  ].filter(shown);
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

  // In any desktop-sized window the screen's action is on screen without
  // scrolling; 633px is what a 1366x768 laptop leaves a browser page. Not with
  // every field in error — that form is meant to be corrected from the top.
  const submits = main.querySelectorAll('button[type="submit"]');
  const submit = submits[submits.length - 1];
  if (
    foldRule &&
    width >= 1024 &&
    height >= 633 &&
    submit !== undefined &&
    box(submit).bottom > height + 0.5
  ) {
    faults.add('the button is below the fold');
  }

  if (panel !== null && panelShown) {
    const area = box(panel);
    if (Math.abs(area.height - height) > 1) faults.add('the panel is not the window height');

    const paragraphs = [...panel.querySelectorAll('p')];
    const headline = paragraphs.find((p) => p.textContent?.includes('Work') === true);
    const tagline = paragraphs.find((p) => p.textContent?.includes('Your Work Space') === true);
    const rule = panel.querySelector('span.bg-content-on-accent') ?? undefined;
    const pill = [...panel.querySelectorAll('span')].find(
      (span) => span.textContent?.trim() === 'Keep growing',
    );

    if (headline !== undefined) {
      const lines = Math.round(
        box(headline).height / parseFloat(getComputedStyle(headline).lineHeight),
      );
      if (lines !== 2) faults.add(`the panel headline is on ${lines} lines`);
    }
    const stack = [headline, rule, tagline, pill].filter(
      (element): element is Element => element !== undefined,
    );
    for (const [index, upper] of stack.entries()) {
      const lower = stack[index + 1];
      if (lower !== undefined && box(upper).bottom > box(lower).top + 1) {
        faults.add('the panel text overlaps');
      }
    }
    for (const text of [headline, tagline, pill]) {
      if (text !== undefined && box(text).right > area.right + 1) {
        faults.add('the panel text runs off the panel');
      }
    }

    const photo = panel.querySelector('img[src*="workspace"]');
    if (photo !== null) {
      const rect = box(photo);
      if (rect.left < area.left - 1 || rect.right > area.right + 1) {
        faults.add('the photograph runs off the panel');
      }
      if (rect.bottom < area.top + area.height * 0.9) {
        faults.add('the photograph stops short of the panel foot');
      }
    }
  }

  return [...faults];
}

for (const screen of SCREENS) {
  test(`${screen.name} holds its layout at every window size`, async ({ page }) => {
    test.setTimeout(FULL ? 1_200_000 : 300_000);

    await page.goto(screen.path);
    await page.locator('#main-content button[type="submit"]').last().waitFor();
    await page.evaluate(() => document.fonts.ready);
    if (screen.submitFirst !== undefined) {
      await page.getByRole('button', { name: screen.submitFirst, exact: true }).click();
      await expect(page.getByRole('alert').first()).toBeVisible();
    }

    const faults: string[] = [];
    for (const width of WIDTHS) {
      for (const height of HEIGHTS) {
        await page.setViewportSize({ width, height });
        const found = await page.evaluate(layoutFaults, {
          foldRule: screen.submitFirst === undefined,
        });
        faults.push(...found.map((fault) => `${width}x${height}: ${fault}`));
      }
    }

    // The first forty are enough to see the pattern; the count says how far it goes.
    expect(faults.slice(0, 40), `${faults.length} layout faults on ${screen.name}`).toEqual([]);
  });
}
