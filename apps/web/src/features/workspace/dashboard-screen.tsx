'use client';

import { useEffect, useState } from 'react';
import { Button } from '@hireevo/ui-web';
import { FormMessage } from '@/features/auth/form-message.tsx';
import { useSession } from '@/features/auth/session.tsx';
import { loadOrCreateProfile, type OwnProfile } from '@/features/profile-setup/api.ts';
import { CONTAINER } from './layout.ts';
import { dashboardData } from './snapshot.ts';
import { WorkspaceDashboard } from './workspace-dashboard.tsx';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; profile: OwnProfile }
  | { status: 'error'; message: string };

/**
 * The real dashboard: the signed-in user's own profile.
 *
 * Everything the page shows — the strength, the counts, the featured work — is
 * derived from the profile the API returns, not from sample content. The header
 * above it is the layout's.
 */
export function DashboardScreen() {
  const { user } = useSession();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    void loadOrCreateProfile().then((result) => {
      if (!active) return;
      setState(
        result.ok
          ? { status: 'ready', profile: result.profile }
          : { status: 'error', message: result.message },
      );
    });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  // Retrying shows the loading state again and re-runs the effect above, rather
  // than a synchronous setState inside it.
  const retry = () => {
    setState({ status: 'loading' });
    setReloadKey((key) => key + 1);
  };

  // The (workspace) layout renders nothing below it until the session is
  // authenticated, so a missing user here is a transition, not a state to draw.
  if (user === null) return null;

  if (state.status === 'loading') {
    return (
      <main id="main-content" className={`${CONTAINER} pt-10`}>
        <p role="status" className="text-sm text-content-subtle">
          Loading your workspace…
        </p>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main id="main-content" className={`${CONTAINER} flex flex-col items-start gap-4 pt-10`}>
        <FormMessage>{state.message}</FormMessage>
        <Button type="button" onClick={retry}>
          Try again
        </Button>
      </main>
    );
  }

  return <WorkspaceDashboard data={dashboardData(state.profile)} />;
}
