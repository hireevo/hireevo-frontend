import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { SessionProvider } from '@/features/auth/session.tsx';
import { env } from '@/env';
import './globals.css';

/**
 * Plus Jakarta Sans, served from this repository instead of fetched from Google.
 *
 * `next/font/google` downloads the font **at build time**, so every build
 * depended on fonts.googleapis.com answering with CSS Turbopack can parse. It
 * stopped doing that once during CI on 25 September 2026 and failed a container
 * build on a commit that touched no CSS. The files in `src/fonts` are the exact
 * ones it was downloading — v12, one variable file per subset — so nothing a
 * browser fetches changes: `next/font/google` self-hosted them too.
 *
 * One `localFont` call per subset, because `unicode-range` is what keeps the
 * browser from downloading a face for a glyph it does not contain, and a single
 * call can only carry one range. Only latin is preloaded, which is what the
 * Google loader did for `subsets: ['latin']`; the other three are fetched the
 * first time a page actually renders one of their characters — a Vietnamese or
 * Polish name in somebody's profile, most often.
 */
// Each call is written out rather than built by a helper: the loader is a
// compile-time transform, and it refuses anything but a literal call assigned to
// a const in module scope.
const plusJakartaLatin = localFont({
  src: '../fonts/plus-jakarta-sans-latin.woff2',
  // The whole axis the variable file carries, so 500 and 600 interpolate rather
  // than snapping to the nearest of a few static cuts.
  weight: '200 800',
  style: 'normal',
  display: 'swap',
  // The one face worth fetching before it is needed: every screen is in English.
  preload: true,
  // The family's metric-adjusted fallback, sized from this file because this is
  // the face almost all text uses.
  adjustFontFallback: 'Arial',
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
});

const plusJakartaLatinExt = localFont({
  src: '../fonts/plus-jakarta-sans-latin-ext.woff2',
  weight: '200 800',
  style: 'normal',
  display: 'swap',
  preload: false,
  // One adjusted fallback for the family is enough, and the latin call owns it.
  adjustFontFallback: false,
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
    },
  ],
});

const plusJakartaVietnamese = localFont({
  src: '../fonts/plus-jakarta-sans-vietnamese.woff2',
  weight: '200 800',
  style: 'normal',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB',
    },
  ],
});

const plusJakartaCyrillicExt = localFont({
  src: '../fonts/plus-jakarta-sans-cyrillic-ext.woff2',
  weight: '200 800',
  style: 'normal',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    {
      prop: 'unicode-range',
      value: 'U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F',
    },
  ],
});

/**
 * The stack `--he-font-family-sans` resolves to: every real face first, the
 * adjusted fallback last.
 *
 * Order decides which face renders a character, so the fallback has to sort
 * behind all four — Arial has Ł, and a fallback sitting ahead of latin-ext
 * would render "Łukasz" in it while the right glyph was one file away. The
 * latin loader answers with its face and then its fallback, in that order, so
 * the fallback is split off here and appended.
 *
 * The variable name is deliberately not `--font-sans`: `--he-font-family-sans`
 * already resolves to it and Tailwind's own `--font-sans` points at that, so two
 * of the three sharing a name would make the chain resolve to itself.
 */
const [latinFamily, ...latinFallback] = plusJakartaLatin.style.fontFamily.split(', ');
const sansStack = [
  latinFamily,
  plusJakartaLatinExt.style.fontFamily,
  plusJakartaVietnamese.style.fontFamily,
  plusJakartaCyrillicExt.style.fontFamily,
  ...latinFallback,
].join(', ');

const description =
  'Build a credible professional profile, publish a portfolio, and be found — without exposing your private contact details.';

export const metadata: Metadata = {
  // Every relative URL in a canonical link, an Open Graph tag or the sitemap is
  // resolved against this. Without it Next emits relative URLs that crawlers
  // and link unfurlers resolve against whatever host served the page.
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: 'HireEvo',
    template: '%s · HireEvo',
  },
  description,
  applicationName: 'HireEvo',
  openGraph: {
    type: 'website',
    siteName: 'HireEvo',
    title: 'HireEvo',
    description,
    url: '/',
  },
  twitter: { card: 'summary_large_image', title: 'HireEvo', description },
  // Overridden per route. Unpublished profiles must set `noindex` explicitly.
  robots: { index: true, follow: true },
};

// The CSP nonce is per request (see src/middleware.ts), and Next can only stamp
// a per-request nonce onto its script tags while it is rendering the page for
// that request — a statically prerendered page ships build-time HTML with no
// nonce, so its scripts are blocked by `script-src`. Rendering every route
// dynamically is the cost of a nonce-based policy, taken deliberately here
// rather than shipping `'unsafe-inline'`. [F-13, §6.10]
export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  // One value, and it is the light surface: the app does not follow the
  // operating system's colour scheme, so offering the browser a dark one would
  // tint its chrome to match a palette the page never renders. See the note in
  // packages/tokens/scripts/build-css.ts.
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ '--font-hireevo-sans': sansStack } as React.CSSProperties}>
      <body className="min-h-dvh bg-surface text-content antialiased">
        {/* Visible only once focused, which is the whole point: a keyboard user
            should not have to tab through a navigation on every page. */}
        <a
          href="#main-content"
          className="sr-only rounded-md bg-accent px-4 py-2 font-medium text-content-on-accent focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
        >
          Skip to content
        </a>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
