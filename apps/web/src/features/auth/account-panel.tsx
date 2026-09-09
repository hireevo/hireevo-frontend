'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthenticatedUser } from '@hireevo/api-client';
import { Button } from '@hireevo/ui-web';
import { api } from '@/lib/api.ts';
import { useSession } from './session.tsx';

export function AccountPanel() {
  const router = useRouter();
  const { status, user, signOut } = useSession();
  const [fetched, setFetched] = useState<AuthenticatedUser | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/sign-in');
      return;
    }
    if (status !== 'authenticated') return;

    let cancelled = false;
    void (async () => {
      const { data } = await api.GET('/api/v1/auth/me', {});
      if (!cancelled && data !== undefined) setFetched(data);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, status]);

  if (status === 'restoring') {
    return (
      <p role="status" className="text-content-muted">
        Checking your session…
      </p>
    );
  }

  const shown = fetched ?? user;
  if (shown === null) return null;

  const name = [shown.firstName, shown.lastName].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[2rem] leading-none font-bold tracking-tight text-content-accent">
        {name === '' ? 'Your account' : `Hello, ${name}`}
      </h1>

      <dl className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 text-base">
        {[
          ['Email', shown.email],
          ['Username', shown.username ?? '—'],
          ['Email confirmed', shown.emailVerified ? 'Yes' : 'No'],
          ['Roles', shown.roles.join(', ') || '—'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-content-muted">{label}</dt>
            <dd className="text-content">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Read back from `/auth/me` rather than from the sign-in response, so
          this line only appears if the access token was actually accepted. */}
      <p className="text-sm text-content-subtle">
        {fetched === null ? 'Loading your profile…' : 'Loaded from the API with your access token.'}
      </p>

      <Button
        variant="secondary"
        size="lg"
        loading={signingOut}
        onClick={() => {
          setSigningOut(true);
          void signOut().then(() => router.replace('/sign-in'));
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
