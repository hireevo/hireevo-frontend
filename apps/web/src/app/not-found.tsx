import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-6"
    >
      <p className="font-mono text-sm text-content-subtle">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">This page does not exist</h1>
      <p className="text-content-muted">
        The link may be out of date, or the profile behind it may no longer be published.
      </p>
      <div>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-md bg-accent px-4 font-medium text-content-on-accent hover:bg-accent-hover"
        >
          Back to HireEvo
        </Link>
      </div>
    </main>
  );
}
