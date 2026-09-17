import type { Route } from 'next';
import { toApiError, toFieldIssues, type AuthenticatedUser } from '@hireevo/api-client';
import { api } from '@/lib/api.ts';
import { executeRecaptcha } from './recaptcha.ts';
import type {
  ConfirmEmailValues,
  RecoverValues,
  ResetPasswordValues,
  SignInValues,
  SignUpValues,
} from './schemas.ts';

/**
 * Field-level messages are keyed by the form field they belong to, so a
 * "username already taken" from the server lands under the username input
 * rather than in a banner the user has to map back onto a field themselves.
 */
export type AuthResult =
  | { ok: true; redirectTo?: Route; session?: { accessToken: string; user: AuthenticatedUser } }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** Shown when the request never reached the API, or came back unrecognisable. */
export const UNREACHABLE = 'Could not reach HireEvo. Check your connection and try again.';

/**
 * Turns a failed call into something a form can render.
 *
 * The API reports which field failed and why, so those messages are placed on
 * their fields; anything left over becomes the form-level message. A rate limit
 * is called out by name because "try again" is useless advice if the reason is
 * that you have already tried too often.
 */
function toResult(error: unknown, fieldMap: Record<string, string> = {}): AuthResult {
  const envelope = toApiError(error);
  if (envelope === null) return { ok: false, message: UNREACHABLE };

  const fieldErrors: Record<string, string> = {};
  for (const issue of toFieldIssues(error)) {
    const field = fieldMap[issue.path] ?? issue.path;
    fieldErrors[field] ??= issue.message;
  }

  const message =
    envelope.code === 'RATE_LIMITED'
      ? 'Too many attempts. Wait a few minutes and try again.'
      : envelope.message;

  return Object.keys(fieldErrors).length > 0
    ? { ok: false, message, fieldErrors }
    : { ok: false, message };
}

export async function signIn(values: SignInValues): Promise<AuthResult> {
  const { data, error } = await api.POST('/api/v1/auth/login', {
    body: { email: values.email, password: values.password },
  });

  if (error !== undefined || data === undefined) {
    // The API answers the same way for an unknown address and a wrong password,
    // so the message goes on the form rather than on either field: pointing at
    // one of them would claim knowledge the response deliberately withholds.
    return toResult(error);
  }

  return {
    ok: true,
    redirectTo: '/account',
    session: { accessToken: data.accessToken, user: data.user },
  };
}

export async function signUp(values: SignUpValues): Promise<AuthResult> {
  // A reCAPTCHA v3 token when protection is on, null otherwise. It rides as a
  // header rather than in the body, so the generated request type — and the
  // published contract — does not have to carry a field only bot-scoring uses.
  const captchaToken = await executeRecaptcha('signup');

  const { error } = await api.POST('/api/v1/auth/register', {
    body: {
      firstName: values.firstName,
      lastName: values.lastName,
      username: values.username,
      email: values.email,
      password: values.password,
      confirmPassword: values.confirmPassword,
    },
    ...(captchaToken === null ? {} : { headers: { 'x-captcha-token': captchaToken } }),
  });

  if (error !== undefined) return toResult(error);

  // Registration answers 202 whether or not the address was already taken, so
  // the next screen is the same either way — the person learns what happened
  // from the mail they do or do not receive.
  // `typedRoutes` checks the pathname, which is a literal here; the query
  // string it cannot know about is what needs the assertion.
  return {
    ok: true,
    redirectTo: `/confirm-email?email=${encodeURIComponent(values.email)}` as Route,
  };
}

export async function requestRecovery(values: RecoverValues): Promise<AuthResult> {
  const { error } = await api.POST('/api/v1/auth/password/forgot', {
    body: { email: values.email },
  });

  if (error !== undefined) return toResult(error);

  // The code screen follows for every address, known or not. The API answers
  // identically either way, and a screen that only moved on for real accounts
  // would give away what the API refuses to.
  return {
    ok: true,
    redirectTo: `/recover/verify?email=${encodeURIComponent(values.email)}` as Route,
  };
}

