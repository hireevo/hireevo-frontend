import type { Metadata } from 'next';
import Link from 'next/link';
import { SignUpForm } from '@/features/auth/sign-up-form.tsx';

export const metadata: Metadata = {
  title: 'Sign up',
  description: 'Create your HireEvo account.',
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-[length:calc(26px+0.22*var(--fit))] leading-none font-bold tracking-tight text-content-accent">
        Sign up
      </h1>
      {/* Under the heading, the inverse of sign-in's "Don't have an account?". */}
      <p className="mt-[calc(2px+0.16*var(--fit))] text-lg text-content-subtle">
        Already have an account?{' '}
        <Link
          href="/sign-in"
          className="font-medium text-content-link underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>

      <SignUpForm />

      {/* The legal links sit at the foot of the column, as the design draws them.
          They also satisfy the requirement for a Terms link on this screen. */}
      <nav
        aria-label="Legal"
        className="mt-[calc(4px+0.32*var(--fit))] flex justify-center gap-8 text-sm text-content-subtle"
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
