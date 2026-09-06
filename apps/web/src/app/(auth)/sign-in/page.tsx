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
      <h1 className="text-[2.5rem] leading-[1.2] font-bold tracking-tight text-content-accent">
        Sign in
      </h1>
      <p className="mt-8 text-base text-content-subtle">
        Don&rsquo;t have an account?{' '}
        <Link href="/sign-up" className="text-content-link underline underline-offset-2">
          Create now
        </Link>
      </p>

      <SignInForm />

      {/* The design puts these two legal links in the warm accent rather than
          the brand blue, which is what `content-warning` resolves to. The
          routes themselves are not built yet, so these are plain anchors. */}
      <p className="mt-8 max-w-[505px] text-xs leading-[1.55] text-content-subtle">
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
