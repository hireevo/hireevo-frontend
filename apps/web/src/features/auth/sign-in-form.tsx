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

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-[30px] flex flex-col">
      <div className="flex flex-col gap-[25px]">
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

      <div className="mt-[25px] flex items-center justify-between gap-4">
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

      <Button type="submit" size="xl" fullWidth loading={pending} className="mt-[49px]">
        Sign in
      </Button>
    </form>
  );
}
