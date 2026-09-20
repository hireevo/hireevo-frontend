'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Route } from 'next';
import { Button, OtpInput } from '@hireevo/ui-web';
import { confirmEmail, resendCode, resendResetCode, verifyResetCode } from './api.ts';
import { FormMessage } from './form-message.tsx';
import { confirmEmailSchema } from './schemas.ts';
import { useAuthForm } from './use-auth-form.ts';

const RESEND_SECONDS = 60;

/**
 * When the resend countdown may next reach zero, kept per address so a refresh
 * resumes it instead of restarting it at sixty. A page reload was giving anyone
 * who fat-fingered it a fresh minute; the deadline is the truth, the on-screen
 * number just ticks towards it.
 */
function resendKey(purpose: CodePurpose, email: string): string {
  return `hireevo:resend:${purpose}:${email}`;
}

function readDeadline(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function writeDeadline(key: string, deadline: number): void {
  try {
    localStorage.setItem(key, String(deadline));
  } catch {
    // Private mode, or storage disabled. The countdown still works this session;
    // it just will not survive a refresh, which is no worse than before.
  }
}

/**
 * Which flow the code belongs to. The screen is drawn identically for both —
 * the design repeats the same frame in the sign-up and the recovery columns —
 * so only what the code is spent on differs.
 */
export type CodePurpose = 'signup' | 'recovery';

/**
 * Spacing and alignment per frame; see ConfirmCodeScreen. The button margins are
 * the file's less 3px, which the resend control gives back by being a 24px tap
 * target instead of the file's 21px line. Each margin is that value on a
 * 1024px-tall window and a compact one on a short laptop; see `--fit`.
 */
const LAYOUT = {
  signup: {
    form: 'mt-[calc(16px+0.14*var(--fit))]',
    block: 'w-full',
    boxes: 'items-center',
    resend: 'mt-[calc(24px+0.23*var(--fit))]',
    submit: 'mt-[calc(20px+0.17*var(--fit))]',
  },
  recovery: {
    form: 'mt-[calc(12px+0.07*var(--fit))]',
    block: 'mx-auto w-full max-w-[441px]',
    boxes: 'items-start',
    resend: 'mt-[calc(28px+0.26*var(--fit))]',
    submit: 'mt-[calc(28px+0.26*var(--fit))]',
  },
} as const;

const FLOWS = {
  signup: { submit: confirmEmail, resend: resendCode },
  recovery: { submit: verifyResetCode, resend: resendResetCode },
} as const;

export function ConfirmEmailForm({
  email,
  purpose = 'signup',
  backHref,
}: {
  email: string;
  purpose?: CodePurpose;
  /** Where the design's "Back" button returns to — the screen the address was typed on. */
  backHref: Route;
}) {
  const router = useRouter();
  const flow = FLOWS[purpose];
  const layout = LAYOUT[purpose];
  const { fieldErrors, formError, pending, run, clearField } = useAuthForm(
    confirmEmailSchema,
    flow.submit,
  );
  const [code, setCode] = useState('');
  // Starts at the full minute for the server render and the first client render
  // — matching, so hydration is quiet — then reconciles with the stored deadline.
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);

  const storageKey = resendKey(purpose, email);

  useEffect(() => {
    // The deadline is the truth; the on-screen number only ticks towards it, so
    // a refresh resumes the time actually left instead of restarting at a full
    // minute. A deadline already in the past leaves resend enabled.
    let deadline = readDeadline(storageKey);
    if (deadline === null) {
      // First time on this screen for this address: a code was just sent.
      deadline = Date.now() + RESEND_SECONDS * 1000;
      writeDeadline(storageKey, deadline);
    }
    const ends = deadline;

    // Set from a timer callback, never synchronously in the effect body: the
    // first paint keeps its value for a quiet hydration, and the real time left
    // lands on the very next tick. Once it reaches zero the value stops
    // changing, so React re-renders nothing further; the interval is cleared on
    // unmount.
    const tick = () => setSeconds(Math.max(0, Math.ceil((ends - Date.now()) / 1000)));
    const initial = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [storageKey]);

  const handleResend = useCallback(() => {
    setResending(true);
    void flow.resend(email).finally(() => {
      setResending(false);
      writeDeadline(storageKey, Date.now() + RESEND_SECONDS * 1000);
      setSeconds(RESEND_SECONDS);
    });
  }, [email, flow, storageKey]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run({ email, code });
  }

  const codeError = fieldErrors.code;

  // `method="post"` matters only before the page hydrates. Until then Enter
  // submits the form natively, and a form's default GET puts every field — the
  // password included — in the address bar, the history and the server logs.
  // Safari does exactly that on a slow load. A POST keeps the fields in the
  // body; once hydrated, onSubmit prevents the native submission entirely.
  return (
    <form
      method="post"
      onSubmit={handleSubmit}
      noValidate
      className={`${layout.form} flex flex-col`}
    >
      {/* The code entry and the resend line share the 441px block the copy
          above sits in; only the button runs the full width of the column. */}
      <div className={layout.block}>
        <div className={`flex flex-col ${layout.boxes}`}>
          <OtpInput
            label="Verification code"
            value={code}
            onChange={(next) => {
              setCode(next);
              clearField('code');
            }}
            invalid={codeError !== undefined}
            {...(codeError === undefined ? {} : { 'aria-describedby': 'code-error' })}
          />
          {codeError === undefined ? null : (
            <p id="code-error" role="alert" className="mt-3 text-sm text-content-warning">
              {codeError}
            </p>
          )}
        </div>

        {/* The design's line: "Check your spam folder or Resend code". The
            countdown is kept as a gate on the resend — a page reload used to
            hand anyone who fat-fingered it a fresh minute — and, since the
            control is disabled while it runs, the seconds are shown on the
            control itself rather than as an unreadable grey. */}
        <p className={`${layout.resend} text-center text-sm leading-[1.5] text-content-accent`}>
          Didn&rsquo;t receive a code? Check your spam folder or{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={seconds > 0 || resending}
            className="inline-flex min-h-6 items-center text-content-link underline underline-offset-2 disabled:cursor-not-allowed disabled:text-content-subtle disabled:no-underline"
          >
            Resend code{seconds > 0 ? ` (${seconds}s)` : ''}
          </button>
        </p>
      </div>

      {formError === null ? null : (
        <div className="mt-6">
          <FormMessage>{formError}</FormMessage>
        </div>
      )}

      {/* The design pairs a "Back" button with "Verify": Back leaves the flow
          the way "use a different email" did, Verify submits the code. */}
      <div className={`${layout.submit} grid grid-cols-2 gap-4`}>
        <Button
          type="button"
          variant="secondary"
          size="xl"
          fullWidth
          onClick={() => router.push(backHref)}
        >
          Back
        </Button>
        <Button type="submit" variant="primary" size="xl" fullWidth loading={pending}>
          Verify
        </Button>
      </div>
    </form>
  );
}
