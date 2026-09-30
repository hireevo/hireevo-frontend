import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signIn } from './api.ts';

const client = vi.hoisted(() => ({ POST: vi.fn() }));
vi.mock('@/lib/api.ts', () => ({ api: client }));

const answered = (permissions: string[]) => ({
  data: {
    accessToken: 'a-token',
    user: { id: 'u1', email: 'someone@example.com', roles: ['x'], permissions },
  },
  error: undefined,
  response: { status: 200 },
});

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Where a sign-in sends somebody.
 *
 * This is the seam the bug lived in. The destination was decided in two places
 * and was right in one: the auth pages knew about the console, and `signIn`
 * returned `/client-profile` for everybody — so an administrator signing in
 * landed on a client profile they do not have, and the screen said "you do not
 * have access to this resource". A unit test of the helper alone would not have
 * caught that; what had to be asserted is that this function asks it.
 */
describe('signing in', () => {
  it('sends somebody who may moderate to the console', async () => {
    client.POST.mockResolvedValueOnce(answered(['admin.user.read', 'admin.user.restrict']));

    const result = await signIn({
      email: 'admin@example.com',
      password: 'whatever',
      remember: true,
    });

    expect(result).toMatchObject({ ok: true, redirectTo: '/admin/workers' });
  });

  it('sends everybody else to their own profile', async () => {
    client.POST.mockResolvedValueOnce(answered(['profile.write.own']));

    const result = await signIn({
      email: 'worker@example.com',
      password: 'whatever',
      remember: true,
    });

    expect(result).toMatchObject({ ok: true, redirectTo: '/client-profile' });
  });
});