/** Sends a fresh recovery code; the screen's own countdown decides when it may. */
export async function resendResetCode(email: string): Promise<AuthResult> {
  try {
    const { error } = await api.POST('/api/v1/auth/password/forgot', { body: { email } });
    if (error !== undefined) return toResult(error);
  } catch {
    return { ok: false, message: UNREACHABLE };
  }
  return { ok: true };
}

/**
 * Spends the emailed recovery code and carries the grant it buys to the next
 * screen. The grant is single-use and lives ten minutes, so it is fine in the
 * address bar for the one hop it takes.
 */
export async function verifyResetCode(
  values: ConfirmEmailValues & { email: string },
): Promise<AuthResult> {
  const { data, error } = await api.POST('/api/v1/auth/password/verify-code', {
    body: { email: values.email, code: values.code },
  });

  if (error !== undefined || data === undefined) {
    return toResult(error, { code: 'code', email: 'code' });
  }

  return {
    ok: true,
    redirectTo: `/reset-password?token=${encodeURIComponent(data.resetToken)}` as Route,
  };
}

export async function confirmEmail(
  values: ConfirmEmailValues & { email: string },
): Promise<AuthResult> {
  const { error } = await api.POST('/api/v1/auth/verify-email', {
    body: { email: values.email, code: values.code },
  });

  if (error !== undefined) return toResult(error, { code: 'code', email: 'code' });

  // Confirming does not sign anyone in: a forwarded code must not become a
  // session, so the next step is a deliberate sign-in.
  return { ok: true, redirectTo: '/sign-in?confirmed=1' };
}

export async function resendCode(email: string): Promise<AuthResult> {
  try {
    const { error } = await api.POST('/api/v1/auth/resend-verification', { body: { email } });
    if (error !== undefined) return toResult(error);
  } catch {
    return { ok: false, message: UNREACHABLE };
  }
  return { ok: true };
}

export async function resetPassword(values: ResetPasswordValues): Promise<AuthResult> {
  const { error } = await api.POST('/api/v1/auth/password/reset', {
    body: { token: values.token, password: values.password },
  });

  if (error !== undefined) return toResult(error, { token: 'password' });

  // Resetting ends every session, including any the attacker holds, so there is
  // nothing to adopt. The screen stays put and shows the design's confirmation
  // dialog; its button is what moves the person on.
  return { ok: true };
}

/**
 * Whether a handle is free, for the live check under the username field.
 *
 * Returns `null` when the question could not be answered — a rate limit, a
 * dropped connection — so the field stays silent rather than claiming a name is
 * taken because the check failed.
 */
/**
 * What the server says about a handle, as three distinguishable answers.
 *
 * A boolean cannot carry all of them. The server refuses a reserved or
 * malformed name with a 400 and a reason, and that is an *answer* — collapsing
 * it into "could not check" throws away the one message the person needs, and
 * leaves them to discover it only when the form is submitted.
 */
export type UsernameVerdict =
  | { status: 'available' }
  | { status: 'taken' }
  /** The server refused the name outright and said why. */
  | { status: 'rejected'; message: string }
  /** No usable answer — a rate limit, a dropped connection. Say nothing. */
  | { status: 'unknown' };

export async function isUsernameAvailable(username: string): Promise<UsernameVerdict> {
  let data;
  let error: unknown;
  try {
    ({ data, error } = await api.GET('/api/v1/auth/username-available', {
      params: { query: { username } },
    }));
  } catch {
    // The request never reached the API. Say nothing rather than claim a name
    // is unavailable because the network dropped.
    return { status: 'unknown' };
  }

  if (error !== undefined) {
    const issue = toFieldIssues(error).find((candidate) => candidate.path === 'username');
    if (issue !== undefined) return { status: 'rejected', message: issue.message };

    // Anything else is the request failing rather than the name being refused,
    // and a network hiccup must never read as "that name is unavailable".
    return { status: 'unknown' };
  }

  if (data === undefined) return { status: 'unknown' };
  return data.available ? { status: 'available' } : { status: 'taken' };
}
