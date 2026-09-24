import { expect, type Page } from '@playwright/test';

/**
 * The resolution sweep behind docs/engineering-standards.md §6.11, shared by the
 * screens that use it so there is one copy of the rules rather than one per
 * screen.
 *
 * Widths are common sizes plus a pixel either side of each switch the layouts
 * use: `sm` 640, `lg` 1024, and 1148, where a 1100px column stops growing.
 */
export const FULL = process.env['SWEEP'] === 'full';

export const WIDTHS = FULL
  ? [
      320, 344, 360, 375, 390, 412, 430, 480, 540, 600, 639, 640, 641, 700, 768, 820, 900, 1023,
      1024, 1025, 1100, 1147, 1148, 1149, 1280, 1366, 1440, 1536, 1600, 1920, 2560, 3440, 3840,
    ]
  : [320, 375, 639, 640, 768, 1023, 1024, 1147, 1149, 1366, 1536, 1920, 2560, 3840];

export const HEIGHTS = FULL ? [480, 568, 768, 900, 1080, 1440, 2160] : [568, 900];

/** Every rule the page breaks at the current size, as sentences. Runs in the browser. */
export async function layoutFaults(): Promise<string[]> {
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

  // A modal covers the page and makes it inert, so with one open the only
  // layout on screen is the dialog's. Measuring both reports every block in the
  // dialog as overlapping every block behind it — dozens of faults, none of
  // them real, and a genuine one buried among them.
  const modal = document.querySelector('[role="dialog"][aria-modal="true"]');
  const PARTS =
    'a, button, h2, h3, p, li, label, legend, input, select, textarea, [role="progressbar"], [data-slot="badge"]';
  const elements = [
    ...(modal === null
      ? document.querySelectorAll(
          `${PARTS.split(', ')
            .map((part) => (part.startsWith('[') ? part : `main ${part}`))
            .join(', ')}`,
        )
      : modal.querySelectorAll(PARTS)),
  ].filter(shown);
  // Measured once: a page can carry hundreds of these, and the overlap check
  // below compares each pair.
  const rects = new Map(elements.map((element) => [element, box(element)]));
  const rectOf = (element: Element) => rects.get(element) ?? box(element);

  for (const element of elements) {
    const rect = rectOf(element);
    if (rect.left < -1 || rect.right > width + 1) faults.add(`${name(element)} is cut off`);
    if (
      (element.textContent ?? '').trim() !== '' &&
      parseFloat(getComputedStyle(element).fontSize) < 12
    ) {
      faults.add(`${name(element)} is under 12px`);
    }
    if (element.matches('button, input, select, textarea')) {
      // A checkbox or radio is clicked through its label, so the label is the
      // target WCAG 2.5.8 measures.
      const target = element.matches('[type="checkbox"], [type="radio"]')
        ? (element.closest('label') ?? element)
        : element;
      const size = rectOf(target);
      if (size.width < 23.5 || size.height < 23.5) faults.add(`${name(element)} is under 24px`);
    }
  }

  const blocks = elements.filter((element) =>
    element.matches(
      'h2, h3, p, a, button, label, legend, input, select, textarea, [role="progressbar"], [data-slot="badge"]',
    ),
  );
  for (const [index, first] of blocks.entries()) {
    for (const second of blocks.slice(index + 1)) {
      if (first.contains(second) || second.contains(first)) continue;
      const a = rectOf(first);
      const b = rectOf(second);
      const across = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const down = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (across > 1 && down > 1) faults.add(`${name(first)} overlaps ${name(second)}`);
    }
  }

  return [...faults];
}

/** Runs `layoutFaults` at every size in the sweep and fails with what it found. */
export async function sweep(page: Page, label: string) {
  const faults: string[] = [];
  for (const width of WIDTHS) {
    for (const height of HEIGHTS) {
      await page.setViewportSize({ width, height });
      const found = await page.evaluate(layoutFaults);
      faults.push(...found.map((fault) => `${width}x${height}: ${fault}`));
    }
  }
  expect(faults.slice(0, 40), `${faults.length} layout faults on ${label}`).toEqual([]);
}
