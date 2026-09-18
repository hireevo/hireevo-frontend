'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { ZodType } from 'zod';
import { UNREACHABLE, type AuthResult } from './api.ts';
import { useSession } from './session.tsx';

export type FieldErrors = Record<string, string>;

/**
 * Where a submit ended, for callers that must react differently to each.
 *
 * `invalid` means the values failed client-side validation and nothing was
 * sent; `failed` means the request left the browser and did not succeed; `ok`
 * means it did. The sign-up form uses the distinction to keep a solved
 * reCAPTCHA checkbox across a field typo — the token is only spent once the
 * request actually reaches the server.
 */
export type RunOutcome = 'ok' | 'invalid' | 'failed';

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
  const router = useRouter();
  const { adopt } = useSession();
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
    async (raw: unknown): Promise<RunOutcome> => {
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        setFieldErrors(byField(parsed.error.issues));
        setFormError(null);
        return 'invalid';
      }

      setFieldErrors({});
      setFormError(null);
      setPending(true);

      let result: AuthResult;
      try {
        result = await submit(parsed.data);
      } catch {
        // The submit threw rather than returning a failure — a dropped
        // connection or a backend that is down. The inputs keep what was typed,
        // so the person only has to press the button again once it is back.
        setPending(false);
        setFormError(UNREACHABLE);
        return 'failed';
      }

      if (!result.ok) {
        setPending(false);
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.message);
        return 'failed';
      }

      // A session that came back with the response is adopted before the
      // navigation, so the destination renders signed in rather than flashing
      // its anonymous state first.
      if (result.session !== undefined) {
        adopt(result.session.accessToken, result.session.user);
      }

      if (result.redirectTo !== undefined) {
        // Pending stays true across the navigation: releasing the button here
        // would let a second submit land while the next screen is still loading.
        router.push(result.redirectTo);
        return 'ok';
      }

      // No navigation: the screen shows the outcome in place, as the reset
      // screen does with its confirmation dialog.
      setPending(false);
      return 'ok';
    },
    [adopt, router, schema, submit],
  );

  return { fieldErrors, formError, pending, run, clearField };
}
