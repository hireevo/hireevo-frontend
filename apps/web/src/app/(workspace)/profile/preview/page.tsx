import type { Metadata } from 'next';
import { ProfilePreview } from '@/features/public-profile/preview.tsx';

export const metadata: Metadata = {
  title: 'Profile preview',
  // Nothing here is for a crawler: it is one person's own draft, behind a
  // session, and the published page at `/p/{slug}` is the one meant to be found.
  robots: { index: false, follow: false },
};

/**
 * The owner's profile as buyers would see it, before it is published.
 *
 * In the `(workspace)` group, so being here is the protection (§6.6) — and the
 * preview itself is read from an endpoint that only ever answers with the
 * caller's own profile.
 */
export default function ProfilePreviewPage() {
  return <ProfilePreview />;
}
