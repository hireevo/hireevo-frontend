import type { Metadata } from 'next';
import { RecoverForm } from '@/features/auth/recover-form.tsx';

export const metadata: Metadata = {
  title: 'Recover your account',
  description: 'Send yourself a link to get back into your HireEvo account.',
  robots: { index: false, follow: false },
};

export default function RecoverPage() {
  return (
    <>
      {/* The design file reads "Recover you Account" and labels the button
          "Countinue". Both are typos and are corrected here. */}
      <h1 className="text-[1.625rem] leading-[1.24] font-bold tracking-tight text-content-accent">
        Recover your Account
      </h1>
      <p className="mt-3 text-base text-content-subtle">
        Enter your email address to recover your account
      </p>
      <RecoverForm />
    </>
  );
}
