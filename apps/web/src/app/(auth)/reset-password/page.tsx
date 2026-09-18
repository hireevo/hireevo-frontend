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
 * The subtext points at the strength guide below, as the frame does. The
 * frame's other variant promised "previously used passwords" — a password
 * history we do not keep — so that phrasing is avoided; the rule the API does
 * enforce, that the new password differ from the current one, is reported on
 * the field if it is broken rather than claimed up front.
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
      <div className="max-w-[441px]">
        <h1 className="text-[2rem] leading-none font-bold tracking-tight text-content-accent">
          Reset password
        </h1>
        <p className="mt-3 text-lg leading-[1.5] text-content">
          {token === ''
            ? 'This reset has expired. Start again from the recovery page to get a new code.'
            : 'Enter your new password. Follow the guide below for a stronger password.'}
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
