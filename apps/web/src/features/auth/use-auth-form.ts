'use client';

import { useCallback, useState } from 'react';
import type { ZodType } from 'zod';
import type { AuthResult } from './api.ts';

export type FieldErrors = Record<string, string>;

/** First message per field. A field showing three complaints at once reads as noise. */
function byField(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key !== 'string' || key in errors) continue;
    errors[key] = issue.message;
  }
  return errors;
}

/**
 * Validation, pending state and error placement for the auth forms.
 *
 * Validation runs on submit rather than on every keystroke: telling someone
 * their email is invalid while they are still on the third character of it is
 * the single most common way a form feels hostile. Once a field has been
 * marked, though, its error clears as soon as it is edited.
 */
export function useAuthForm<Values>(
  schema: ZodType<Values>,
  submit: (values: Values) => Promise<AuthResult>,
) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const clearField = useCallback((name: string) => {
    setFieldErrors((current) => {
      if (!(name in current)) return current;
      const { [name]: _removed, ...rest } = current;
      return rest;
    });
  }, []);

  const run = useCallback(
    async (raw: unknown) => {
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        setFieldErrors(byField(parsed.error.issues));
        setFormError(null);
        return;
      }

      setFieldErrors({});
      setFormError(null);
      setPending(true);
      const result = await submit(parsed.data);
      setPending(false);

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.message);
      }
    },
    [schema, submit],
  );

  return { fieldErrors, formError, pending, run, clearField };
}
