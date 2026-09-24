'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { SettingsDialog } from './settings-dialog.tsx';
import { NotYet, RowAction, SettingRow, UsernameHelpCard } from './settings-rows.tsx';

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

/** "01", as the design counts devices. */
const padded = (count: number) => (count < 10 ? `0${count}` : String(count));

/** Which row has its box open, if any. */
type OpenRow = 'password' | 'devices' | null;

/**
 * Account security, as the design lays it out: the account's protections in
 * rows that each offer an Edit, and the note about usernames beside them.
 *
 * Two of the five rows are real. The password is changed through the API's own
 * endpoint, and the connected devices are the sessions it holds, endable one at
 * a time or all at once. Phone verification, the security question and
 * two-factor authentication have no endpoint behind them, so their Edit says so
 * rather than opening a form that could not save (§6.7) — and their value says
 * what is actually true of the account rather than what the frame drew, because
 * a security screen that claims a phone is verified when nothing verified one
 * is worse than one that admits the feature is not built.
 */
export function SecurityScreen() {
  const [open, setOpen] = useState<OpenRow>(null);
  const [sessions, setSessions] = useState<AccountSession[] | null>(null);

  const close = useCallback(() => setOpen(null), []);

  /**
   * Reads the sessions the account has open.
   *
   * Declared here rather than in the dialog because the row above it shows the
   * count, so both need the same answer — and the state is set once the request
   * settles, never in an effect's own body, which is what stops a render from
   * cascading into another.
   */
  const load = useCallback(async () => {
    const result = await listSessions();
    if (result.ok) setSessions(result.sessions);
    return result;
  }, []);

  useEffect(() => {
    let live = true;
    void (async () => {
      const result = await listSessions();
      if (live && result.ok) setSessions(result.sessions);
    })();
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <Card aria-labelledby="security-heading" className="flex min-w-0 flex-col p-6 sm:p-7">
        <h2 id="security-heading" className="sr-only">
          How this account is protected
        </h2>

        <SettingRow
          label="Password"
          action={<RowAction label="Edit" onClick={() => setOpen('password')} />}
        />

        <SettingRow
          label="Phone verification"
          value="Not set up yet"
          action={<NotYet label="Edit" reason="Verifying a phone number is not available yet." />}
        />

        <SettingRow
          label="Security question"
          value="Not set"
          action={
            <NotYet label="Edit" reason="Setting a security question is not available yet." />
          }
        />

        <SettingRow
          label="Two-factor authentication"
          value="Not set up yet"
          action={<NotYet label="Edit" reason="Two-factor authentication is not available yet." />}
        />

        <SettingRow
          label="Connected devices"
          value={sessions === null ? '—' : padded(sessions.length)}
          action={<RowAction label="Edit" onClick={() => setOpen('devices')} />}
        />
      </Card>

      <UsernameHelpCard />

      {open === 'password' ? <PasswordDialog onClose={close} /> : null}
      {open === 'devices' ? (
        <DevicesDialog sessions={sessions} reload={load} onClose={close} />
      ) : null}
    </div>
  );
}

/** The box the Password row opens: the current one, the new one, and the rules. */
function PasswordDialog({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const strong = PASSWORD_RULES.every((rule) => rule.test(next));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

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
    // The confirmation is the whole reason the field exists: a password typed
    // once and mistyped locks the person out of the account they just secured,
    // and nothing after this point could tell them which character went wrong.
    if (confirm !== next) {
      setErrors({ confirm: 'Both passwords must match.' });
      return;
    }

    setErrors({});
    setSaving(true);
    const result = await changePassword(current, next);
    setSaving(false);

    if (result.ok) {
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone(true);
      return;
    }
    if (result.field === 'currentPassword') setErrors({ current: result.message });
    else if (result.field === 'newPassword') setErrors({ next: result.message });
    else setMessage(result.message);
  }

  if (done) {
    return (
      <SettingsDialog title="Password changed" onClose={onClose}>
        <p role="status" className="text-sm text-content-muted">
          Your password has been changed, and every other device has been signed out. This one stays
          signed in.
        </p>
        <Button type="button" onClick={onClose} className="mt-5 w-fit">
          Done
        </Button>
      </SettingsDialog>
    );
  }

  return (
    <SettingsDialog
      title="Change password"
      description="Changing your password signs out every other device."
      onClose={onClose}
    >
      {/* The three fields, the rules under the new one and a full-width button,
          in the order and the wording the design sets out — the same shape the
          reset-password screen already wears, because they are the same act. */}
      <form onSubmit={(event) => void submit(event)} className="flex min-w-0 flex-col gap-5">
        <PasswordField
          label="Current Password"
          value={current}
          autoComplete="current-password"
          placeholder="••••••••"
          onChange={(event) => setCurrent(event.target.value)}
          {...(errors.current === undefined ? {} : { error: errors.current })}
        />

        <div>
          <PasswordField
            label="New Password"
            value={next}
            autoComplete="new-password"
            placeholder="••••••••"
            onChange={(event) => setNext(event.target.value)}
            {...(errors.next === undefined ? {} : { error: errors.next })}
          />
          <PasswordRules value={next} />
        </div>

        <PasswordField
          label="Confirm New Password"
          value={confirm}
          autoComplete="new-password"
          placeholder="••••••••"
          onChange={(event) => setConfirm(event.target.value)}
          {...(errors.confirm === undefined ? {} : { error: errors.confirm })}
        />

        {message === null ? null : <FormMessage>{message}</FormMessage>}

        {/* No Cancel beside it: the box already closes from its own ×, from
            Escape and from the backdrop, and a second way out competing with
            the action is how the wrong one gets pressed. */}
        <Button type="submit" size="xl" fullWidth loading={saving} loadingLabel="Saving">
          Update password
        </Button>
      </form>
    </SettingsDialog>
  );
}

/** The box the Connected devices row opens: every session, and the way to end one. */
function DevicesDialog({
  sessions,
  reload,
  onClose,
}: {
  sessions: AccountSession[] | null;
  reload: () => Promise<{ ok: boolean; message?: string }>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function end(id: string) {
    setBusy(id);
    setMessage(null);
    const result = await revokeSession(id);
    if (result.ok) await reload();
    else setMessage(result.message);
    setBusy(null);
  }

  async function endOthers() {
    setBusy('others');
    setMessage(null);
    const result = await revokeOtherSessions();
    if (result.ok) await reload();
    else setMessage(result.message);
    setBusy(null);
  }

  const others = sessions === null ? [] : sessions.filter((session) => !session.current);

  return (
    <SettingsDialog
      title="Connected devices"
      description="Every device holding a session for this account. Ending one signs that device out."
      onClose={onClose}
    >
      {sessions === null ? (
        <p role="status" className="text-sm text-content-subtle">
          Loading your devices…
        </p>
      ) : (
        <ul className="flex min-w-0 flex-col gap-3">
          {sessions.map((session) => (
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

      {message === null ? null : (
        <div className="mt-4">
          <FormMessage>{message}</FormMessage>
        </div>
      )}

      {others.length === 0 ? null : (
        <Button
          type="button"
          variant="secondary"
          loading={busy === 'others'}
          loadingLabel="Signing out"
          onClick={() => void endOthers()}
          className="mt-5 w-fit"
        >
          Sign out everywhere else
        </Button>
      )}
    </SettingsDialog>
  );
}
