import type { Metadata } from 'next';
import Link from 'next/link';
import { cn } from '@hireevo/ui-web';
import { ProfileBuilder } from '@/features/profile/profile-builder.tsx';
import { CONTAINER } from '@/features/workspace/layout.ts';

export const metadata: Metadata = {
  title: 'Client profile',
  description: 'Build the profile buyers see when they find you on HireEvo.',
  // Someone's half-written profile is not a search result. The published one
  // will be, at its own public URL.
  robots: { index: false, follow: false },
};

export default function ClientProfilePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* The same column as the header above it, so the breadcrumb starts on
          the logo's left edge rather than 40px inside it. */}
      <main id="main-content" className={cn(CONTAINER, 'pt-8 pb-24')}>
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-content-subtle">
            <li>
              <Link href="/" className="rounded-sm transition-colors hover:text-content">
                Home
              </Link>
            </li>
            {/* The separator is decoration: read out, "Home slash Client profile"
                is worse than the list semantics the markup already carries. */}
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-content">
              Client profile
            </li>
          </ol>
        </nav>

        <h1 className="mt-8 text-3xl font-bold tracking-tight text-content-accent sm:text-4xl">
          Build a profile that wins briefs
        </h1>
        <p className="mt-3 max-w-[600px] text-base leading-[1.6] text-content-subtle">
          Everything buyers see at a glance. The more complete your profile, the higher you rank in
          search.
        </p>

        <div className="mt-7">
          <ProfileBuilder />
        </div>
      </main>
    </div>
  );
}
