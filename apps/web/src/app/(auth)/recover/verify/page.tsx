import type { Metadata } from 'next';
import { ConfirmCodeScreen } from '@/features/auth/confirm-code-screen.tsx';

export const metadata: Metadata = {
  title: 'Confirm your email',
  description: 'Enter the six-digit code we sent to reset your password.',
  robots: { index: false, follow: false },
};

/**
 * The second screen of recovery. The design reuses the sign-up confirmation
 * frame here unchanged, so this route renders the same screen and spends the
 * code on a password reset instead.
 */
export default async function RecoverVerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const email = (await searchParams).email;
  const address = typeof email === 'string' && email !== '' ? email : '';

  return <ConfirmCodeScreen address={address} purpose="recovery" />;
}
