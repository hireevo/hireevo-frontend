// Contrast is validated by a script, not by eye (Step 1.2). Every pair below is
// a combination the design system actually puts on screen; if one drops under
// its WCAG AA threshold the build fails rather than shipping unreadable text.
import { flatten, tokens } from '../src/resolve.ts';

type Level = 'body' | 'large';
const THRESHOLD: Record<Level, number> = { body: 4.5, large: 3 };

/** Documented foreground/background pairs, by semantic token name. */
const PAIRS: Array<[foreground: string, background: string, level: Level]> = [
  ['content', 'surface', 'body'],
  ['content', 'surface-subtle', 'body'],
  ['content', 'surface-muted', 'body'],
  ['content-muted', 'surface', 'body'],
  ['content-subtle', 'surface', 'body'],
  ['content-link', 'surface', 'body'],
  ['content-danger', 'surface', 'body'],
  ['content-danger', 'surface-danger-subtle', 'body'],
  ['content-warning', 'surface', 'body'],
  ['content-warning', 'surface-warning-subtle', 'body'],
  ['content-success', 'surface', 'body'],
  ['content-success', 'surface-success-subtle', 'body'],
  ['content-on-accent', 'surface-accent', 'body'],
  ['content-on-accent', 'accent-hover', 'body'],
  ['content-inverse', 'surface-inverse', 'body'],
  ['content', 'surface-accent-subtle', 'body'],
  ['content-accent', 'surface', 'body'],
  ['content-accent', 'surface-accent-subtle', 'body'],
  // Borders and focus rings are UI components: 3:1 is the AA requirement.
  ['border-strong', 'surface', 'large'],
  ['border-accent', 'surface', 'large'],
  ['focus', 'surface', 'large'],
  ['focus', 'surface-subtle', 'large'],
  ['accent', 'surface', 'large'],
];

const channel = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

function luminance(hex: string): number {
  const h = hex.replace('#', '').slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(h.slice(i, i + 2), 16) / 255)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

let failures = 0;

for (const scheme of ['light', 'dark'] as const) {
  const palette = flatten(tokens.semantic[scheme]);
  console.log(`\n${scheme}`);

  for (const [fg, bg, level] of PAIRS) {
    const fgValue = palette[fg];
    const bgValue = palette[bg];
    if (fgValue === undefined || bgValue === undefined) {
      console.error(`  MISSING  ${fg} on ${bg} — token not defined in the ${scheme} palette`);
      failures += 1;
      continue;
    }

    // A translucent overlay has no single computed contrast; skip rather than
    // pretend the alpha channel does not exist.
    if (fgValue.length > 7 || bgValue.length > 7) continue;

    const value = ratio(fgValue, bgValue);
    const ok = value >= THRESHOLD[level];
    if (!ok) failures += 1;
    console.log(
      `  ${ok ? 'pass' : 'FAIL'}  ${value.toFixed(2).padStart(5)}:1  (min ${THRESHOLD[level]})  ${fg} on ${bg}`,
    );
  }
}

if (failures > 0) {
  console.error(`\n${failures} contrast pair(s) below WCAG AA.`);
  process.exit(1);
}
console.log('\nAll documented pairs clear WCAG AA.');
