import Link from 'next/link';
import { Button } from '@hireevo/ui-web';

export default function HomePage() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6 py-16"
    >
      <p className="text-sm font-medium tracking-wide text-content-accent uppercase">HireEvo</p>
      <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
        The web app scaffold is up.
      </h1>
      <p className="max-w-prose text-lg text-content-muted">
        The account screens from the design file are in. Everything past them — the freelancer
        workspace dashboard — is still to come.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/sign-in">
          <Button>Sign in</Button>
        </Link>
        <Link
          href="/design-system"
          className="inline-flex h-10 items-center rounded-md border border-border-strong px-4 font-medium hover:bg-surface-subtle"
        >
          View the design system
        </Link>
      </div>
    </main>
  );
}
