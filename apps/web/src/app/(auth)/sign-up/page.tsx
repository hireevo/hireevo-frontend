import type { Metadata } from 'next';
import { SignUpForm } from '@/features/auth/sign-up-form.tsx';

export const metadata: Metadata = {
  title: 'Sign up',
  description: 'Create your HireEvo account.',
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-[2.5rem] leading-[1.2] font-bold tracking-tight text-content-accent">
        Sign up
      </h1>
      <SignUpForm />
    </>
  );
}
