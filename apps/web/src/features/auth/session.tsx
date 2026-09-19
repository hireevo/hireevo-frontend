'use client';

import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthenticatedUser } from '@hireevo/api-client';
import { getAccessToken, setAccessToken } from '@/lib/access-token.ts';
import { api } from '@/lib/api.ts';
import { onSessionEnded, refreshSession } from '@/lib/session-refresh.ts';

export type SessionStatus = 'restoring' | 'authenticated' | 'anonymous';

export type Session = {
  status: SessionStatus;
  user: AuthenticatedUser | null;
  /** Stores the tokens a sign-in or a reset just handed back. */
  adopt: (accessToken: string, user: AuthenticatedUser) => void;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

/**
 * Who is signed in, for the lifetime of this tab.
 *
 * The access token lives in memory and dies with the tab. What survives is the
 * refresh cookie, which the browser holds and JavaScript cannot read, so the
 * first thing this does on mount is spend it: one call to `/auth/refresh`
 * either returns a fresh token and the user, or fails and the visitor is
 * anonymous. That single call is the whole of "stay signed in".
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>('restoring');

  const adopt = useCallback((accessToken: string, nextUser: AuthenticatedUser) => {
    setAccessToken(accessToken);
    setUser(nextUser);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    // Told to the server first: clearing only the client would leave the
    // session and its refresh family alive on the API.
    if (getAccessToken() !== null) {
      await api.POST('/api/v1/auth/logout', {}).catch(() => undefined);
    }
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    let cancelled = false;

    // One shared refresh, so StrictMode's double mount and any concurrent 401
    // do not each spend the single-use token and revoke the family.
    void refreshSession().then((result) => {
      if (cancelled) return;
      if (result !== null) {
        adopt(result.accessToken, result.user);
      } else {
        setStatus('anonymous');
      }
    });

    // When a later 401-retry finds the session has genuinely ended, the API
    // client calls this so the UI turns anonymous instead of appearing signed in.
    const stopListening = onSessionEnded(() => {
      if (cancelled) return;
      setAccessToken(null);
      setUser(null);
      setStatus('anonymous');
    });

    return () => {
      cancelled = true;
      stopListening();
    };
  }, [adopt]);

  const value = useMemo<Session>(
    () => ({ status, user, adopt, signOut }),
    [status, user, adopt, signOut],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): Session {
  const session = use(SessionContext);
  if (session === null) {
    throw new Error('useSession must be used inside a SessionProvider.');
  }
  return session;
}
