'use client';

import { useEffect, useId, useState } from 'react';
import { LuFileText, LuIdCard, LuMail, LuPhone, LuScanFace, LuShieldCheck } from 'react-icons/lu';
import type { AuthenticatedUser } from '@hireevo/api-client';
import { Badge, Button, cn } from '@hireevo/ui-web';
import { useSession } from '@/features/auth/session.tsx';
import { api } from '@/lib/api.ts';
import { maskEmail } from './personal-screen.tsx';
import { SettingsAside } from './settings-rows.tsx';

/** Where a step has got to. The words carry the meaning; the tone repeats it. */
type StepState = 'verified' | 'in-review' | 'not-started';

const BADGE: Record<StepState, { label: string; tone: 'warning' | 'neutral' }> = {
  verified: { label: 'Verified', tone: 'warning' },
  'in-review': { label: 'In review', tone: 'neutral' },
  'not-started': { label: 'Not started', tone: 'neutral' },
};

/**
 * Identity verification, as the design lays it out: the steps that make up a
 * verified seller, each with where it has got to and the way to move it on.
 *
 * One of the five is real. The email address is confirmed during sign-up, so
 * this screen reads that state back from the account and its View reveals the
 * address it is masking. The other four — phone, government ID, selfie, proof
 * of address — have no endpoint, no table and, for three of them, no identity
 * vendor behind them. They are drawn because the screen is a list of steps and
 * a list missing four of them says nothing useful, but their buttons refuse and
 * say why rather than opening something that could not finish (§6.7).
 *
 * Their state says "Not started", which is what is true. The frame shows a
 * verified phone and a government ID in review, and a screen that tells
 * somebody their ID is being reviewed when nothing was ever submitted is not a
 * placeholder — it is a false statement about their account, on the screen
 * whose whole subject is what the account has proved.
 */
export function IdentityScreen() {
  const { user } = useSession();
  const [fetched, setFetched] = useState<AuthenticatedUser | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      // Read back rather than trusted from the sign-in response: this is the
      // screen that claims to say what the account has confirmed.
      const me = await api.GET('/api/v1/auth/me', {});
      if (live && me.data !== undefined) setFetched(me.data);
    })();
    return () => {
      live = false;
    };
  }, []);

  const shown = fetched ?? user;
  const email = shown === null ? null : shown.email;
  const emailVerified = shown?.emailVerified === true;

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <section aria-labelledby="steps-heading" className="min-w-0">
        <h2 id="steps-heading" className="text-xl font-bold text-content-accent">
          Verification steps
        </h2>

        <div className="mt-4 min-w-0">
          <Step
            icon={<LuMail />}
            label="Email address"
            detail={email === null ? 'Loading…' : revealed ? email : maskEmail(email)}
            state={emailVerified ? 'verified' : 'not-started'}
            action={
              email === null ? null : emailVerified ? (
                <TextAction
                  label={revealed ? 'Hide' : 'View'}
                  onClick={() => setRevealed((open) => !open)}
                />
              ) : (
                <NotYetButton
                  label="Verify"
                  reason="Your address is confirmed from the email we sent when you signed up."
                />
              )
            }
          />

          <Step
            icon={<LuPhone />}
            label="Phone number"
            detail="Not added yet"
            state="not-started"
            action={
              <NotYetButton
                label="Verify"
                reason="Verifying a phone number is not available yet."
              />
            }
          />

          <Step
            icon={<LuIdCard />}
            label="Government ID"
            detail="Passport or driver’s licence"
            state="not-started"
            action={<NotYetButton label="Verify" reason="Submitting an ID is not available yet." />}
          />

          <Step
            icon={<LuScanFace />}
            label="Selfie verification"
            detail="A quick photo to match your ID"
            state="not-started"
            action={
              <NotYetButton label="Verify" reason="Selfie verification is not available yet." />
            }
          />

          <Step
            icon={<LuFileText />}
            label="Proof of address"
            detail="A utility bill or bank statement"
            state="not-started"
            action={
              <NotYetButton
                label="Verify"
                reason="Submitting a proof of address is not available yet."
              />
            }
          />
        </div>
      </section>

      <SettingsAside icon={<LuShieldCheck />} title="Your data is protected">
        <p>
          Documents are encrypted and only used to confirm your identity. They are never shown on
          your public profile.
        </p>
      </SettingsAside>
    </div>
  );
}

function Step({
  icon,
  label,
  detail,
  state,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  state: StepState;
  action: React.ReactNode;
}) {
  const badge = BADGE[state];
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 border-b border-border-subtle py-5 first:pt-0 last:border-b-0 last:pb-0">
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface-accent-subtle text-content-accent [&>svg]:size-5"
      >
        {icon}
      </span>

      <div className="min-w-0 flex-1 basis-40">
        <p className="text-base font-semibold text-content-accent">{label}</p>
        <p className="mt-1 text-sm break-all text-content-muted">{detail}</p>
      </div>

      {/* Status and control sit together at the end of the row and wrap as one
          block, so a narrow phone never puts the button on a line of its own
          with nothing to say which step it belongs to. */}
      <div className="flex shrink-0 items-center gap-3">
        <Badge tone={badge.tone} variant={state === 'verified' ? 'solid' : 'pill'}>
          {badge.label}
        </Badge>
        {action}
      </div>
    </div>
  );
}

/** The plain blue word the design puts beside a step that is already done. */
function TextAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-6 items-center rounded-sm px-1 text-sm font-medium text-content-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {label}
    </button>
  );
}

/**
 * The button a step carries while there is nothing behind it to press.
 *
 * Drawn because the design draws it, and refused because a button that opens an
 * upload which cannot be submitted wastes somebody's time and their document
 * (§6.7). The reason is announced rather than left to be guessed at.
 */
function NotYetButton({ label, reason }: { label: string; reason: string }) {
  const reasonId = useId();
  return (
    <>
      <Button
        type="button"
        size="sm"
        aria-disabled="true"
        aria-describedby={reasonId}
        className={cn('cursor-not-allowed rounded-full opacity-60')}
      >
        {label}
      </Button>
      <span id={reasonId} className="sr-only">
        {reason}
      </span>
    </>
  );
}
