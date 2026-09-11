import type { ProfileDraft } from './draft.ts';

export type SaveResult = { ok: true } | { ok: false; message: string };

/**
 * The seam between the builder and the profiles API.
 *
 * The backend does expose the routes — `/api/v1/profiles`, `/profiles/me`,
 * `/profiles/me/publish` — but its published OpenAPI document describes them
 * with no request or response bodies, so the generated client in
 * `@hireevo/api-client` types every one of them as `content?: never`. Calling
 * them would mean hand-writing the shapes the contract is supposed to supply,
 * and a hand-edited client is exactly what the generated one exists to prevent.
 *
 * So the draft lives in the page until the backend documents those bodies and
 * the client is regenerated. At that point this file becomes two `api.PATCH`
 * calls and nothing above it changes.
 */
export function saveDraft(_draft: ProfileDraft): Promise<SaveResult> {
  return Promise.resolve({ ok: true });
}

/**
 * Uploads a chosen photo and answers with its stored URL.
 *
 * Until there is an endpoint, the object URL the browser made for the file is
 * what the page shows — correct for this tab and this session, and gone on
 * reload, which is the honest behaviour for something that was never sent.
 */
export function uploadAvatar(file: File): Promise<{ ok: true; url: string }> {
  return Promise.resolve({ ok: true, url: URL.createObjectURL(file) });
}
