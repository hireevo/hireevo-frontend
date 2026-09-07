'use client';

import { useState, type FormEvent } from 'react';
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

  const [sentTo, setSentTo] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = data.get('email');
    void run({ email, remember: data.get('remember') === 'on' }).then(() => {
      if (typeof email === 'string') setSentTo(email);
    });
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

      {/* Said for every address, known or not. The API answers the same way on
          purpose, and a screen that only confirmed for real accounts would give
          away what the API refuses to. */}
      {sentTo === null || formError !== null ? null : (
        <p
          role="status"
          className="mt-6 rounded-md border border-border bg-surface-accent-subtle px-3 py-2 text-base text-content"
        >
          If {sentTo} has an account, a reset link is on its way. It expires shortly, and it can
          only be used once.
        </p>
      )}

      <Button type="submit" size="xl" fullWidth loading={pending} className="mt-[39px]">
        Continue
      </Button>
    </form>
  );
}
