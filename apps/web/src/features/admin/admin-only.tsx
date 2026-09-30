'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { CONSOLE_PERMISSION } from '@/features/auth/landing.ts';
import { useSession } from '@/features/auth/session.tsx';

/**
 * Renders the console only for an account that may use it.
 *
 * On the permission rather than on the role name: the API grants
 * `admin.user.read` to more than one role and may grant it to another tomorrow,
 * and a screen that checks for the word "admin" would then hide itself from
 * somebody the API happily answers.
 *
 * This is a courtesy, not the protection. Every one of these endpoints checks
 * the same permission for itself, so an account that got past this would be
 * answered 403 by the API on the first request. What it is for is the person:
 * being shown a console whose every row says "you do not have access" is worse
 * than being sent back to where their own work is.
 */
export function AdminOnly({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, user } = useSession();
  const allowed = user?.permissions.includes(CONSOLE_PERMISSION) === true;

  useEffect(() => {
    if (status === 'anonymous') router.replace('/sign-in');
    else if (status === 'authenticated' && !allowed) router.replace('/dashboard');
  }, [allowed, router, status]);

  if (status !== 'authenticated' || !allowed) {
    return (
      <main
        id="main-content"
        className="flex min-h-dvh items-center justify-center bg-surface-subtle px-6"
      >
        <p role="status" className="text-sm text-content-subtle">
          {status === 'restoring' ? 'Loading the console…' : 'Taking you back…'}
        </p>
      </main>
    );
  }

  return children;
}
