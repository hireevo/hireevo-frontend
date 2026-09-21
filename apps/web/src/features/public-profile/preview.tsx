'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LuArrowLeft, LuEye } from 'react-icons/lu';
import { api } from '@/lib/api.ts';
import type { PublicProfile } from './api.ts';
import { PublicProfileScreen } from './public-profile-screen.tsx';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; profile: PublicProfile }
  | { kind: 'none' }
  | { kind: 'failed' };

/**
 * The owner looking at their own profile as the world would see it.
 *
 * Read from `/profiles/me/preview`, which runs the same serializer the public
 * page does — so a section marked private is missing here for the same reason
 * it would be missing there. Re-deciding that in the browser would be a second
 * copy of the visibility rules, and the person who finds out the two disagree
 * is the one who published something they thought was hidden.
 *
 * Fetched in the browser rather than on the server: this page needs the access
 * token, which lives in memory in this tab. The public page is the opposite —
 * rendered on the server, because it has to be readable by someone with no
 * session at all.
 */
export function ProfilePreview() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let live = true;

    void (async () => {
      try {
        const { data, response } = await api.GET('/api/v1/profiles/me/preview');
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
        <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="flex min-w-0 items-center gap-2 text-sm text-content-accent">
            <LuEye aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0">
              This is how your profile looks to buyers. Only the sections you marked public appear.
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

      {state.kind === 'ready' ? (
        <PublicProfileScreen profile={state.profile} />
      ) : (
        <main id="main-content" className="mx-auto w-full max-w-[1120px] px-4 py-10 sm:px-6">
          <p role="status" className="text-sm text-content-subtle">
            {state.kind === 'loading'
              ? 'Loading your preview…'
              : state.kind === 'none'
                ? 'There is nothing to preview yet — fill in your profile first.'
                : 'Your preview could not be loaded. Try again in a moment.'}
          </p>
        </main>
      )}
    </>
  );
}
