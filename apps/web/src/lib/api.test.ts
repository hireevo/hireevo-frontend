import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The client middleware is registered as a side effect of importing ./api, so
// the api-client is mocked to capture what gets passed to `.use`, and the
// session-refresh helpers are mocked so each branch can be driven.
const { captured, refreshSession, notifySessionEnded } = vi.hoisted(() => ({
  captured: [] as Array<{
    onRequest: (ctx: { request: Request }) => Request | undefined;
    onResponse: (ctx: { request: Request; response: Response }) => Promise<Response | undefined>;
  }>,
  refreshSession: vi.fn(),
  notifySessionEnded: vi.fn(),
}));

vi.mock('@hireevo/api-client', () => ({
  createApiClient: () => ({
    use: (middleware: (typeof captured)[number]) => captured.push(middleware),
  }),
}));
vi.mock('@/env', () => ({ env: { NEXT_PUBLIC_API_URL: 'https://api.example.com/' } }));
vi.mock('./access-token.ts', () => ({ getAccessToken: () => null }));
vi.mock('./session-refresh.ts', () => ({ refreshSession, notifySessionEnded }));

await import('./api');
const middleware = captured[0]!;

const ACCOUNT = 'https://api.example.com/api/v1/account';

/** Runs onRequest (which stores the replayable clone) then onResponse. */
async function respondTo(url: string, status: number): Promise<Response | undefined> {
  const request = new Request(url, { headers: { authorization: 'Bearer old' } });
  middleware.onRequest({ request });
  return middleware.onResponse({ request, response: new Response(null, { status }) });
}

beforeEach(() => {
  refreshSession.mockReset();
  notifySessionEnded.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('the api client 401-retry middleware', () => {
  it('lets a non-401 response pass through untouched', async () => {
    const result = await respondTo(ACCOUNT, 200);
    expect(result).toBeUndefined();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('does not retry a 401 from the auth endpoints themselves', async () => {
    const result = await respondTo('https://api.example.com/api/v1/auth/login', 401);
    expect(result).toBeUndefined();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('refreshes once and replays the request with the new token on a 401', async () => {
    refreshSession.mockResolvedValue({ accessToken: 'fresh', user: { id: 'u1' } });
    const replayed = new Response('ok', { status: 200 });
    const fetchMock = vi.fn().mockResolvedValue(replayed);
    vi.stubGlobal('fetch', fetchMock);

    const result = await respondTo(ACCOUNT, 401);

    expect(refreshSession).toHaveBeenCalledOnce();
    expect(result).toBe(replayed);
    const sent = fetchMock.mock.calls[0]![0] as Request;
    expect(sent.headers.get('authorization')).toBe('Bearer fresh');
    expect(notifySessionEnded).not.toHaveBeenCalled();
  });

  it('turns the session anonymous when the refresh fails', async () => {
    refreshSession.mockResolvedValue(null);
    const result = await respondTo(ACCOUNT, 401);

    expect(result).toBeUndefined();
    expect(notifySessionEnded).toHaveBeenCalledOnce();
  });

  it('does not retry a 401 for a request it never saw go out', async () => {
    // onResponse without a prior onRequest: nothing to replay.
    const request = new Request(ACCOUNT);
    const result = await middleware.onResponse({
      request,
      response: new Response(null, { status: 401 }),
    });
    expect(result).toBeUndefined();
    expect(refreshSession).not.toHaveBeenCalled();
  });
});
