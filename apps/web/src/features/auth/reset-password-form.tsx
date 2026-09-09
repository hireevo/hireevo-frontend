'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Button, PasswordField } from '@hireevo/ui-web';
import { resetPassword } from './api.ts';
import { FormMessage } from './form-message.tsx';
import { PasswordRules } from './password-rules.tsx';
import { resetPasswordSchema } from './schemas.ts';
import { useAuthForm } from './use-auth-form.ts';

export function ResetPasswordForm({ token }: { token: string }) {
  const { fieldErrors, formError, pending, run, clearField } = useAuthForm(
    resetPasswordSchema,
    resetPassword,
  );
  const [password, setPassword] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run({ token, password, confirmPassword: data.get('confirmPassword') });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-[30px] flex flex-col">
      <div className="flex flex-col gap-[15px]">
        <div>
          <PasswordField
            label="New Password"
            name="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            error={fieldErrors.password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearField('password');
            }}
          />
          <PasswordRules value={password} />
        </div>

        <PasswordField
          label="Confirm New Password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          error={fieldErrors.confirmPassword}
          onChange={() => clearField('confirmPassword')}
        />
      </div>

      {/* The frame draws sign-in's "Remember me / Forgot Password?" row here.
          Only the link is kept.

          "Remember me" decides how long a session lasts, and this screen creates
          no session — resetting revokes every one and hands the person to
          sign-in. A checkbox that changes nothing is worse than an absent one,
          because someone ticks it and reasonably expects it to matter.

          The link does earn its place: the most common reason to be stuck on
          this screen is a link that has expired, and this is the way to ask for
          another. */}
      <div className="mt-[25px] flex items-center justify-end">
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

      <Button type="submit" size="xl" fullWidth loading={pending} className="mt-[39px]">
        Reset password
      </Button>
    </form>
  );
}
