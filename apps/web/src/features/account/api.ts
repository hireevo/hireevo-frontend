import { toApiError, toFieldIssues, type Schema } from '@hireevo/api-client';
import { api } from '@/lib/api.ts';

export type AccountSession = Schema<'SessionListResponse'>[number];

const UNREACHABLE = 'Could not reach HireEvo. Check your connection and try again.';

function messageOf(error: unknown): string {
  const envelope = toApiError(error);
  if (envelope === null) return UNREACHABLE;
  return envelope.code === 'RATE_LIMITED'
    ? 'Too many attempts. Wait a moment and try again.'
    : envelope.message;
}

export type ChangePasswordResult =
  { ok: true } | { ok: false; field: 'currentPassword' | 'newPassword' | null; message: string };

/**
 * Changing the password of the signed-in account.
 *
 * The API answers with a fresh pair of tokens, because changing a password ends
 * every other session — including, without this, the one doing the changing.
 * The client keeps its cookie either way; what matters here is telling the two
 * failures apart: a wrong current password belongs under that field, and
 * anything else is a message for the form.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  try {
    const { error, response } = await api.POST('/api/v1/auth/password/change', {
      body: { currentPassword, newPassword },
    });
    if (response.ok) return { ok: true };

    const issues = toFieldIssues(error);
    const first = issues[0];
    if (first !== undefined) {
      const field = first.path.split('.').at(-1);
      return {
        ok: false,
        field: field === 'currentPassword' || field === 'newPassword' ? field : null,
        message: first.message,
      };
    }

    // 401 here is the current password being wrong rather than the session
    // having expired: the request carried a token the API accepted.
    return {
      ok: false,
      field: response.status === 401 ? 'currentPassword' : null,
      message: messageOf(error),
    };
  } catch {
    return { ok: false, field: null, message: UNREACHABLE };
  }
}

export type SessionsResult =
  { ok: true; sessions: AccountSession[] } | { ok: false; message: string };

/** Every session this account has open, newest first, with this one marked. */
export async function listSessions(): Promise<SessionsResult> {
  try {
    const { data, error } = await api.GET('/api/v1/auth/sessions');
    if (data === undefined) return { ok: false, message: messageOf(error) };
    return { ok: true, sessions: [...data] };
  } catch {
    return { ok: false, message: UNREACHABLE };
  }
}

export type RevokeResult = { ok: true } | { ok: false; message: string };

/** Signs one other device out. The API refuses to end the session asking. */
export async function revokeSession(id: string): Promise<RevokeResult> {
  try {
    const { error, response } = await api.DELETE('/api/v1/auth/sessions/{id}', {
      params: { path: { id } },
    });
    return response.ok ? { ok: true } : { ok: false, message: messageOf(error) };
  } catch {
    return { ok: false, message: UNREACHABLE };
  }
}

/** Signs every other device out at once. */
export async function revokeOtherSessions(): Promise<RevokeResult> {
  try {
    const { error, response } = await api.DELETE('/api/v1/auth/sessions');
    return response.ok ? { ok: true } : { ok: false, message: messageOf(error) };
  } catch {
    return { ok: false, message: UNREACHABLE };
  }
}

// ------------------------------------------------------- the account itself

export type UpdateNameResult =
  | { ok: true; user: Schema<'AuthenticatedUser'> }
  | { ok: false; field: 'firstName' | 'lastName' | null; message: string };

/**
 * Changing the name on the account.
 *
 * Both fields are sent every time the box is submitted, including as `null`
 * when one is cleared: the API leaves an absent field alone and clears an
 * explicit null, and a box that shows two inputs has to be able to empty
 * either of them.
 */
export async function updateName(
  firstName: string | null,
  lastName: string | null,
): Promise<UpdateNameResult> {
  try {
    const { data, error } = await api.PATCH('/api/v1/auth/me', { body: { firstName, lastName } });
    if (data !== undefined) return { ok: true, user: data };

    const first = toFieldIssues(error)[0];
    const field = first?.path.split('.').at(-1);
    return {
      ok: false,
      field: field === 'firstName' || field === 'lastName' ? field : null,
      message: first?.message ?? messageOf(error),
    };
  } catch {
    return { ok: false, field: null, message: UNREACHABLE };
  }
}

export type PendingEmailChange = Schema<'PendingEmailChange'>;

/** The address waiting to be confirmed, if one is. Never the code. */
export async function pendingEmailChange(): Promise<PendingEmailChange | null> {
  try {
    const { data } = await api.GET('/api/v1/auth/me/email-change');
    return data ?? null;
  } catch {
    return null;
  }
}

export type EmailChangeResult =
  | { ok: true; pending: PendingEmailChange }
  | { ok: false; field: 'newEmail' | 'currentPassword' | null; message: string };

/**
 * Asking to move the account to another address.
 *
 * Nothing changes yet: the API emails a code to the new address and tells the
 * old one that a change was asked for. A taken address answers 409 — which is
 * a deliberate choice on the API's side, not an oversight — so it is reported
 * under the field rather than as a form-wide failure.
 */
export async function requestEmailChange(
  newEmail: string,
  currentPassword: string,
): Promise<EmailChangeResult> {
  try {
    const { data, error, response } = await api.POST('/api/v1/auth/me/email-change', {
      body: { newEmail, currentPassword },
    });
    if (data !== undefined) return { ok: true, pending: data };

    const first = toFieldIssues(error)[0];
    const field = first?.path.split('.').at(-1);
    return {
      ok: false,
      field:
        field === 'newEmail' || field === 'currentPassword'
          ? field
          : response.status === 409
            ? 'newEmail'
            : null,
      message: first?.message ?? messageOf(error),
    };
  } catch {
    return { ok: false, field: null, message: UNREACHABLE };
  }
}

export type ConfirmEmailResult =
  { ok: true; user: Schema<'AuthenticatedUser'> } | { ok: false; message: string };

/**
 * Finishing the move with the code sent to the new address.
 *
 * Succeeding ends every session, including this one — the credential that
 * identifies the account has changed — so the caller has to send the person
 * somewhere that does not need a session.
 */
export async function confirmEmailChange(code: string): Promise<ConfirmEmailResult> {
  try {
    const { data, error } = await api.POST('/api/v1/auth/me/email-change/confirm', {
      body: { code },
    });
    if (data !== undefined) return { ok: true, user: data };

    const first = toFieldIssues(error)[0];
    return { ok: false, message: first?.message ?? messageOf(error) };
  } catch {
    return { ok: false, message: UNREACHABLE };
  }
}

export type DeactivateResult =
  { ok: true } | { ok: false; field: 'currentPassword' | null; message: string };

/** Turning the account off. Reversible: signing in again brings it back. */
export async function deactivateAccount(currentPassword: string): Promise<DeactivateResult> {
  try {
    const { data, error } = await api.POST('/api/v1/auth/me/deactivate', {
      body: { currentPassword },
    });
    if (data !== undefined) return { ok: true };

    const first = toFieldIssues(error)[0];
    const field = first?.path.split('.').at(-1);
    return {
      ok: false,
      field: field === 'currentPassword' ? field : null,
      message: first?.message ?? messageOf(error),
    };
  } catch {
    return { ok: false, field: null, message: UNREACHABLE };
  }
}
