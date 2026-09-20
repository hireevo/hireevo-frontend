import type { Metadata } from 'next';
import Link from 'next/link';
import { DevMailboxNote } from '@/features/auth/dev-mailbox-note.tsx';
import { RecoverForm } from '@/features/auth/recover-form.tsx';

export const metadata: Metadata = {
  title: 'Recover your account',
  description: 'Get a code to reset your HireEvo password.',
  robots: { index: false, follow: false },
};

export default function RecoverPage() {
  return (
    <>
      {/* This frame starts its content at y=192 rather than the y=139 the
          shared shell provides. The file's heading reads "Recover you Account",
          a typo corrected to "your" here. */}
      <div className="mt-[calc(24px+0.29*var(--fit))] max-w-[419px]">
        <h1 className="text-[2rem] leading-none font-bold tracking-tight text-content-accent">
          Recover your Account
        </h1>
        <p className="mt-3 text-lg leading-[1.5] text-content">
          Enter your email address to recover your account
        </p>
        <DevMailboxNote carries="link" />
      </div>
      <RecoverForm />

      {/* The design closes this column with the legal links at the foot of the
          frame, so they are pushed to the bottom rather than left under the
          short form. They also satisfy the requirement for a Terms link here. */}
      <nav
        aria-label="Legal"
        className="mt-auto flex justify-center gap-8 pt-[calc(24px+0.2*var(--fit))] text-sm text-content-subtle"
      >
        <Link
          href="/privacy"
          className="underline-offset-2 hover:text-content-link hover:underline"
        >
          Privacy Policy
        </Link>
        <Link href="/terms" className="underline-offset-2 hover:text-content-link hover:underline">
          Terms &amp; Conditions
        </Link>
      </nav>
    </>
  );
}
