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
      {/* This frame centres a 441px block in the column and left-aligns the
          copy inside it, rather than running the text to the column's edges. */}
      <div className="mx-auto w-full max-w-[441px]">
        <div className="max-w-[369px]">
          <h1 className="text-[2rem] leading-none font-bold tracking-tight text-content-accent">
            Confirm your email
          </h1>
          <p className="mt-[19px] text-lg leading-[1.5] text-content">
            Enter the verification code we sent — 6 digits — to {address}. Please enter it below
          </p>
        </div>
      </div>
      <ConfirmEmailForm />
    </>
  );
}
