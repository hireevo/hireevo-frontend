'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Button, Checkbox, PasswordField } from '@hireevo/ui-web';
import { resetPassword } from './api.ts';
import { FormMessage } from './form-message.tsx';
import { PasswordChangedDialog } from './password-changed-dialog.tsx';
import { PasswordRules } from './password-rules.tsx';
import { resetPasswordSchema } from './schemas.ts';
import { useAuthForm } from './use-auth-form.ts';

export function ResetPasswordForm({ token }: { token: string }) {
  const { fieldErrors, formError, pending, run, clearField } = useAuthForm(
    resetPasswordSchema,
    resetPassword,
  );
  const [password, setPassword] = useState('');
  const [changed, setChanged] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run({ token, password, confirmPassword: data.get('confirmPassword') }).then((ok) => {
      if (ok) setChanged(true);
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="mt-[17px] flex flex-col">
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

        {/* The same row sign-in, sign-up and recover carry, drawn the same way
          here.

          The checkbox is inert on all four screens today: `remember` is read
          from the form and handed to the submit call, and nothing downstream
          sends it. That is worth fixing, but it is one gap across the flow
          rather than something to solve on this screen alone — leaving it out
          here would only make this the odd screen out. */}
        <div className="mt-[13px] flex items-center justify-between gap-4">
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

        <Button type="submit" size="xl" fullWidth loading={pending} className="mt-[39px]">
          Reset password
        </Button>
      </form>
      {changed ? <PasswordChangedDialog /> : null}
    </>
  );
}
