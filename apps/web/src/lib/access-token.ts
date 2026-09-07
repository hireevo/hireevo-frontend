/**
 * The access token, held in memory and nowhere else.
 *
 * Not `localStorage`, not `sessionStorage`, not a readable cookie: anything a
 * script on the page can read, a script injected into the page can read too.
 * Module scope in the browser bundle means the token dies with the tab, which is
 * the intended behaviour — a reload asks the API for a new one using the
 * refresh cookie, which JavaScript cannot see at all.
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
