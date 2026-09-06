import type { Metadata } from 'next';
import { ConfirmEmailForm } from '@/features/auth/confirm-email-form.tsx';

export const metadata: Metadata = {
  title: 'Confirm your email',
  description: 'Enter the six-digit code we sent you.',
  robots: { index: false, follow: false },
};

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // The address is echoed back so the user can tell a typo from a slow inbox.
  // It comes from the query string rather than from state, so a refresh — or
  // opening the link on the phone the mail arrived on — still shows it.
  const email = (await searchParams).email;
  const address = typeof email === 'string' && email !== '' ? email : 'your email address';

  return (
    <>
      <h1 className="text-[1.625rem] leading-[1.24] font-bold tracking-tight text-content-accent">
        Confirm your email
      </h1>
      <p className="mt-5 text-base leading-[1.7] text-content">
        Enter the verification code we sent — 6 digits — to {address}. Please enter it below
      </p>
      <ConfirmEmailForm />
    </>
  );
}
