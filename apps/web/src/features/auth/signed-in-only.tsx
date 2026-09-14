'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSession } from './session.tsx';

/**
 * Renders its children only for a signed-in visitor, and sends everyone else
 * to sign-in.
 *
 * Used by the `(workspace)` route group's layout, so every page in the group is
 * protected by being in it rather than by remembering to check (§6.6). The
 * session is restored in the browser — the refresh cookie belongs to the API's
 * origin — so while that restore is answering there is nothing to decide yet,
 * and a status line holds the page instead of a flash of someone's workspace.
 */
export function SignedInOnly({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'anonymous') router.replace('/sign-in');
  }, [router, status]);

  if (status !== 'authenticated') {
    return (
      <main
        id="main-content"
        className="flex min-h-dvh items-center justify-center bg-surface-subtle px-6"
      >
        <p role="status" className="text-sm text-content-subtle">
          {status === 'restoring' ? 'Loading your workspace…' : 'Taking you to sign in…'}
        </p>
      </main>
    );
  }

  return children;
}
