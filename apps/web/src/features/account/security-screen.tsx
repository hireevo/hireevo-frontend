'use client';

import { useEffect, useState } from 'react';
import { LuLaptop, LuSmartphone } from 'react-icons/lu';
import { Button, Card, PasswordField } from '@hireevo/ui-web';
import { FormMessage } from '@/features/auth/form-message.tsx';
import { PasswordRules } from '@/features/auth/password-rules.tsx';
import { PASSWORD_RULES } from '@/features/auth/schemas.ts';
import {
  changePassword,
  listSessions,
  revokeOtherSessions,
  revokeSession,
  type AccountSession,
} from './api.ts';

/** "Chrome on macOS", from what the session recorded, and never an empty line. */
function describe(session: AccountSession): string {
  const parts = [session.deviceModel, session.devicePlatform].filter(
    (part): part is string => part !== null && part.trim() !== '',
  );
  if (parts.length > 0) return parts.join(' · ');
  const agent = session.userAgent?.trim();
  return agent === undefined || agent === '' ? 'Unknown device' : agent.slice(0, 80);
}

const when = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });
};

/**
 * Account security: the password, and every device the account is open on.
 *
 * Both halves are real: the password change is the API's own, and the sessions
 * are the rows it holds. Nothing here is drawn for the sake of the design —
 * what a control does is what the API does with it (§6.7).
 */
export function SecurityScreen() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PasswordCard />
      <SessionsCard />
    </div>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const strong = PASSWORD_RULES.every((rule) => rule.test(next));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setDone(false);

    // Checked here so the person is told before a round trip, and by the API
    // for the same reason it checks everything else: this cannot be the only
    // place that knows.
    if (current.trim() === '') {
      setErrors({ current: 'Enter your current password.' });
      return;
    }
    if (!strong) {
      setErrors({ next: 'Use 8+ characters, mixed case, a number and a symbol.' });
      return;
    }
    if (current === next) {
      setErrors({ next: 'Choose a password you are not already using.' });
      return;
    }

    setErrors({});
    setSaving(true);
    const result = await changePassword(current, next);
    setSaving(false);

    if (result.ok) {
      setCurrent('');
      setNext('');
      setDone(true);
      return;
    }
    if (result.field === 'currentPassword') setErrors({ current: result.message });
    else if (result.field === 'newPassword') setErrors({ next: result.message });
    else setMessage(result.message);
  }

  return (
    <Card aria-labelledby="password-heading" className="flex min-w-0 flex-col">
      <h2 id="password-heading" className="text-lg font-bold text-content-accent">
        Password
      </h2>
      <p className="mt-1 text-sm text-content-subtle">
        Changing your password signs out every other device.
      </p>

      <form
        onSubmit={(event) => void submit(event)}
        className="mt-5 flex max-w-[420px] flex-col gap-4"
      >
        <PasswordField
          label="Current password"
          value={current}
          autoComplete="current-password"
          onChange={(event) => setCurrent(event.target.value)}
          {...(errors.current === undefined ? {} : { error: errors.current })}
        />

        <div>
          <PasswordField
            label="New password"
            value={next}
            autoComplete="new-password"
            onChange={(event) => setNext(event.target.value)}
            {...(errors.next === undefined ? {} : { error: errors.next })}
          />
          <PasswordRules value={next} />
        </div>

        {message === null ? null : <FormMessage>{message}</FormMessage>}
        {!done ? null : (
          <p role="status" className="text-sm text-content-accent">
            Your password has been changed. Other devices have been signed out.
          </p>
        )}

        <Button type="submit" loading={saving} loadingLabel="Saving" className="w-fit">
          Change password
        </Button>
      </form>
    </Card>
  );
}

function SessionsCard() {
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'ready'; sessions: AccountSession[] }
    | { kind: 'failed'; message: string }
  >({ kind: 'loading' });
  const [busy, setBusy] = useState<string | null>(null);

  /**
   * Reads the list and puts it on the page.
   *
   * Declared outside the effect and awaited inside it: the state is set once
   * the request settles, never in the effect's own body, which is what stops a
   * render from cascading into another.
   */
  async function load() {
    const result = await listSessions();
    setState(
      result.ok
        ? { kind: 'ready', sessions: result.sessions }
        : { kind: 'failed', message: result.message },
    );
  }

  useEffect(() => {
    let live = true;
    void (async () => {
      const result = await listSessions();
      if (!live) return;
      setState(
        result.ok
          ? { kind: 'ready', sessions: result.sessions }
          : { kind: 'failed', message: result.message },
      );
    })();
    return () => {
      live = false;
    };
  }, []);

  async function end(id: string) {
    setBusy(id);
    const result = await revokeSession(id);
    setBusy(null);
    if (result.ok) await load();
    else setState({ kind: 'failed', message: result.message });
  }

  async function endOthers() {
    setBusy('others');
    const result = await revokeOtherSessions();
    setBusy(null);
    if (result.ok) await load();
    else setState({ kind: 'failed', message: result.message });
  }

  const others = state.kind === 'ready' ? state.sessions.filter((session) => !session.current) : [];

  return (
    <Card aria-labelledby="sessions-heading" className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="sessions-heading" className="text-lg font-bold text-content-accent">
            Where you are signed in
          </h2>
          <p className="mt-1 text-sm text-content-subtle">
            Every device holding a session for this account. Ending one signs that device out.
          </p>
        </div>

        {others.length === 0 ? null : (
          <Button
            type="button"
            variant="secondary"
            loading={busy === 'others'}
            loadingLabel="Signing out"
            onClick={() => void endOthers()}
            className="shrink-0"
          >
            Sign out everywhere else
          </Button>
        )}
      </div>

      <div className="mt-5 min-w-0">
        {state.kind === 'loading' ? (
          <p role="status" className="text-sm text-content-subtle">
            Loading your sessions…
          </p>
        ) : state.kind === 'failed' ? (
          <FormMessage>{state.message}</FormMessage>
        ) : (
          <ul className="flex flex-col gap-3">
            {state.sessions.map((session) => (
              <li
                key={session.id}
                className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-border-subtle px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-content-subtle">
                    {session.devicePlatform === 'ios' || session.devicePlatform === 'android' ? (
                      <LuSmartphone aria-hidden="true" className="size-4" />
                    ) : (
                      <LuLaptop aria-hidden="true" className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-content">
                      {describe(session)}
                      {session.current ? (
                        <span className="ml-2 rounded-full bg-surface-accent-subtle px-2 py-0.5 text-xs font-medium text-content-accent">
                          This device
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-content-subtle">
                      Signed in {when(session.issuedAt)}
                    </p>
                  </div>
                </div>

                {session.current ? null : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={busy === session.id}
                    loadingLabel="Ending"
                    onClick={() => void end(session.id)}
                    className="shrink-0"
                  >
                    Sign out
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
