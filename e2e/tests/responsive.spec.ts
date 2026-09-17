import { expect, test, type Page } from '@playwright/test';

/**
 * The auth screens at the sizes people actually open them at, on every engine
 * this file runs on — Chromium, Firefox, WebKit and phone Safari (see the
 * projects in playwright.config.ts).
 *
 * Nothing here compares pixels with the design; the design is one 1440px frame.
 * This asserts what breaks when a layout meets a screen nobody drew: the page
 * sliding sideways, a control pushed past the edge, two halves of a row landing
 * on each other, the side panel showing where there is no room for it, and a
 * dialog whose top or button cannot be reached. Each of those was a real defect
 * on at least one engine before this file existed.
 */
const LONG_ADDRESS = encodeURIComponent('muhammad.abdullah.khan.freelancer@example-company.com');

const SCREENS = [
  { name: 'sign in', path: '/sign-in' },
  { name: 'sign up', path: '/sign-up' },
  { name: 'confirm email', path: `/confirm-email?email=${LONG_ADDRESS}` },
  { name: 'recover', path: '/recover' },
  { name: 'recovery code', path: `/recover/verify?email=${LONG_ADDRESS}` },
  { name: 'reset password', path: '/reset-password?token=example' },
];

const SIZES = [
  { width: 320, height: 568, note: 'the smallest phone' },
  { width: 390, height: 844, note: 'a phone' },
  { width: 844, height: 390, note: 'a phone on its side' },
  { width: 768, height: 1024, note: 'a tablet' },
  { width: 1024, height: 768, note: 'where the panel appears' },
  { width: 1366, height: 768, note: 'a laptop' },
  { width: 2560, height: 1440, note: 'a large desktop' },
];

test.beforeEach(async ({ page }) => {
  // The suite serves the production build over plain http, and its policy asks
  // for `upgrade-insecure-requests`. WebKit applies that to localhost too:
  // every stylesheet and image is rewritten to https, fails, and the page is
  // measured unstyled — which reports a hundred layout faults that do not
  // exist. Playwright's `bypassCSP` does not stop the upgrade in WebKit, so the
  // header is removed from the document instead. Real production is served
  // over TLS, layout does not depend on the policy, and the headers themselves
  // are asserted in security-headers.spec.ts.
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

/** Every layout problem on the page as it stands, as sentences. Empty means fine. */
function layoutProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const problems: string[] = [];
    const width = document.documentElement.clientWidth;
    const shown = (element: Element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return (
        style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0
      );
    };
    const name = (element: Element) =>
      `${element.tagName.toLowerCase()} "${(element.getAttribute('aria-label') ?? element.textContent ?? '').trim().slice(0, 30)}"`;

    if (document.documentElement.scrollWidth > width + 1) {
      problems.push(`the page scrolls sideways (${document.documentElement.scrollWidth}px wide)`);
    }

    const main = document.querySelector('#main-content');
    for (const control of main?.querySelectorAll('input, button, a, label') ?? []) {
      if (!shown(control) || control.closest('.sr-only')) continue;
      const box = control.getBoundingClientRect();
      if (box.left < -1 || box.right > width + 1) {
        problems.push(
          `${name(control)} runs past the edge (${Math.round(box.left)}–${Math.round(box.right)})`,
        );
      }
    }

    for (const row of main?.querySelectorAll('.justify-between, .grid') ?? []) {
      const halves = [...row.children].filter(shown).map((child) => child.getBoundingClientRect());
      for (let a = 0; a < halves.length; a += 1) {
        for (let b = a + 1; b < halves.length; b += 1) {
          const first = halves[a];
          const second = halves[b];
          if (first === undefined || second === undefined) continue;
          const across = Math.min(first.right, second.right) - Math.max(first.left, second.left);
          const down = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
          if (across > 1 && down > 1) problems.push(`two halves of a row overlap in ${name(row)}`);
        }
      }
    }

    const panel = document.querySelector('aside');
    if (panel !== null) {
      const panelShown = getComputedStyle(panel).display !== 'none';
      if (width < 1024 && panelShown) problems.push('the side panel shows below 1024px');
      if (width >= 1024 && !panelShown) problems.push('the side panel is missing at 1024px and up');
    }

    return problems;
  });
}

for (const screen of SCREENS) {
  test(`${screen.name} fits every screen size`, async ({ page }) => {
    for (const size of SIZES) {
      await test.step(`${size.width}x${size.height} (${size.note})`, async () => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.goto(screen.path);
        await page.evaluate(() => document.fonts.ready);
        expect
          .soft(await layoutProblems(page), `${screen.name} at ${size.width}x${size.height}`)
          .toEqual([]);
      });
    }
  });
}

/**
 * Browser windows rather than screens: a 1366x768 laptop leaves about 633px
 * once the tabs, the address bar and the taskbar have taken theirs. At the
 * design's 1024px spacing sign-in put its button below that, and the panel —
 * stretched to the form's height rather than the window's — cut its photograph
 * off wherever the window ended.
 */
const WINDOWS = [
  { width: 1366, height: 633, note: 'a 1366x768 laptop' },
  { width: 1536, height: 730, note: 'a 1080p laptop at 125%' },
  { width: 1440, height: 790, note: 'a 13-inch MacBook' },
  { width: 1920, height: 945, note: 'a 1080p desktop' },
];

