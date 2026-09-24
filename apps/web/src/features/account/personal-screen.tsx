'use client';

import { useEffect, useId, useState } from 'react';
import type { AuthenticatedUser } from '@hireevo/api-client';
import { Button, Card, Switch } from '@hireevo/ui-web';
import { FormMessage } from '@/features/auth/form-message.tsx';
import { useSession } from '@/features/auth/session.tsx';
import {
  loadOrCreateProfile,
  saveVisibility,
  type OwnProfile,
} from '@/features/profile-setup/api.ts';
import { api } from '@/lib/api.ts';

/**
 * Personal information: who the account says you are, and who can see it.
 *
 * The identity half is read-only, and says so. There is no endpoint that
 * changes a name or an email — `/auth/me` is a GET — so a form here would
 * collect what nothing could save, which is the one thing §6.7 rules out. The
 * visibility half is the opposite: both switches write to
 * `PUT /profiles/me/visibility` and the page shows what came back.
 */
export function PersonalScreen() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <IdentityCard />
      <VisibilityCard />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border-subtle py-3 last:border-b-0">
      <dt className="text-sm text-content-subtle">{label}</dt>
      <dd className="min-w-0 text-sm font-medium break-all text-content">{value}</dd>
    </div>
  );
}

function IdentityCard() {
  const { user } = useSession();
  const [fetched, setFetched] = useState<AuthenticatedUser | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      // Read back rather than trusted from the sign-in response: this is the
      // screen that claims to show what the account holds.
      const { data } = await api.GET('/api/v1/auth/me', {});
      if (live && data !== undefined) setFetched(data);
    })();
    return () => {
      live = false;
    };
  }, []);

  const shown = fetched ?? user;
  if (shown === null) {
    return (
      <Card>
        <p role="status" className="text-sm text-content-subtle">
          Loading your details…
        </p>
      </Card>
    );
  }

  const name = [shown.firstName, shown.lastName].filter(Boolean).join(' ');

  async function resend() {
    setSending(true);
    setFailed(null);
    try {
      const { response } = await api.POST('/api/v1/auth/resend-verification', {
        body: { email: shown!.email },
      });
      if (response.ok) setSent(true);
      else setFailed('That could not be sent just now. Try again in a moment.');
    } catch {
      setFailed('Could not reach HireEvo. Check your connection and try again.');
    }
    setSending(false);
  }

  return (
    <Card aria-labelledby="identity-heading" className="flex min-w-0 flex-col">
      <h2 id="identity-heading" className="text-lg font-bold text-content-accent">
        Your details
      </h2>
      <p className="mt-1 text-sm text-content-subtle">
        The name and address on your account. Changing them is not something this screen can do yet.
      </p>

      <dl className="mt-4 flex flex-col">
        <Row label="Name" value={name === '' ? '—' : name} />
        <Row label="Email" value={shown.email} />
        <Row label="Username" value={shown.username ?? '—'} />
        <Row label="Email confirmed" value={shown.emailVerified ? 'Yes' : 'Not yet'} />
      </dl>

      {shown.emailVerified ? null : (
        <div className="mt-4 flex flex-col gap-2">
          {sent ? (
            <p role="status" className="text-sm text-content-accent">
              We have sent the confirmation link again. Check your inbox.
            </p>
          ) : (
            <Button
              type="button"
              variant="secondary"
              loading={sending}
              loadingLabel="Sending"
              onClick={() => void resend()}
              className="w-fit"
            >
              Send the confirmation email again
            </Button>
          )}
          {failed === null ? null : <FormMessage>{failed}</FormMessage>}
        </div>
      )}
    </Card>
  );
}

/** A switch with its words, which is what names it for a screen reader. */
function SettingSwitch({
  title,
  description,
  checked,
  busy,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  busy: boolean;
  onChange: (checked: boolean) => void;
}) {
  const labelId = useId();
  return (
    <div className="flex min-w-0 items-start justify-between gap-4">
      <div className="min-w-0">
        <p id={labelId} className="text-sm font-medium text-content">
          {title}
        </p>
        <p className="mt-0.5 text-sm text-content-subtle">{description}</p>
      </div>
      <Switch
        aria-labelledby={labelId}
        checked={checked}
        disabled={busy}
        onCheckedChange={onChange}
        className="mt-0.5 shrink-0"
      />
    </div>
  );
}

function VisibilityCard() {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [saving, setSaving] = useState<'public' | 'indexable' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      const result = await loadOrCreateProfile();
      if (!live) return;
      if (result.ok) {
        setProfile(result.profile);
        setState('ready');
      } else {
        setMessage(result.message);
        setState('failed');
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  async function set(change: { profilePublic?: boolean; searchIndexable?: boolean }) {
    if (profile === null) return;
    setSaving(change.profilePublic === undefined ? 'indexable' : 'public');
    setMessage(null);

    // The whole setting goes at the profile's version, as the endpoint takes
    // it: the sections are sent back exactly as they came, so a switch here
    // cannot quietly change what the profile shows.
    const result = await saveVisibility({
      version: profile.version,
      profilePublic: change.profilePublic ?? profile.visibility.profilePublic,
      searchIndexable: change.searchIndexable ?? profile.visibility.searchIndexable,
      locationGranularity: profile.visibility.locationGranularity,
      sections: profile.visibility.sections,
    });

    if (!result.ok) {
      setSaving(null);
      setMessage(result.message);
      return;
    }

    // The save moved the version and the answer does not carry the new one, so
    // the profile is read again: the next switch has to send a version the
    // server will still accept.
    const again = await loadOrCreateProfile();
    setSaving(null);
    if (again.ok) setProfile(again.profile);
    else setProfile({ ...profile, visibility: result.visibility });
  }

  if (state === 'loading') {
    return (
      <Card>
        <p role="status" className="text-sm text-content-subtle">
          Loading your visibility…
        </p>
      </Card>
    );
  }

  if (state === 'failed' || profile === null) {
    return (
      <Card>
        <FormMessage>{message ?? 'Your visibility could not be loaded.'}</FormMessage>
      </Card>
    );
  }

  return (
    <Card aria-labelledby="visibility-heading" className="flex min-w-0 flex-col">
      <h2 id="visibility-heading" className="text-lg font-bold text-content-accent">
        Online visibility
      </h2>
      <p className="mt-1 text-sm text-content-subtle">
        Whether buyers can reach your profile, and whether search engines may list it. What each
        section shows is chosen on your profile itself.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <SettingSwitch
          title="Profile is public"
          description="Anyone holding your link can read the sections you share."
          checked={profile.visibility.profilePublic}
          busy={saving !== null}
          onChange={(checked) => void set({ profilePublic: checked })}
        />
        <SettingSwitch
          title="Allow search engines to list it"
          description="Off keeps your profile reachable by link but out of search results."
          checked={profile.visibility.searchIndexable}
          busy={saving !== null}
          onChange={(checked) => void set({ searchIndexable: checked })}
        />
      </div>

      {message === null ? null : (
        <div className="mt-4">
          <FormMessage>{message}</FormMessage>
        </div>
      )}
    </Card>
  );
}
