'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from './session.tsx';

/**
 * Sends someone who is already signed in past the sign-in form.
 *
 * Sign-in is where the app opens, so a returning visitor whose refresh cookie
 * is still good would otherwise be shown a form for something they have already
 * done. The session is restored in the browser — the cookie belongs to the API's
 * origin, and this app's server never sees it — so this can only act once that
 * restore has answered. Until then the form shows, and for anyone who is not
 * signed in it simply stays.
 */
export function RedirectIfSignedIn() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/client-profile');
  }, [router, status]);

  return null;
}