for (const screen of SCREENS) {
  test(`${screen.name} keeps its button on screen in a laptop browser`, async ({ page }) => {
    for (const size of WINDOWS) {
      await test.step(`${size.width}x${size.height} (${size.note})`, async () => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.goto(screen.path);
        // The root loading skeleton can still be up when `goto` resolves, and a
        // skeleton has neither a button nor a panel to measure.
        await page.locator('#main-content button[type="submit"]').last().waitFor();
        await page.evaluate(() => document.fonts.ready);
        // The panel is sized in `dvh`; for a frame right after a viewport change
        // Chromium under load reports that as zero — a not-yet-laid-out reading,
        // not a collapsed panel (which the resolution sweep would catch). Wait
        // for a real height before measuring, so the transient is never asserted.
        await expect
          .poll(() =>
            page.evaluate(
              () => document.querySelector('aside')?.getBoundingClientRect().height ?? 0,
            ),
          )
          .toBeGreaterThan(0);
        // One pass inside the page, for the same remount reason as the panel spec.
        const fit = await page.evaluate(() => {
          const buttons = document.querySelectorAll('#main-content button[type="submit"]');
          const button = buttons[buttons.length - 1];
          return {
            buttonBottom: button?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY,
            panelHeight: document.querySelector('aside')?.getBoundingClientRect().height ?? 0,
          };
        });

        expect
          .soft(fit.buttonBottom, `${screen.name}'s button is below the fold`)
          .toBeLessThanOrEqual(size.height);
        expect
          .soft(Math.round(fit.panelHeight), `the panel is not the window's height`)
          .toBe(size.height);
      });
    }
  });
}

test('the password changed dialog can be read and closed at every size', async ({ page }) => {
  // Answered here rather than by an API: this is about where the dialog lands,
  // and it must be checkable without the accounts stack running.
  await page.route('**/api/v1/auth/password/reset', (route) => {
    const origin = route.request().headers()['origin'] ?? '*';
    const headers = {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'POST',
    };
    return route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers })
      : route.fulfill({
          status: 200,
          headers,
          contentType: 'application/json',
          body: '{"reset":true}',
        });
  });

  await page.goto('/reset-password?token=example');
  await page.getByLabel('New Password', { exact: true }).fill('Brand-New-Pass-7');
  await page.getByLabel('Confirm New Password').fill('Brand-New-Pass-7');
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByRole('dialog', { name: 'Password Changed!' })).toBeVisible();

  for (const size of SIZES) {
    await test.step(`${size.width}x${size.height} (${size.note})`, async () => {
      await page.setViewportSize({ width: size.width, height: size.height });
      const fit = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog === null) return { missing: true, top: 0, buttonBottom: 0, width: 0 };
        let scroller: Element | null = dialog.parentElement;
        while (scroller !== null && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) {
          scroller = scroller.parentElement;
        }
        const area = scroller ?? document.scrollingElement ?? document.documentElement;
        area.scrollTop = 0;
        const top = dialog.getBoundingClientRect().top;
        area.scrollTop = area.scrollHeight;
        const buttonBottom = dialog.querySelector('button')?.getBoundingClientRect().bottom ?? 0;
        area.scrollTop = 0;
        return { missing: false, top, buttonBottom, width: dialog.getBoundingClientRect().width };
      });

      expect.soft(fit.missing, 'the dialog closed on resize').toBe(false);
      // The top of the card has to be on screen when scrolled to the top, and
      // the button on screen when scrolled to the bottom — a dialog centred in a
      // too-short scroller loses its top where scrolling cannot reach.
      expect
        .soft(fit.top, `the dialog's top is cut off at ${size.width}x${size.height}`)
        .toBeGreaterThanOrEqual(0);
      expect
        .soft(
          fit.buttonBottom,
          `the dialog's button is unreachable at ${size.width}x${size.height}`,
        )
        .toBeLessThanOrEqual(size.height + 1);
      expect
        .soft(fit.width, `the dialog is wider than ${size.width}px`)
        .toBeLessThanOrEqual(size.width);
    });
  }
});

for (const screen of [
  { name: 'sign up', path: '/sign-up' },
  { name: 'reset password', path: '/reset-password?token=example' },
]) {
  test(`a password typed before ${screen.name} finishes loading is kept`, async ({ page }) => {
    // WebKit reset a controlled field to its server-rendered empty value during
    // hydration, silently discarding what someone on a slow phone had already
    // typed. The field is uncontrolled now; this keeps it that way. `commit`
    // hands control back as soon as the HTML arrives, before the page hydrates.
    await page.goto(screen.path, { waitUntil: 'commit' });
    const field = page.locator('input[name="password"]');
    await field.fill('Brand-New-Pass-7');
    await page.waitForLoadState('networkidle');

    await expect(field).toHaveValue('Brand-New-Pass-7');
    // And the rules saw it too, not just the input.
    await expect(page.getByRole('listitem').filter({ hasText: /— met$/ })).toHaveCount(4);
  });
}

for (const screen of [
  { name: 'sign in', path: '/sign-in' },
  { name: 'sign up', path: '/sign-up' },
  { name: 'reset password', path: '/reset-password?token=example' },
]) {
  test(`pressing Enter before ${screen.name} loads keeps the password out of the address bar`, async ({
    page,
  }) => {
    // Before hydration the form submits natively. With the default GET, Safari
    // sent `?password=…` to the server and into the history.
    const addresses: string[] = [];
    page.on('request', (request) => {
      if (request.isNavigationRequest()) addresses.push(request.url());
    });

    await page.goto(screen.path, { waitUntil: 'commit' });
    const field = page.locator('input[name="password"]');
    await field.fill('Secret-Pass-9');
    await field.press('Enter');
    await page.waitForLoadState('networkidle');

    expect(addresses.filter((address) => /password=/i.test(address))).toEqual([]);
  });
}
