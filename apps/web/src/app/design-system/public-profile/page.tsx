import type { Metadata } from 'next';
import { DESIGN_PUBLIC_PROFILE } from '@/features/public-profile/design-fixture.ts';
import { PublicProfileScreen } from '@/features/public-profile/public-profile-screen.tsx';

export const metadata: Metadata = {
  title: 'Public profile preview',
  robots: { index: false, follow: false },
};

/**
 * The public profile with sample content and no account behind it.
 *
 * The real page at `/p/[slug]` is rendered on the server, so its data never
 * travels through the browser and the layout suite cannot answer it there.
 * This route renders the same component from a fixture, which is what the
 * resolution sweep measures — as `/design-system/workspace` does for the
 * dashboard.
 */
export default function PublicProfilePreviewPage() {
  return (
    <>
      {/* A landmark, because everything on a page has to sit inside one and
          this sits outside the page's own `main`. */}
      <aside
        aria-label="Preview notice"
        className="bg-surface-warning-subtle px-4 py-2 text-center text-sm text-content-warning"
      >
        Design preview with sample content — none of it is account data.
      </aside>
      <PublicProfileScreen profile={DESIGN_PUBLIC_PROFILE} />
    </>
  );
}
