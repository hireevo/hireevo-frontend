/**
 * The workspace column: 1294px of content, with the gutter added outside that
 * width rather than taken from it.
 *
 * Read from the design rather than estimated. The client-profile frame is
 * 1536 wide and its content sits between x=121 and x=1415 — 1294 across — and
 * the top navigation in that same frame uses the same gutters, which is what
 * makes the logo line up with the breadcrumb under it.
 *
 * It was 1036, which left about 140px of extra gutter on each side and put the
 * header and the page content on two different left edges.
 */
export const CONTAINER =
  'mx-auto w-full max-w-[calc(1294px+2rem)] px-4 sm:max-w-[calc(1294px+3rem)] sm:px-6';

/** The small uppercase label above a heading: "PROFESSIONAL WORKSPACE". */
export const EYEBROW =
  'text-[0.8125rem] leading-5 font-medium tracking-wide text-content-link uppercase';
