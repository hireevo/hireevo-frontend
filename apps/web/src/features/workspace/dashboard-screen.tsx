'use client';

import { useSession } from '@/features/auth/session.tsx';
import { workspaceSnapshot } from './snapshot.ts';
import { WorkspaceDashboard } from './workspace-dashboard.tsx';

/** The real dashboard: the signed-in user's snapshot. The header above it is the layout's. */
export function DashboardScreen() {
  const { user } = useSession();

  // The (workspace) layout renders nothing below it until the session is
  // authenticated, so a missing user here is a transition, not a state to draw.
  if (user === null) return null;

  return <WorkspaceDashboard snapshot={workspaceSnapshot(user)} />;
}
