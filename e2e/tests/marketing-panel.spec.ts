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
    await page.goto('/sign-in');
    await page.evaluate(() => document.fonts.ready);

    const panel = page.locator('aside');
    const headline = panel.locator('p', { hasText: 'Work' }).first();
    const rule = panel.locator('span.bg-content-on-accent').first();

    const [headlineBox, ruleBox] = await Promise.all([headline.boundingBox(), rule.boundingBox()]);
    expect(headlineBox, 'the headline is missing').not.toBeNull();
    expect(ruleBox, 'the rule is missing').not.toBeNull();
    if (headlineBox === null || ruleBox === null) return;

    // Ten pixels rather than zero: touching is the same defect as overlapping,
    // and a descender reaches below the line box the measurement returns.
    expect(
      ruleBox.y - (headlineBox.y + headlineBox.height),
      'the rule has drifted into the headline',
    ).toBeGreaterThan(10);

    // Two lines, as drawn. A wrap would mean the type outgrew its column, which
    // is the other way this composition comes apart.
    const lineHeight = await headline.evaluate((node) =>
      parseFloat(getComputedStyle(node).lineHeight),
    );
    expect(Math.round(headlineBox.height / lineHeight), 'the headline wrapped').toBe(2);
  });
}
