'use client';

import type { FormEvent } from 'react';
import { Button, PasswordField } from '@hireevo/ui-web';
import { resetPassword } from './api.ts';
import { FormMessage } from './form-message.tsx';
import { PasswordRules } from './password-rules.tsx';
import { resetPasswordSchema } from './schemas.ts';
import { useAuthForm } from './use-auth-form.ts';
import { useState } from 'react';

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
            label="New password"
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
          label="Confirm new password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          error={fieldErrors.confirmPassword}
          onChange={() => clearField('confirmPassword')}
        />
      </div>

      {formError === null ? null : (
        <div className="mt-6">
          <FormMessage>{formError}</FormMessage>
        </div>
      )}

      <Button type="submit" size="xl" fullWidth loading={pending} className="mt-[39px]">
        Set new password
      </Button>
    </form>
  );
}
