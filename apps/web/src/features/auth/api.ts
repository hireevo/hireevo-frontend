import type { ConfirmEmailValues, RecoverValues, SignInValues, SignUpValues } from './schemas.ts';

/**
 * Field-level messages are keyed by the form field they belong to, so a
 * "username already taken" from the server lands under the username input
 * rather than in a banner the user has to map back onto a field themselves.
 */
export type AuthResult =
  { ok: true } | { ok: false; message: string; fieldErrors?: Record<string, string> };

/**
 * The single seam between these screens and the accounts API.
 *
 * The API lives in `hireevo-backend` and reaches this repository as a generated
 * client built from its published contract — that package does not exist yet,
 * so every call below reports the same thing rather than pretending to succeed.
 * Replacing these four bodies with client calls is the whole of the wiring
 * work; nothing in the screens themselves needs to change.
 */
const NOT_CONNECTED: AuthResult = {
  ok: false,
  message: 'Accounts are not connected yet. This screen is not wired to the API.',
};

export function signIn(_values: SignInValues): Promise<AuthResult> {
  return Promise.resolve(NOT_CONNECTED);
}

export function signUp(_values: SignUpValues): Promise<AuthResult> {
  return Promise.resolve(NOT_CONNECTED);
}

export function requestRecovery(_values: RecoverValues): Promise<AuthResult> {
  return Promise.resolve(NOT_CONNECTED);
}

export function confirmEmail(_values: ConfirmEmailValues): Promise<AuthResult> {
  return Promise.resolve(NOT_CONNECTED);
}

export function resendCode(): Promise<AuthResult> {
  return Promise.resolve(NOT_CONNECTED);
}
