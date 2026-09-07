import type { Metadata } from 'next';
import Link from 'next/link';
import { SignInForm } from '@/features/auth/sign-in-form.tsx';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your HireEvo workspace.',
  // A credential screen has nothing a search engine should hold on to.
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <>
      {/* The sign-up frame starts its heading at y=139 and this one at y=154,
          so the extra 15px is the difference between the two frames rather than
          something the shared shell should carry. */}
      <h1 className="mt-[15px] text-5xl leading-none font-bold tracking-tight text-content-accent">
        Sign in
      </h1>
      <p className="mt-[34px] text-lg text-content-subtle">
        Don&rsquo;t have an account?{' '}
        <Link
          href="/sign-up"
          className="font-medium text-content-link underline underline-offset-2"
        >
          Create now
        </Link>
      </p>

      <SignInForm />

      {/* The paragraph is the file's Secondary/blue-600 (#3871a1), which sits
          at the same ramp step as the blue already pinned there and clears AA at
          4.95:1. Its two links are drawn #f17300, which does not — 2.79:1 — so
          they keep `content-warning`, the same hue a step darker. The routes
          themselves are not built yet, so these are plain anchors. */}
      <p className="mt-[33px] max-w-[505px] text-base leading-5 tracking-[-0.154px] text-accent-soft">
        By joining, you agree to the HireEvo{' '}
        <a href="/terms" className="text-content-warning underline underline-offset-2">
          Terms of Service
        </a>{' '}
        and to occasionally receive emails from us. Please read our{' '}
        <a href="/privacy" className="text-content-warning underline underline-offset-2">
          Privacy Policy
        </a>{' '}
        to learn how we use your personal data.
      </p>
    </>
  );
}
