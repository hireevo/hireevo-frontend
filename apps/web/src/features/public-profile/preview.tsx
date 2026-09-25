'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LuArrowLeft, LuEye } from 'react-icons/lu';
import { cn } from '@hireevo/ui-web';
import { CONTAINER } from '@/features/workspace/layout.ts';
import { api } from '@/lib/api.ts';
import type { PublicProfile } from './api.ts';
import { PublicProfileScreen } from './public-profile-screen.tsx';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; profile: PublicProfile }
  | { kind: 'none' }
  | { kind: 'failed' };

/**
 * The owner looking at their profile as a buyer will see it.
 *
 * `/profiles/me/preview` answers with the public shape, built by the same
 * serializer the published page uses, over the same row — so only the sections
 * marked public are here, and this page cannot show something that page would
 * not. It used to read `/profiles/me` and mark the private sections instead,
 * which meant the visibility rules were written twice: once in the API and once
 * in the browser, free to disagree, with the person who finds out being the one
 * who published something they thought was hidden.
 *
 * What is missing from this page is what a buyer will not see, and the notice
 * above says so — the editor is where to check that the work itself is there.
 *
 * Fetched in the browser rather than on the server: this page needs the access
 * token, which lives in memory in this tab. The public page at `/p/{slug}` is
 * the opposite — rendered on the server, because it has to be readable by
 * someone with no session at all.
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
        <div className={cn(CONTAINER, 'flex flex-wrap items-center justify-between gap-3 py-3')}>
          <p className="flex min-w-0 items-center gap-2 text-sm text-content-accent">
            <LuEye aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0">
              This is your profile exactly as a buyer sees it. Sections you have not made public are
              not here.
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

      {/* No `main` of its own around the profile: `PublicProfileScreen` brings
          one, and this page shows that component precisely so that what is
          here is what a buyer gets. Two nested `main` landmarks is one of the
          things axe refuses, and rightly — a page has one. The states that are
          not the profile need one, so they carry it themselves. */}
      {state.kind === 'ready' ? (
        <PublicProfileScreen profile={state.profile} />
      ) : (
        <main id="main-content" className={cn(CONTAINER, 'pt-8 pb-24')}>
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
