'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LuArrowLeft, LuEye } from 'react-icons/lu';
import { cn } from '@hireevo/ui-web';
import { useSession } from '@/features/auth/session.tsx';
import { ProfilePreviewScreen } from '@/features/profile/profile-preview-screen.tsx';
import type { OwnProfile } from '@/features/profile-setup/api.ts';
import { CONTAINER } from '@/features/workspace/layout.ts';
import { api } from '@/lib/api.ts';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; profile: OwnProfile }
  | { kind: 'none' }
  | { kind: 'failed' };

/**
 * The owner looking at their finished profile.
 *
 * Read from `/profiles/me` — everything they entered — rather than from the
 * public serializer, because the question this page answers is "is all of my
 * work here". A section marked private would otherwise be missing from the
 * preview with nothing to tell that apart from a section that never saved, and
 * the person who finds out is the one who thought the work was gone. What a
 * buyer would not see is marked on the card instead, which answers both.
 *
 * Fetched in the browser rather than on the server: this page needs the access
 * token, which lives in memory in this tab. The public page at `/p/{slug}` is
 * the opposite — rendered on the server, because it has to be readable by
 * someone with no session at all.
 */
export function ProfilePreview() {
  const { user } = useSession();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let live = true;

    void (async () => {
      try {
        const { data, response } = await api.GET('/api/v1/profiles/me');
        if (!live) return;

        if (data !== undefined) setState({ kind: 'ready', profile: data });
        else if (response.status === 404) setState({ kind: 'none' });
        else setState({ kind: 'failed' });
      } catch {
        if (live) setState({ kind: 'failed' });
      }
    })();

    return () => {
      live = false;
    };
  }, []);

  return (
    <>
      {/* Its own landmark, because it sits outside the profile's `main` and
          everything on a page has to be inside one. */}
      <aside
        aria-label="Preview notice"
        className="border-b border-border-subtle bg-surface-accent-subtle"
      >
        <div className={cn(CONTAINER, 'flex flex-wrap items-center justify-between gap-3 py-3')}>
          <p className="flex min-w-0 items-center gap-2 text-sm text-content-accent">
            <LuEye aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0">
              This is your profile as it reads. Anything a buyer cannot see is marked.
            </span>
          </p>
          <Link
            href="/client-profile"
            className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-content-accent transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <LuArrowLeft aria-hidden="true" className="size-4" />
            Back to editing
          </Link>
        </div>
      </aside>

      <main id="main-content" className={cn(CONTAINER, 'pt-8 pb-24')}>
        {state.kind === 'ready' ? (
          <ProfilePreviewScreen profile={state.profile} username={user?.username ?? null} />
        ) : (
          <p role="status" className="text-sm text-content-subtle">
            {state.kind === 'loading'
              ? 'Loading your preview…'
              : state.kind === 'none'
                ? 'There is nothing to preview yet — fill in your profile first.'
                : 'Your preview could not be loaded. Try again in a moment.'}
          </p>
        )}
      </main>
    </>
  );
}
