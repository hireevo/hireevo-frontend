'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { LuUser } from 'react-icons/lu';
import type { AuthenticatedUser } from '@hireevo/api-client';
import { Card, buttonVariants, cn } from '@hireevo/ui-web';
import { FormMessage } from '@/features/auth/form-message.tsx';
import { useSession } from '@/features/auth/session.tsx';
import {
  loadOrCreateProfile,
  saveAvailability,
  type OwnProfile,
} from '@/features/profile-setup/api.ts';
import { profileChanged } from '@/features/profile-setup/profile-events.ts';
import { api } from '@/lib/api.ts';

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

/** The "Edit" the design puts at the end of a row nothing can yet change. */
function NotYet({ label, reason, tone }: { label: string; reason: string; tone?: 'danger' }) {
  const reasonId = useId();
  return (
    <>
      <button
        type="button"
        aria-disabled="true"
        aria-describedby={reasonId}
        // `min-h-6` and the padding are the target, not the look: the design
        // draws these as plain text, and a 20px-tall target is under the 24px
        // WCAG 2.5.8 asks for — which the resolution sweep caught at 320px.
        className={cn(
          'inline-flex min-h-6 cursor-not-allowed items-center rounded-sm px-1 text-sm font-medium opacity-60',
          tone === 'danger' ? 'text-content-danger' : 'text-content-link',
        )}
      >
        {label}
      </button>
      <span id={reasonId} className="sr-only">
        {reason}
      </span>
    </>
  );
}

function Row({ label, value, action }: { label: string; value: string; action: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 border-b border-border-subtle py-4 first:pt-0">
      <div className="min-w-0">
        <p className="text-base font-semibold text-content-accent">{label}</p>
        <p className="mt-1 text-sm break-all text-content-muted">{value}</p>
      </div>
      <div className="shrink-0 pt-1">{action}</div>
    </div>
  );
}

function DetailsCard() {
  const { user } = useSession();
  const [fetched, setFetched] = useState<AuthenticatedUser | null>(null);
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

      <Row
        label="Full name"
        value={shown === null ? '—' : name === '' ? 'Not set' : name}
        action={<NotYet label="Edit" reason="Changing your name is not available yet." />}
      />

      <Row
        label="Email address"
        value={shown === null ? '—' : maskEmail(shown.email)}
        action={<NotYet label="Edit" reason="Changing your email address is not available yet." />}
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
    </Card>
  );
}

function DeactivateCard() {
  return (
    <Card className="flex min-w-0 items-start justify-between gap-4 p-6 sm:p-7">
      <div className="min-w-0">
        <p className="text-base font-semibold text-content-accent">Deactivate account</p>
        <p className="mt-1 text-sm text-content-muted">
          Temporarily disable your account and hide your profile.
        </p>
      </div>
      <div className="shrink-0 pt-1">
        <NotYet
          label="Deactivate"
          reason="Deactivating an account is not available yet."
          tone="danger"
        />
      </div>
    </Card>
  );
}

function HelpCard() {
  return (
    <Card aria-labelledby="help-heading" className="flex min-w-0 flex-col p-6 sm:p-7">
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-surface-accent-subtle text-content-accent"
      >
        <LuUser className="size-5" />
      </span>

      <h2 id="help-heading" className="mt-6 text-lg font-bold text-content-accent">
        Where can I find my username and display name?
      </h2>
      <p className="mt-2 text-sm leading-[1.6] text-content-muted">
        You can find both your username and display name on your profile. While you can update your
        display name, your username cannot be changed.
      </p>

      <Link
        href="/client-profile"
        className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'mt-5 w-fit')}
      >
        Go to your profile
      </Link>
    </Card>
  );
}
