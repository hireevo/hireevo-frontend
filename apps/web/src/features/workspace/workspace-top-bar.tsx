'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/features/auth/session.tsx';
import { workspaceSnapshot } from './snapshot.ts';
import { WorkspaceHeader } from './workspace-header.tsx';

/**
 * The workspace header on a page that is not the dashboard.
 *
 * Signing in lands on the client profile, so the navigation, the account menu
 * and sign-out have to be there too — a landing page with no way out of it is
 * not a landing page. Which item is current comes from the address rather than
 * from the snapshot, which marks the dashboard.
 */
export function WorkspaceTopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useSession();

  // The (workspace) layout renders nothing below it until the session is
  // authenticated, so a missing user here is a transition, not a state to draw.
  if (user === null) return null;

  const snapshot = workspaceSnapshot(user);
  const nav = snapshot.nav.map((item) =>
    item.kind === 'link' ? { ...item, current: item.href === pathname } : item,
  );

  return (
    <WorkspaceHeader
      nav={nav}
      utilities={snapshot.utilities}
      user={snapshot.user}
      onSignOut={() => void signOut().then(() => router.replace('/sign-in'))}
    />
  );
}
