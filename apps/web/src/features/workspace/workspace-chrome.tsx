'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/features/auth/session.tsx';
import {
  useAvailability,
  type AvailabilityControl,
} from '@/features/profile-setup/use-availability.ts';
import { chromeSnapshot } from './snapshot.ts';
import { StatusBar } from './status-bar.tsx';
import type { NavItem, SellerStatus } from './types.ts';
import { WorkspaceHeader } from './workspace-header.tsx';

/**
 * The bar across the top of every signed-in page: navigation, and the seller
 * strip under it.
 *
 * A component rather than part of the dashboard, because the design draws it
 * above the client profile too. Who renders it is the page's business: the
 * `(workspace)` layout puts it on every page in the group, and the design
 * preview — which cannot sign in — renders it beside the fixture it is
 * previewing.
 */
export function WorkspaceChrome({
  nav,
  utilities,
  user,
  seller,
  onSignOut,
  availability,
}: {
  nav: NavItem[];
  utilities: boolean;
  user: { name: string; initials: string };
  seller: SellerStatus | null;
  onSignOut: (() => void) | null;
  /** The profile's own availability. Absent on the design preview, which has no profile. */
  availability?: AvailabilityControl;
}) {
  return (
    <>
      <WorkspaceHeader nav={nav} utilities={utilities} user={user} onSignOut={onSignOut} />
      {seller === null ? null : (
        <StatusBar seller={seller} {...(availability === undefined ? {} : { availability })} />
      )}
    </>
  );
}

/**
 * The same chrome, for the signed-in person whose page this is.
 *
 * Rendered by the `(workspace)` layout, so a new page in the group has the
 * header without remembering to ask for it (§6.6).
 */
export function SessionChrome() {
  const router = useRouter();
  const { user, signOut } = useSession();
  const availability = useAvailability();

  // The layout renders nothing below the guard until the session is
  // authenticated, so a missing user here is a transition, not a state to draw.
  if (user === null) return null;

  const snapshot = chromeSnapshot(user);

  return (
    <WorkspaceChrome
      nav={snapshot.nav}
      utilities={snapshot.utilities}
      user={snapshot.user}
      // The strip's real parts, and only those: whether the profile is live and
      // the availability the switch saves. There is no membership module yet, so
      // no tier and no upgrade are shown — an empty tier is nothing invented.
      seller={{
        tier: '',
        upgrade: null,
        profileLive: availability.published,
        available: availability.on,
      }}
      availability={availability}
      onSignOut={() => void signOut().then(() => router.replace('/sign-in'))}
    />
  );
}
