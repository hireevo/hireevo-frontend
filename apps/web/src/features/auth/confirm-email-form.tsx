'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, OtpInput } from '@hireevo/ui-web';
import { confirmEmail, resendCode, resendResetCode, verifyResetCode } from './api.ts';
import { FormMessage } from './form-message.tsx';
import { confirmEmailSchema } from './schemas.ts';
import { useAuthForm } from './use-auth-form.ts';

const RESEND_SECONDS = 60;

/**
 * Which flow the code belongs to. The screen is drawn identically for both —
 * the design repeats the same frame in the sign-up and the recovery columns —
 * so only what the code is spent on differs.
 */
export type CodePurpose = 'signup' | 'recovery';

/** Spacing and alignment per frame; see ConfirmCodeScreen. */
const LAYOUT = {
  signup: {
    form: 'mt-[30px]',
    block: 'w-full',
    boxes: 'items-center',
    resend: 'mt-[47px]',
    submit: 'mt-[40px]',
  },
  recovery: {
    form: 'mt-[19px]',
    block: 'mx-auto w-full max-w-[441px]',
    boxes: 'items-start',
    resend: 'mt-[54px]',
    submit: 'mt-[57px]',
  },
} as const;

const FLOWS = {
  signup: { submit: confirmEmail, resend: resendCode },
  recovery: { submit: verifyResetCode, resend: resendResetCode },
} as const;

export function ConfirmEmailForm({
  email,
  purpose = 'signup',
}: {
  email: string;
  purpose?: CodePurpose;
}) {
  const flow = FLOWS[purpose];
  const layout = LAYOUT[purpose];
  const { fieldErrors, formError, pending, run, clearField } = useAuthForm(
    confirmEmailSchema,
    flow.submit,
  );
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (seconds === 0) return;
    const timer = setTimeout(() => setSeconds((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const handleResend = useCallback(() => {
    setResending(true);
    void flow.resend(email).finally(() => {
      setResending(false);
      setSeconds(RESEND_SECONDS);
    });
  }, [email, flow]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run({ email, code });
  }

  const codeError = fieldErrors.code;

  return (
    <form onSubmit={handleSubmit} noValidate className={`${layout.form} flex flex-col`}>
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

        {/* The file greys "Resend code" out to #c3d6e7, which is 1.4:1 on the
            page — unreadable rather than merely quiet. It is drawn that way
            because the countdown is running, so the state is expressed by
            disabling the control instead of by a colour nobody can read. */}
        <div className={`${layout.resend} flex flex-col items-center text-sm leading-[1.5]`}>
          <p className="text-content-accent">
            Didn&rsquo;t receive a code?{seconds > 0 ? ` within (${seconds}s)` : ''}
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={seconds > 0 || resending}
            className="text-content-subtle underline underline-offset-2 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
          >
            Resend code
          </button>
        </div>
      </div>

      {formError === null ? null : (
        <div className="mt-6">
          <FormMessage>{formError}</FormMessage>
        </div>
      )}

      <Button type="submit" size="xl" fullWidth loading={pending} className={layout.submit}>
        Submit
      </Button>
    </form>
  );
}
