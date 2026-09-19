import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPublicProfile } from '@/features/public-profile/api.ts';
import { PublicProfileScreen } from '@/features/public-profile/public-profile-screen.tsx';

/**
 * A freelancer's public profile, at the short address their slug makes.
 *
 * Rendered on the server: this is the page a buyer is sent a link to, and it
 * has to be readable — and shareable — without running the app's JavaScript or
 * holding a session.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await fetchPublicProfile(slug);

  // Nothing to describe, and nothing to index.
  //
  // Said here rather than left to the 404 Next renders below. That response is
  // a soft 404 — it answers 200, because the body has begun streaming by the
  // time `notFound()` is thrown and the status can no longer change — and Next
  // injects its own `noindex` into it. Without this, the root layout's
  // `index, follow` is what the page also carries, which is a direct
  // contradiction for a crawler to resolve. A real 404 status would mean
  // checking every `/p/` request in `proxy` before the response starts, which
  // costs an API round trip on every visit to a profile that does exist.
  if (profile === null) {
    return { title: 'Profile not found', robots: { index: false, follow: false } };
  }

  return {
    title: profile.displayName ?? 'HireEvo profile',
    ...(profile.headline === null ? {} : { description: profile.headline }),
    // The freelancer's own answer. Everything is out of the index until they
    // say otherwise, which is what the setting promises them.
    robots: profile.searchIndexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await fetchPublicProfile(slug);

  // A draft, a suspended profile, one switched back to private and a slug that
  // never existed all arrive here identically — which is how the API answers
  // them, so that a slug cannot be used to tell them apart.
  if (profile === null) notFound();

  return <PublicProfileScreen profile={profile} />;
}
