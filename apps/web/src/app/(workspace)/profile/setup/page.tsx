import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProfileSetupScreen } from '@/features/profile-setup/profile-setup-screen.tsx';

export const metadata: Metadata = {
  title: 'Profile setup',
  robots: { index: false, follow: false },
};

/**
 * The step is read from the query string, which needs a Suspense boundary to
 * render statically. The fallback is empty: the (workspace) layout has already
 * shown its own status line while the session was restored.
 */
export default function ProfileSetupPage() {
  return (
    <Suspense fallback={null}>
      <ProfileSetupScreen />
    </Suspense>
  );
}
