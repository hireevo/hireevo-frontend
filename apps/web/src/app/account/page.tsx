import type { Metadata } from 'next';
import { AccountPanel } from '@/features/auth/account-panel.tsx';

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};

/**
 * Where signing in lands, until the freelancer workspace exists.
 *
 * It reads the signed-in user back from the API rather than trusting what the
 * sign-in response said, which is what makes it worth having: it proves the
 * access token is being sent and accepted on an ordinary authenticated request,
 * not just that the sign-in call returned 200.
 */
export default function AccountPage() {
  return (
    <main id="main-content" className="mx-auto w-full max-w-[530px] px-6 py-16">
      <AccountPanel />
    </main>
  );
}
