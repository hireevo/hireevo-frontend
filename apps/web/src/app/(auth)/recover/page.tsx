import type { Metadata } from 'next';
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
          shared shell provides, and the file reads "Recover you Account" with
          "Countinue" on the button. Both are typos and are corrected here. */}
      <div className="mt-[calc(24px+0.29*var(--fit))] max-w-[419px]">
        <h1 className="text-[2rem] leading-none font-bold tracking-tight text-content-accent">
          Recover your Account
        </h1>
        <p className="mt-3 text-lg leading-[1.5] text-content">
          Enter your email address to recover your account
        </p>
        <DevMailboxNote />
      </div>
      <RecoverForm />
    </>
  );
}
