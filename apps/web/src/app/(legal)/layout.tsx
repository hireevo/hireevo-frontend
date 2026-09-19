import Link from 'next/link';

/**
 * The reading shell for the legal pages.
 *
 * Deliberately not the auth split: these are documents to be read top to
 * bottom, so they get a single measured column, a quiet header that leads back
 * to the app, and nothing competing for attention beside them.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface-subtle">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            href="/sign-in"
            className="text-lg font-extrabold tracking-tight text-content-accent"
          >
            HireEvo
          </Link>
          <Link
            href="/sign-in"
            className="text-sm font-medium text-content-link underline underline-offset-2"
          >
            Back to sign in
          </Link>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        {children}
      </main>
    </div>
  );
}
