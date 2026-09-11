import { expect, test } from '@playwright/test';

/**
 * The panel beside the auth forms is a fixed composition scaled to whatever
 * column it lands in, and the pieces are positioned independently of each
 * other. That is exactly the arrangement where two of them can drift into one
 * another at a window size nobody happened to open — which is how the rule
 * under the headline ended up inside its descenders at 1920x1080 while looking
 * correct at the design's own 1440x1024.
 *
 * So the relationship is asserted rather than the pixels: at every size, the
 * rule sits clear of the headline and the headline stays on two lines.
 */
const SIZES = [
  { width: 1440, height: 1024, note: "the design's own frame" },
  { width: 1920, height: 1080, note: 'a wide desktop' },
  { width: 1600, height: 900, note: 'a short desktop' },
  { width: 1280, height: 720, note: 'a small laptop' },
  { width: 1024, height: 1366, note: 'a portrait tablet' },
];

for (const { width, height, note } of SIZES) {
  test(`the rule clears the headline at ${width}x${height} (${note})`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    // Sign-up rather than sign-in: the sign-in frame draws the panel without the
    // rule (see the test below), so there is nothing there to measure.
    await page.goto('/sign-up');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);

    // Measured in one pass inside the page rather than through two locators.
    // The root loading boundary remounts its content as the page hydrates, so a
    // node found a moment earlier can be gone by the time it is measured — which
    // read as "the headline is missing" on a panel that was plainly on screen.
    const measured = await page.evaluate(() => {
      const panel = document.querySelector('aside');
      const headline = [...(panel?.querySelectorAll('p') ?? [])].find((node) =>
        node.textContent?.includes('Work'),
      );
      const rule = panel?.querySelector('span.bg-content-on-accent');
      if (headline === undefined || rule === null || rule === undefined) return null;
      const headlineBox = headline.getBoundingClientRect();
      return {
        headlineBottom: headlineBox.bottom,
        headlineHeight: headlineBox.height,
        ruleTop: rule.getBoundingClientRect().top,
        lineHeight: parseFloat(getComputedStyle(headline).lineHeight),
      };
    });

    expect(measured, 'the headline or the rule is missing').not.toBeNull();
    if (measured === null) return;

    // Ten pixels rather than zero: touching is the same defect as overlapping,
    // and a descender reaches below the line box the measurement returns.
    expect(
      measured.ruleTop - measured.headlineBottom,
      'the rule has drifted into the headline',
    ).toBeGreaterThan(10);

    // Two lines, as drawn. A wrap would mean the type outgrew its column, which
    // is the other way this composition comes apart.
    expect(Math.round(measured.headlineHeight / measured.lineHeight), 'the headline wrapped').toBe(
      2,
    );
  });
}

/**
 * Which frames draw the rule and the "Keep growing" pill.
 *
 * Sign-in and recover contain both layers in the design, but beneath the blue
 * panel, so what those frames show is a panel without them. Every other auth
 * frame shows them. Asserted per route so the two sets cannot quietly converge.
 */
const ACCENTS = [
  { path: '/sign-in', shown: false },
  { path: '/recover', shown: false },
  { path: '/sign-up', shown: true },
  { path: '/confirm-email?email=example%40gmail.com', shown: true },
  { path: '/recover/verify?email=example%40gmail.com', shown: true },
  { path: '/reset-password?token=example', shown: true },
];

for (const { path, shown } of ACCENTS) {
  test(`the panel ${shown ? 'shows' : 'omits'} the rule and pill on ${path.split('?')[0]}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1024 });
    await page.goto(path);

    const panel = page.locator('aside');
    await expect(panel.locator('span.bg-content-on-accent')).toHaveCount(shown ? 1 : 0);
    await expect(panel.getByText('Keep growing')).toHaveCount(shown ? 1 : 0);
  });
}
