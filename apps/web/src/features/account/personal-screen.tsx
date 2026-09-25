'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AuthenticatedUser } from '@hireevo/api-client';
import {
  Button,
  Card,
  OtpInput,
  PasswordField,
  TextField,
  buttonVariants,
  cn,
} from '@hireevo/ui-web';
import { FormMessage } from '@/features/auth/form-message.tsx';
import { useSession } from '@/features/auth/session.tsx';
import {
  loadOrCreateProfile,
  saveAvailability,
  type OwnProfile,
} from '@/features/profile-setup/api.ts';
import { profileChanged } from '@/features/profile-setup/profile-events.ts';
import { api } from '@/lib/api.ts';
import {
  confirmEmailChange,
  deactivateAccount,
  pendingEmailChange,
  requestEmailChange,
  updateName,
  type PendingEmailChange,
} from './api.ts';
import { SettingsDialog } from './settings-dialog.tsx';
import { RowAction, SettingRow, UsernameHelpCard } from './settings-rows.tsx';

/**
 * An email with most of it hidden, as the design shows it.
 *
 * The screen sits behind a session, so this is not secrecy — it is what the
 * frame draws, and it keeps a full address off a screen somebody may be
 * sharing. The first and last letter of the name stay and the domain keeps its
 * first letter and its ending, so the person can still tell which address it is.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return email;

  const hide = (value: string, keepFirst: number, keepLast: number) =>
    value.length <= keepFirst + keepLast
      ? value
      : value.slice(0, keepFirst) +
        '*'.repeat(Math.max(1, value.length - keepFirst - keepLast)) +
        (keepLast === 0 ? '' : value.slice(-keepLast));

  const name = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  const host =
    dot <= 0 ? hide(domain, 1, 0) : `${hide(domain.slice(0, dot), 1, 1)}${domain.slice(dot)}`;

  return `${hide(name, 1, 1)}@${host}`;
}

/** What the profile's availability is called where somebody reads it. */
const VISIBILITY: Record<string, string> = {
  available: 'Online',
  open_to_offers: 'Open to offers',
  unavailable: 'Offline',
};

const VISIBILITY_OPTIONS = [
  { value: 'available', label: 'Online' },
  { value: 'open_to_offers', label: 'Open to offers' },
  { value: 'unavailable', label: 'Offline' },
] as const satisfies readonly { value: Availability; label: string }[];

type Availability = NonNullable<OwnProfile['availability']>;

/**
 * Personal information, as the design lays it out: the account's details in
 * rows that each offer an Edit, the way out of the account under them, and the
 * note about usernames beside them.
 *
 * Only one of the three rows can be edited today. No endpoint changes a name or
 * an email address — `/auth/me` is a GET — and none deactivates an account, so
 * those controls say so rather than opening a form that could not save (§6.7).
 * Visibility is the profile's own availability, and it writes.
 */
export function PersonalScreen() {
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-5">
        <DetailsCard />
        <DeactivateCard />
      </div>
      <HelpCard />
    </div>
  );
}

