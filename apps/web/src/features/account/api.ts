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
