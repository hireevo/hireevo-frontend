import Link from 'next/link';

/**
 * The shell the legal pages share: a plain header with a way back to sign-in
 * and a centred reading column. Deliberately not the split auth shell — these
 * pages are public reference documents, not a step in a flow.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-subtle">
      <header className="border-b border-border-strong/40">
        <div className="mx-auto flex w-full max-w-[760px] items-center justify-between px-6 py-5">
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
      <main id="main-content" className="mx-auto w-full max-w-[760px] flex-1 px-6 py-12">
        {children}
      </main>
    </div>
  );
}