function DetailsCard() {
  const { user } = useSession();
  const [fetched, setFetched] = useState<AuthenticatedUser | null>(null);
  const [open, setOpen] = useState<'name' | 'email' | null>(null);
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selectId = useId();

  useEffect(() => {
    let live = true;
    void (async () => {
      // Read back rather than trusted from the sign-in response: this is the
      // screen that claims to show what the account holds.
      const [me, own] = await Promise.all([api.GET('/api/v1/auth/me', {}), loadOrCreateProfile()]);
      if (!live) return;
      if (me.data !== undefined) setFetched(me.data);
      if (own.ok) setProfile(own.profile);
    })();
    return () => {
      live = false;
    };
  }, []);

  const shown = fetched ?? user;
  const name = shown === null ? '' : [shown.firstName, shown.lastName].filter(Boolean).join(' ');

  async function setAvailability(availability: Availability) {
    if (profile === null) return;
    setSaving(true);
    setMessage(null);

    // The same call the switch in the bar above makes, so the two cannot
    // disagree about what this profile says — and it tells that bar what
    // version the write moved to.
    const result = await saveAvailability(profile.version, availability);
    setSaving(false);

    if (result.ok) {
      setProfile(result.profile);
      profileChanged(result.profile);
      setEditing(false);
      return;
    }
    setMessage(result.message);
  }

  return (
    <Card aria-labelledby="details-heading" className="flex min-w-0 flex-col p-6 sm:p-7">
      <h2 id="details-heading" className="sr-only">
        Your account details
      </h2>

      <SettingRow
        label="Full name"
        value={shown === null ? '—' : name === '' ? 'Not set' : name}
        action={shown === null ? null : <RowAction label="Edit" onClick={() => setOpen('name')} />}
      />

      <SettingRow
        label="Email address"
        value={shown === null ? '—' : maskEmail(shown.email)}
        action={shown === null ? null : <RowAction label="Edit" onClick={() => setOpen('email')} />}
      />

      <div className="py-4 pb-0">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-base font-semibold text-content-accent">Visibility</p>
            <p className="mt-1 text-sm text-content-muted">
              {profile === null
                ? '—'
                : (VISIBILITY[profile.availability ?? 'available'] ?? 'Online')}
            </p>
          </div>
          {profile === null ? null : (
            <button
              type="button"
              onClick={() => setEditing((open) => !open)}
              className="inline-flex min-h-6 shrink-0 items-center rounded-sm px-1 text-sm font-medium text-content-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {editing ? 'Close' : 'Edit'}
            </button>
          )}
        </div>

        {!editing || profile === null ? null : (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label htmlFor={selectId} className="sr-only">
              Visibility
            </label>
            <select
              id={selectId}
              defaultValue={profile.availability ?? 'available'}
              disabled={saving}
              onChange={(event) => void setAvailability(event.target.value as Availability)}
              className="h-10 min-w-0 rounded-md border border-border bg-surface px-3 text-sm text-content focus-visible:border-border-accent focus-visible:outline-none"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {saving ? (
              <span role="status" className="text-xs text-content-subtle">
                Saving…
              </span>
            ) : null}
          </div>
        )}

        {message === null ? null : (
          <div className="mt-3">
            <FormMessage>{message}</FormMessage>
          </div>
        )}
      </div>

      {open === 'name' && shown !== null ? (
        <NameDialog
          firstName={shown.firstName}
          lastName={shown.lastName}
          onDone={(updated) => {
            setFetched(updated);
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      ) : null}

      {open === 'email' && shown !== null ? (
        <EmailDialog currentEmail={shown.email} onClose={() => setOpen(null)} />
      ) : null}
    </Card>
  );
}

/** The box the Full name row opens. Either name may be emptied. */
function NameDialog({
  firstName,
  lastName,
  onDone,
  onClose,
}: {
  firstName: string | null;
  lastName: string | null;
  onDone: (user: AuthenticatedUser) => void;
  onClose: () => void;
}) {
  const [first, setFirst] = useState(firstName ?? '');
  const [last, setLast] = useState(lastName ?? '');
  const [errors, setErrors] = useState<{ first?: string; last?: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    setMessage(null);
    setSaving(true);

    // Trimmed to null rather than to an empty string: the API treats null as
    // "clear this" and an absent key as "leave it", and a box with two inputs
    // has to be able to empty either of them.
    const result = await updateName(
      first.trim() === '' ? null : first,
      last.trim() === '' ? null : last,
    );
    setSaving(false);

    if (result.ok) {
      onDone(result.user);
      return;
    }
    if (result.field === 'firstName') setErrors({ first: result.message });
    else if (result.field === 'lastName') setErrors({ last: result.message });
    else setMessage(result.message);
  }

  return (
    <SettingsDialog
      title="Change your name"
      description="This is the name on your account. Your profile's display name is separate."
      onClose={onClose}
    >
      <form onSubmit={(event) => void submit(event)} className="flex min-w-0 flex-col gap-5">
        <TextField
          label="First Name"
          value={first}
          autoComplete="given-name"
          onChange={(event) => setFirst(event.target.value)}
          {...(errors.first === undefined ? {} : { error: errors.first })}
        />
        <TextField
          label="Last Name"
          value={last}
          autoComplete="family-name"
          onChange={(event) => setLast(event.target.value)}
          {...(errors.last === undefined ? {} : { error: errors.last })}
        />

        {message === null ? null : <FormMessage>{message}</FormMessage>}

        <Button type="submit" size="xl" fullWidth loading={saving} loadingLabel="Saving">
          Save name
        </Button>
      </form>
    </SettingsDialog>
  );
}

/**
 * The box the Email address row opens: ask, then confirm.
 *
 * Two steps because the account does not move until the new address answers.
 * The first sends a code there and warns the old address; the second spends it.
 * If a change is already waiting when the box opens — asked for on another
 * device, or before a reload — it opens at the code, because starting again
 * would only replace that code with an identical-looking one.
 *
 * Confirming ends every session, this one included, so the last thing the box
 * does is sign the person out and send them to sign in with the address they
 * just proved.
 */
function EmailDialog({ currentEmail, onClose }: { currentEmail: string; onClose: () => void }) {
  const router = useRouter();
  const { signOut } = useSession();
  const [moved, setMoved] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingEmailChange | null>(null);
  const [checked, setChecked] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      const waiting = await pendingEmailChange();
      if (!live) return;
      setPending(waiting);
      setChecked(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    setMessage(null);

    if (email.trim() === '') {
      setErrors({ email: 'Enter the address you want to move to.' });
      return;
    }
    if (email.trim().toLowerCase() === currentEmail.toLowerCase()) {
      setErrors({ email: 'That is already your email address.' });
      return;
    }
    if (password === '') {
      setErrors({ password: 'Enter your current password.' });
      return;
    }

    setBusy(true);
    const result = await requestEmailChange(email.trim(), password);
    setBusy(false);

    if (result.ok) {
      setPending(result.pending);
      setPassword('');
      return;
    }
    if (result.field === 'newEmail') setErrors({ email: result.message });
    else if (result.field === 'currentPassword') setErrors({ password: result.message });
    else setMessage(result.message);
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setBusy(true);
    const result = await confirmEmailChange(code);
    setBusy(false);

    if (!result.ok) {
      setMessage(result.message);
      setCode('');
      return;
    }

    setMoved(result.user.email);
  }

  /**
   * Leaves for sign-in, having cleared the client's own idea of the session.
   *
   * The API ended every session when the address moved, so the token in memory
   * is already dead. Clearing it here rather than letting the next request find
   * out keeps a 401 from arriving mid-render on a screen that still believes it
   * is signed in.
   */
  async function leave() {
    await signOut();
    router.replace('/sign-in');
  }

  if (moved !== null) {
    return (
      <SettingsDialog title="Email address changed" onClose={() => void leave()}>
        <p role="status" className="text-sm text-content-muted">
          Your account now uses <strong className="font-medium text-content-accent">{moved}</strong>
          . Every device has been signed out, including this one — sign in again with the new
          address.
        </p>
        <Button type="button" size="xl" fullWidth className="mt-5" onClick={() => void leave()}>
          Go to sign in
        </Button>
      </SettingsDialog>
    );
  }

  if (!checked) {
    return (
      <SettingsDialog title="Change email address" onClose={onClose}>
        <p role="status" className="text-sm text-content-subtle">
          Checking…
        </p>
      </SettingsDialog>
    );
  }

  if (pending !== null) {
    return (
      <SettingsDialog
        title="Confirm your new address"
        description={`Enter the six-digit code we sent to ${pending.newEmail}. Your account keeps its current address until you do.`}
        onClose={onClose}
      >
        <form onSubmit={(event) => void confirm(event)} className="flex min-w-0 flex-col gap-5">
          <OtpInput label="Confirmation code" value={code} onChange={setCode} disabled={busy} />

          {message === null ? null : <FormMessage>{message}</FormMessage>}

          <p className="text-sm text-content-subtle">
            Confirming signs you out everywhere, including here — the address that identifies your
            account is changing.
          </p>

          <Button
            type="submit"
            size="xl"
            fullWidth
            loading={busy}
            loadingLabel="Confirming"
            disabled={code.length < 6}
          >
            Confirm new address
          </Button>
        </form>
      </SettingsDialog>
    );
  }

  return (
    <SettingsDialog
      title="Change email address"
      description="We will email a code to the new address. Nothing changes until it comes back."
      onClose={onClose}
    >
      <form onSubmit={(event) => void ask(event)} className="flex min-w-0 flex-col gap-5">
        <TextField
          label="New Email"
          type="email"
          value={email}
          autoComplete="email"
          placeholder="example@gmail.com"
          onChange={(event) => setEmail(event.target.value)}
          {...(errors.email === undefined ? {} : { error: errors.email })}
        />
        <PasswordField
          label="Current Password"
          value={password}
          autoComplete="current-password"
          placeholder="••••••••"
          onChange={(event) => setPassword(event.target.value)}
          {...(errors.password === undefined ? {} : { error: errors.password })}
        />

        {message === null ? null : <FormMessage>{message}</FormMessage>}

        <Button type="submit" size="xl" fullWidth loading={busy} loadingLabel="Sending">
          Send code
        </Button>
      </form>
    </SettingsDialog>
  );
}

function DeactivateCard() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="flex min-w-0 items-start justify-between gap-4 p-6 sm:p-7">
      <div className="min-w-0">
        <p className="text-base font-semibold text-content-accent">Deactivate account</p>
        <p className="mt-1 text-sm text-content-muted">
          Temporarily disable your account and hide your profile.
        </p>
      </div>
      <div className="shrink-0 pt-1">
        <RowAction label="Deactivate" tone="danger" onClick={() => setOpen(true)} />
      </div>

      {open ? <DeactivateDialog onClose={() => setOpen(false)} /> : null}
    </Card>
  );
}

