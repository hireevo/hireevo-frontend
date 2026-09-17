'use client';

import type { FormEvent } from 'react';
import { Button, TextField } from '@hireevo/ui-web';
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
    void run({ email: data.get('email') });
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
      className="mt-[calc(20px+0.19*var(--fit))] flex flex-col lg:-mr-[5px]"
    >
      <TextField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="example@gmail.com"
        error={fieldErrors.email}
        onChange={() => clearField('email')}
      />

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
        className="mt-[calc(20px+0.16*var(--fit))]"
      >
        Continue
      </Button>
    </form>
  );
}
