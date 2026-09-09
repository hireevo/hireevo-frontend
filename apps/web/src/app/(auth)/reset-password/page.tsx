import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/features/auth/reset-password-form.tsx';

export const metadata: Metadata = {
  title: 'Reset password',
  robots: { index: false, follow: false },
};

/**
 * Where the recovery email lands.
 *
 * Copy follows the frame, with one word changed: the mock reads "previous used
 * passwords", which is a slip rather than a decision. A visible typo in shipped
 * text costs more than a one-word departure from the file.
 *
 * The frame does not mention that resetting signs the account out everywhere.
 * That is deliberate rather than missing — the recovery email says it before
 * the person arrives here, so repeating it under the heading would spend the
 * screen's one line of explanation on something already read.
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
          Reset password
        </h1>
        <p className="mt-3 text-lg leading-[1.5] text-content">
          {token === ''
            ? 'This link is missing its token. Request a new one from the recovery page.'
            : 'Your new password must be different from previously used passwords.'}
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
