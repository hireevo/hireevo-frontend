import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/features/auth/reset-password-form.tsx';

export const metadata: Metadata = {
  title: 'Set a new password',
  robots: { index: false, follow: false },
};

/**
 * Where the recovery email lands.
 *
 * The design file has no frame for this screen, but the flow it does draw sends
 * a link that has to arrive somewhere, so this borrows the shell and the type
 * scale from the frames beside it.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).token;
  const token = typeof raw === 'string' ? raw : '';

  return (
    <>
      <div className="mt-[53px] max-w-[419px]">
        <h1 className="text-[2rem] leading-none font-bold tracking-tight text-content-accent">
          Set a new password
        </h1>
        <p className="mt-3 text-lg leading-[1.5] text-content">
          {token === ''
            ? 'This link is missing its token. Request a new one from the recovery page.'
            : 'Choose a password you have not used here before. Setting it signs you out everywhere else.'}
        </p>
      </div>

      {token === '' ? (
        <Link
          href="/recover"
          className="mt-8 inline-flex h-13 items-center rounded-2xl bg-accent px-6 text-base font-semibold text-content-on-accent hover:bg-accent-hover"
        >
          Back to recovery
        </Link>
      ) : (
        <ResetPasswordForm token={token} />
      )}
    </>
  );
}
