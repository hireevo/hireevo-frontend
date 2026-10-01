'use client';

import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthenticatedUser } from '@hireevo/api-client';
import { setAccessToken } from '@/lib/access-token.ts';
import { api } from '@/lib/api.ts';
import { onSessionEnded, refreshSession } from '@/lib/session-refresh.ts';

export type SessionStatus = 'restoring' | 'authenticated' | 'anonymous';

export type Session = {
  status: SessionStatus;
  user: AuthenticatedUser | null;
  /** Stores the tokens a sign-in or a reset just handed back. */
  adopt: (accessToken: string, user: AuthenticatedUser) => void;
  /**
   * Ends the session on the server and then in this tab.
   *
   * Answers whether the server was actually told. It is the server's answer
   * that matters: what keeps somebody signed in is the refresh cookie, which
   * this code cannot read and cannot delete.
   */
  signOut: () => Promise<boolean>;
  /** True when the last attempt could not reach the server, so a control can say so. */
  signOutFailed: boolean;
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
  const [signOutFailed, setSignOutFailed] = useState(false);

  const adopt = useCallback((accessToken: string, nextUser: AuthenticatedUser) => {
    setAccessToken(accessToken);
    setUser(nextUser);
    setStatus('authenticated');
  }, []);

  /**
   * One attempt at telling the server. True when the session is gone.
   *
   * A 401 counts: it means the session this was asking to end is already ended,
   * which is the state being asked for.
   */
  const tellServer = useCallback(async (): Promise<boolean> => {
    try {
      const { response } = await api.POST('/api/v1/auth/logout', {});
      return response.ok || response.status === 401;
    } catch {
      return false;
    }
  }, []);

  const signOut = useCallback(async (): Promise<boolean> => {
    setSignOutFailed(false);

    // Asked whether or not a token is in memory. What keeps a session alive is
    // the refresh cookie, which the browser holds and this code cannot see, and
    // the endpoint reads it for itself — so skipping the call because the token
    // happened to be missing left the session running on the server.
    //
    // Twice before giving up: a single dropped request is the common case, and
    // the cost of one retry is far below the cost of the alternative below.
    const told = (await tellServer()) || (await tellServer());

    if (!told) {
      // Deliberately not signed out here either. Clearing only this tab would
      // say "you are signed out" while the refresh cookie — and the session
      // behind it — stayed alive for thirty days: the next page load signs the
      // person straight back in, which is what this looked like, and on a
      // shared computer it is worse than an error message.
      setSignOutFailed(true);
      return false;
    }

    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
    return true;
  }, [tellServer]);

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
    () => ({ status, user, adopt, signOut, signOutFailed }),
    [status, user, adopt, signOut, signOutFailed],
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
