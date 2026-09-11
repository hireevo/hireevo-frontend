'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { Button, Checkbox, PasswordField, TextField } from '@hireevo/ui-web';
import { signIn } from './api.ts';
import { FormMessage } from './form-message.tsx';
import { signInSchema } from './schemas.ts';
import { useAuthForm } from './use-auth-form.ts';

export function SignInForm() {
  const { fieldErrors, formError, pending, run, clearField } = useAuthForm(signInSchema, signIn);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run({
      email: data.get('email'),
      password: data.get('password'),
      remember: data.get('remember') === 'on',
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
