import type { Metadata } from 'next';
import Link from 'next/link';
import { ProfileBuilder } from '@/features/profile/profile-builder.tsx';

export const metadata: Metadata = {
  title: 'Client profile',
  description: 'Build the profile buyers see when they find you on HireEvo.',
  // Someone's half-written profile is not a search result. The published one
  // will be, at its own public URL.
  robots: { index: false, follow: false },
};

export default function ClientProfilePage() {
  return (
    <main id="main-content" className="mx-auto w-full max-w-[1010px] px-6 pt-10 pb-24">
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

      <h1 className="mt-8 text-4xl font-bold tracking-tight text-content-accent">
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
  );
}
