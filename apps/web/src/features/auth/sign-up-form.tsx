'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, PasswordField, TextField } from '@hireevo/ui-web';
import { isUsernameAvailable, signUp } from './api.ts';
import { FormMessage } from './form-message.tsx';
import { PasswordStrength } from './password-strength.tsx';
import { turnstileEnabled } from './turnstile.ts';
import { TurnstileWidget, type TurnstileHandle } from './turnstile-widget.tsx';
import { signUpSchema, type SignUpValues } from './schemas.ts';
import { useAuthForm } from './use-auth-form.ts';

export function SignUpForm() {
  // The Turnstile token lives in a ref so the submit handler always reads the
  // current one without re-creating the form's submit function each render.
  const captchaTokenRef = useRef<string | null>(null);
  const runSignUp = useCallback(
    (values: SignUpValues) => signUp(values, captchaTokenRef.current),
    [],
  );
  const { fieldErrors, formError, pending, run, clearField } = useAuthForm(signUpSchema, runSignUp);

  // The only controlled field: the strength meter below it re-reads the value on
  // every keystroke.
  const [password, setPassword] = useState('');
  // Uncontrolled, so anything typed before hydration survives: WebKit resets a
  // controlled input's early value, and the password silently vanishes. The
  // meter still needs the value, so it is mirrored on change and read once on mount.
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const field = form.current?.elements.namedItem('password');
    if (field instanceof HTMLInputElement && field.value !== '') setPassword(field.value);
  }, []);

  const [usernameTaken, setUsernameTaken] = useState<string | null>(null);

  const captcha = useRef<TurnstileHandle>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const handleCaptcha = useCallback((token: string | null) => {
    captchaTokenRef.current = token;
    if (token !== null) setCaptchaError(null);
  }, []);

  /**
   * The design shows "User name is already taken" under the field, so the answer
   * has to arrive before submit. Checked on blur, not per keystroke: the endpoint
   * is public and rate limited, and a failed check stays silent rather than
   * claiming a name is taken because the network dropped.
   */
  async function checkUsername(username: string) {
    setUsernameTaken(null);
    if (username.trim().length < 3) return;
    const verdict = await isUsernameAvailable(username.trim());
    if (verdict.status === 'taken') setUsernameTaken('User name is already taken');
    if (verdict.status === 'rejected') setUsernameTaken(verdict.message);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Stop at the field the blur check already flagged, rather than sending a
    // sign-up the server will only bounce with a 409.
    if (usernameTaken !== null) {
      const field = form.current?.elements.namedItem('username');
      if (field instanceof HTMLInputElement) field.focus();
      return;
    }

    // The checkbox has to be ticked before the sign-up leaves the page.
    if (turnstileEnabled && captchaTokenRef.current === null) {
      setCaptchaError('Please complete the verification below.');
      return;
    }

    const data = new FormData(event.currentTarget);
    void run({
      firstName: data.get('firstName'),
      lastName: data.get('lastName'),
      email: data.get('email'),
      username: data.get('username'),
      password: data.get('password'),
      confirmPassword: data.get('confirmPassword'),
    }).then((outcome) => {
      // A Turnstile token is spent the moment the server verifies it, so a
      // request that reached the server needs a fresh pass before the next try.
      // A client-side validation failure never sent the token, so the solved
      // widget is kept — correcting a field typo must not cost the person
      // another verification.
      if (outcome === 'failed') {
        captcha.current?.reset();
        captchaTokenRef.current = null;
      }
    });
  }

  // `method="post"` matters only before hydration: a native GET would put the
  // password in the URL. Once hydrated, onSubmit prevents the native submission.
  return (
    <form
      method="post"
      ref={form}
      onSubmit={handleSubmit}
      noValidate
      className="mt-[calc(8px+0.06*var(--fit))] flex flex-col"
    >
      <div className="flex flex-col gap-[calc(4px+0.08*var(--fit))]">
        <div className="grid grid-cols-1 gap-[15px] sm:grid-cols-[244fr_270fr] sm:gap-4 [&>*]:min-w-0">
          <TextField
            label="First Name"
            name="firstName"
            autoComplete="given-name"
            placeholder="Ex. John"
            error={fieldErrors.firstName}
            onChange={() => clearField('firstName')}
          />
          <TextField
            label="Last Name"
            name="lastName"
            autoComplete="family-name"
            placeholder="Ex. John"
            error={fieldErrors.lastName}
            onChange={() => clearField('lastName')}
          />
        </div>

        <div className="grid grid-cols-1 gap-[15px] sm:grid-cols-[244fr_270fr] sm:gap-4 [&>*]:min-w-0">
          <TextField
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="example@gmail.com"
            error={fieldErrors.email}
            onChange={() => clearField('email')}
          />
          <TextField
            label="User Name"
            name="username"
            autoComplete="username"
            placeholder="john45461"
            error={fieldErrors.username ?? usernameTaken ?? undefined}
            onChange={() => {
              clearField('username');
              setUsernameTaken(null);
            }}
            onBlur={(event) => void checkUsername(event.target.value)}
          />
        </div>

        <div>
          <PasswordField
            label="Password"
            name="password"
            autoComplete="new-password"
            placeholder="••••••••"
            error={fieldErrors.password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearField('password');
            }}
          />
          <PasswordStrength value={password} />
        </div>

        <PasswordField
          label="Re-Password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          error={fieldErrors.confirmPassword}
          onChange={() => clearField('confirmPassword')}
        />
      </div>

      {turnstileEnabled ? (
        <div className="mt-[calc(6px+0.16*var(--fit))]">
          <TurnstileWidget ref={captcha} onChange={handleCaptcha} />
          {captchaError === null ? null : (
            <p role="alert" className="mt-1.5 text-sm text-content-warning">
              {captchaError}
            </p>
          )}
        </div>
      ) : null}

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
        className="mt-[calc(8px+0.2*var(--fit))]"
      >
        Continue
      </Button>
    </form>
  );
}
