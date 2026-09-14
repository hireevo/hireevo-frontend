'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/features/auth/session.tsx';
import { workspaceSnapshot } from './snapshot.ts';
import { WorkspaceDashboard } from './workspace-dashboard.tsx';

/** The real dashboard: the signed-in user's snapshot, and a working sign-out. */
export function DashboardScreen() {
  const router = useRouter();
  const { user, signOut } = useSession();

  // The (workspace) layout renders nothing below it until the session is
  // authenticated, so a missing user here is a transition, not a state to draw.
  if (user === null) return null;

  return (
    <WorkspaceDashboard
      snapshot={workspaceSnapshot(user)}
      onSignOut={() => void signOut().then(() => router.replace('/sign-in'))}
    />
  );
}
