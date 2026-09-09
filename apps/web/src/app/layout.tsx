import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { env } from '@/env';
import './globals.css';

// The variable name is deliberately not `--font-sans`: `--he-font-family-sans`
// already resolves to it, and Tailwind's own `--font-sans` points at that. Two
// of the three sharing a name would make the chain resolve to itself.
const sans = Inter({
  subsets: ['latin'],
  variable: '--font-hireevo-sans',
  display: 'swap',
});

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

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1d2221' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-dvh bg-surface text-content antialiased">
        {/* Visible only once focused, which is the whole point: a keyboard user
            should not have to tab through a navigation on every page. */}
        <a
          href="#main-content"
          className="sr-only rounded-md bg-accent px-4 py-2 font-medium text-content-on-accent focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
