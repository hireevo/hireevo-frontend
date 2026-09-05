import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// The variable name is deliberately not `--font-sans`: `--he-font-family-sans`
// already resolves to it, and Tailwind's own `--font-sans` points at that. Two
// of the three sharing a name would make the chain resolve to itself.
const sans = Inter({
  subsets: ['latin'],
  variable: '--font-hireevo-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'HireEvo',
    template: '%s · HireEvo',
  },
  description:
    'Build a credible professional profile, publish a portfolio, and be found — without exposing your private contact details.',
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
      <body className="min-h-dvh bg-surface text-content antialiased">{children}</body>
    </html>
  );
}
