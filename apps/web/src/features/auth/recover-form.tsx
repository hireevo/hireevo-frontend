'use client';

import type { FormEvent } from 'react';
import { Button, Checkbox, TextField } from '@hireevo/ui-web';
import { requestRecovery } from './api.ts';
import { FormMessage } from './form-message.tsx';
import { recoverSchema } from './schemas.ts';
import { useAuthForm } from './use-auth-form.ts';

export function RecoverForm() {
  const { fieldErrors, formError, pending, run, clearField } = useAuthForm(
    recoverSchema,
    requestRecovery,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run({ email: data.get('email'), remember: data.get('remember') === 'on' });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-[39px] flex flex-col">
      <TextField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="example@gmail.com"
        error={fieldErrors.email}
        onChange={() => clearField('email')}
      />

      <Checkbox name="remember" className="mt-[22px] self-start">
        Remember me
      </Checkbox>

      {formError === null ? null : (
        <div className="mt-6">
          <FormMessage>{formError}</FormMessage>
        </div>
      )}

      <Button type="submit" size="xl" fullWidth loading={pending} className="mt-[39px]">
        Continue
      </Button>
    </form>
  );
}
