'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Checkbox, PasswordField, TextField } from '@hireevo/ui-web';
import { isUsernameAvailable, signUp } from './api.ts';
import { FormMessage } from './form-message.tsx';
import { PasswordRules } from './password-rules.tsx';
import { preloadRecaptcha, recaptchaEnabled } from './recaptcha.ts';
import { signUpSchema } from './schemas.ts';
import { useAuthForm } from './use-auth-form.ts';

export function SignUpForm() {
  const { fieldErrors, formError, pending, run, clearField } = useAuthForm(signUpSchema, signUp);
  // The only controlled field: the rules list below it has to re-read the value
  // on every keystroke, which is the whole point of showing the list.
  const [password, setPassword] = useState('');
  // Uncontrolled, so that anything typed before the page finished loading
  // survives hydration: WebKit resets a controlled input's early value to the
  // empty state it was rendered with, and the person's password silently
  // vanishes. The rules still need the value, so it is mirrored on every change
  // and read once on mount to pick up whatever arrived first.
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const field = form.current?.elements.namedItem('password');
    if (field instanceof HTMLInputElement && field.value !== '') setPassword(field.value);
  }, []);

  // Warm the reCAPTCHA script up front, so the token is ready when the button is
  // pressed rather than adding a wait to the submit. A no-op when protection is off.
  useEffect(() => {
    preloadRecaptcha();
  }, []);

  const [usernameTaken, setUsernameTaken] = useState<string | null>(null);

  /**
   * The design shows "User name is already taken" under the field, so the
   * answer has to arrive before submit.
   *
   * Checked on blur rather than on every keystroke: the endpoint is public and
   * rate limited precisely because an instant answer is also a way to harvest
   * the handles in use, and a request per character would spend that budget on
   * prefixes nobody typed on purpose. A failed check stays silent — claiming a
   * name is taken because the network dropped is worse than saying nothing.
   */
  async function checkUsername(username: string) {
    setUsernameTaken(null);
    if (username.trim().length < 3) return;

    const verdict = await isUsernameAvailable(username.trim());

    // A refusal carries the server's own reason — "This username is reserved"
    // — which is more use than the generic line, and is the case the live check
    // exists for. `unknown` stays silent: a dropped request must not read as a
    // name being unavailable.
    if (verdict.status === 'taken') setUsernameTaken('User name is already taken');
    if (verdict.status === 'rejected') setUsernameTaken(verdict.message);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // The blur check already knows this name is taken, so the form stops here
    // rather than sending a sign-up that will only bounce off the server's 409.
    // The server is still the real gate — this just spares the round trip and
    // keeps the person on the form where the error is, instead of moving them to
    // the code screen and back.
    if (usernameTaken !== null) {
      const field = form.current?.elements.namedItem('username');
      if (field instanceof HTMLInputElement) field.focus();
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
      terms: data.get('terms') === 'on',
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
      ref={form}
      onSubmit={handleSubmit}
      noValidate
      className="mt-[calc(8px+0.06*var(--fit))] flex flex-col"
    >
      <div className="flex flex-col gap-[calc(8px+0.04*var(--fit))]">
        {/* 244 / 270 with a 16px gutter, straight from the design's 530px column. */}
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
          <PasswordRules value={password} />
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

      {/* Consent, required before an account can be created. The links open the
          Terms and the Privacy Policy; clicking one navigates without toggling
          the box it sits inside — a click on a link inside a label would
          otherwise do both. */}
      <div className="mt-[calc(8px+0.04*var(--fit))]">
        <Checkbox name="terms" onChange={() => clearField('terms')}>
          I agree to the{' '}
          <Link
            href="/terms"
            onClick={(event) => event.stopPropagation()}
            className="font-medium text-content-link underline underline-offset-2"
          >
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            onClick={(event) => event.stopPropagation()}
            className="font-medium text-content-link underline underline-offset-2"
          >
            Privacy Policy
          </Link>
        </Checkbox>
        {fieldErrors.terms === undefined ? null : (
          <p role="alert" className="mt-1.5 pl-6 text-sm text-content-warning">
            {fieldErrors.terms}
          </p>
        )}
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
        className="mt-[calc(14px+0.14*var(--fit))]"
      >
        Create Account
      </Button>

      {/* reCAPTCHA's terms require this notice whenever the badge is hidden, and
          it is harmless when it is not. Rendered only when protection is on. */}
      {recaptchaEnabled ? (
        <p className="mt-3 text-xs leading-4 text-content-subtle">
          This site is protected by reCAPTCHA and the Google{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Privacy Policy
          </a>{' '}
          and{' '}
          <a
            href="https://policies.google.com/terms"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Terms of Service
          </a>{' '}
          apply.
        </p>
      ) : null}

      <p className="mt-[calc(10px+0.1*var(--fit))] text-center text-base text-content-subtle">
        Already have an account?{' '}
        <Link
          href="/sign-in"
          className="font-medium text-content-link underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