/**
 * The box the Deactivate control opens.
 *
 * It asks for the password because deactivating ends every session, and it says
 * what the act does and does not do before it asks: nothing is deleted, the
 * profile comes off the public web, and signing in again brings both back.
 * "Temporarily disable" is only reassuring if the screen says what temporary
 * means.
 */
function DeactivateDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { signOut } = useSession();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password === '') {
      setError('Enter your current password.');
      return;
    }

    setBusy(true);
    const result = await deactivateAccount(password);

    if (!result.ok) {
      setBusy(false);
      if (result.field === 'currentPassword') setError(result.message);
      else setMessage(result.message);
      return;
    }

    // The account is off and every session with it, so there is nowhere signed
    // in left to return to.
    await signOut();
    router.replace('/sign-in');
  }

  return (
    <SettingsDialog
      title="Deactivate your account"
      description="Your profile comes off the web and every device is signed out. Nothing is deleted — signing in again brings your account and your profile back."
      onClose={onClose}
    >
      <form onSubmit={(event) => void submit(event)} className="flex min-w-0 flex-col gap-5">
        <PasswordField
          label="Current Password"
          value={password}
          autoComplete="current-password"
          placeholder="••••••••"
          onChange={(event) => setPassword(event.target.value)}
          {...(error === null ? {} : { error })}
        />

        {message === null ? null : <FormMessage>{message}</FormMessage>}

        <Button type="submit" size="xl" fullWidth loading={busy} loadingLabel="Deactivating">
          Deactivate account
        </Button>
      </form>
    </SettingsDialog>
  );
}

function HelpCard() {
  return (
    <UsernameHelpCard>
      <Link
        href="/client-profile"
        className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'mt-5 w-fit')}
      >
        Go to your profile
      </Link>
    </UsernameHelpCard>
  );
}
