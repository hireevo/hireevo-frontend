'use client';

import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthenticatedUser } from '@hireevo/api-client';
import { getAccessToken, setAccessToken } from '@/lib/access-token.ts';
import { api } from '@/lib/api.ts';

export type SessionStatus = 'restoring' | 'authenticated' | 'anonymous';

export type Session = {
  status: SessionStatus;
  user: AuthenticatedUser | null;
  /** Stores the tokens a sign-in or a reset just handed back. */
  adopt: (accessToken: string, user: AuthenticatedUser) => void;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

type RestoredSession = { accessToken: string; user: AuthenticatedUser } | null;

/**
 * The one refresh a page load is allowed to make, shared by everyone who asks.
 *
 * React Strict Mode mounts, unmounts and remounts in development, firing the
 * restore effect twice; the same thing happens for real when two components
 * mount together. Two refreshes of one cookie is a replay to the API, and
 * revoking the family over it is how a plain page refresh signed the user out.
 * Holding the in-flight promise at module scope means the second caller waits on
 * the first request rather than sending its own, so exactly one refresh leaves
 * the tab. It is cleared once settled, so a later navigation can restore again.
 */
let restoreInFlight: Promise<RestoredSession> | null = null;

function restoreSession(): Promise<RestoredSession> {
  if (restoreInFlight !== null) return restoreInFlight;

  restoreInFlight = (async (): Promise<RestoredSession> => {
    try {
      const { data } = await api.POST('/api/v1/auth/refresh', { body: {} });
      if (data?.accessToken !== undefined && data.user !== undefined) {
        return { accessToken: data.accessToken, user: data.user };
      }
    } catch {
      // The API was unreachable. That is not a signed-in state, but it is not a
      // reason to crash either — the visitor is treated as anonymous.
    }
    return null;
  })();

  void restoreInFlight.finally(() => {
    restoreInFlight = null;
  });

  return restoreInFlight;
}

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
    let active = true;

    void restoreSession().then((restored) => {
      if (!active) return;
      if (restored !== null) adopt(restored.accessToken, restored.user);
      else setStatus('anonymous');
    });

    return () => {
      active = false;
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
