'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Checkbox, PasswordField, TextField } from '@hireevo/ui-web';
import { signIn } from './api.ts';
import { FormMessage } from './form-message.tsx';
import { recaptchaEnabled } from './recaptcha.ts';
import { RecaptchaCheckbox, type RecaptchaHandle } from './recaptcha-checkbox.tsx';
import { signInSchema, type SignInValues } from './schemas.ts';
import { useAuthForm } from './use-auth-form.ts';

export function SignInForm() {
  // The reCAPTCHA token lives in a ref so the submit handler always reads the
  // current one without re-creating the form's submit function each render.
  const captchaTokenRef = useRef<string | null>(null);
  const runSignIn = useCallback(
    (values: SignInValues) => signIn(values, captchaTokenRef.current),
    [],
  );
  const { fieldErrors, formError, pending, run, clearField } = useAuthForm(signInSchema, runSignIn);

  const captcha = useRef<RecaptchaHandle>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const handleCaptcha = useCallback((token: string | null) => {
    captchaTokenRef.current = token;
    if (token !== null) setCaptchaError(null);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // The checkbox has to be ticked before the sign-in leaves the page.
    if (recaptchaEnabled && captchaTokenRef.current === null) {
      setCaptchaError('Please confirm you are not a robot.');
      return;
    }

    const data = new FormData(event.currentTarget);
    void run({
      email: data.get('email'),
      password: data.get('password'),
      remember: data.get('remember') === 'on',
    }).then((outcome) => {
      // A reCAPTCHA token is spent the moment the server verifies it, so a
      // request that reached the server needs a fresh tick before the next try.
      // A client-side validation failure never sent the token, so the solved
      // checkbox is kept — correcting a field must not cost another challenge.
      if (outcome === 'failed') {
        captcha.current?.reset();
        captchaTokenRef.current = null;
      }
    });
  }

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
      className="mt-[calc(16px+0.14*var(--fit))] flex flex-col"
    >
      <div className="flex flex-col gap-[calc(12px+0.13*var(--fit))]">
        <TextField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="example@gmail.com"
          error={fieldErrors.email}
          onChange={() => clearField('email')}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={fieldErrors.password}
          onChange={() => clearField('password')}
        />
      </div>

      {recaptchaEnabled ? (
        <div className="mt-[calc(12px+0.13*var(--fit))]">
          <RecaptchaCheckbox ref={captcha} onChange={handleCaptcha} />
          {captchaError === null ? null : (
            <p role="alert" className="mt-1.5 text-sm text-content-warning">
              {captchaError}
            </p>
          )}
        </div>
      ) : null}

      <div className="mt-[calc(12px+0.13*var(--fit))] flex items-center justify-between gap-4">
        <Checkbox name="remember">Remember me</Checkbox>
        <Link
          href="/recover"
          className="text-base font-medium text-content-link underline underline-offset-2"
        >
          Forgot Password?
        </Link>
      </div>

      {formError === null ? null : (
        <div className="mt-6">
          <FormMessage>{formError}</FormMessage>
        </div>
      )}

      <Button
        type="submit"
        size="xl"
        fullWidth
        loading={pending}
        className="mt-[calc(24px+0.25*var(--fit))]"
      >
        Sign in
      </Button>
    </form>
  );
}
