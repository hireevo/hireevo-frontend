import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken, setAccessToken } from '@/lib/access-token.ts';
import { SessionProvider, useSession } from './session.tsx';

const post = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api.ts', () => ({ api: { POST: post } }));
vi.mock('@/lib/session-refresh.ts', () => ({
  refreshSession: refresh,
  onSessionEnded: () => () => undefined,
}));

const USER = {
  id: 'u1',
  email: 'ayesha@example.test',
  firstName: 'Ayesha',
  lastName: 'Khan',
  username: 'ayeshakhan',
  status: 'active',
  emailVerified: true,
  roles: ['freelancer'],
  permissions: [],
};

/** Shows what the session says, and offers the one control that ends it. */
function Probe() {
  const { status, signOut, signOutFailed } = useSession();
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="failed">{String(signOutFailed)}</p>
      <button type="button" onClick={() => void signOut()}>
        Sign out
      </button>
    </div>
  );
}

const open = async () => {
  const user = userEvent.setup();
  render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
  return user;
};

describe('signing out', () => {
  beforeEach(() => {
    post.mockReset();
    refresh.mockReset().mockResolvedValue({ accessToken: 'live-token', user: USER });
    setAccessToken('live-token');
  });

  it('ends the session here once the server says it has ended it', async () => {
    post.mockResolvedValue({ response: { ok: true, status: 200 } });
    const user = await open();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    expect(getAccessToken()).toBeNull();
    expect(screen.getByTestId('failed')).toHaveTextContent('false');
  });

  /**
   * The reported bug: Sign out appeared to work, the sign-in screen showed for
   * a moment, and the next page load put the person straight back into their
   * profile.
   *
   * The call had not reached the server, and the failure was swallowed. This
   * tab turned anonymous while the refresh cookie — which this code cannot see
   * and cannot delete — stayed valid for another thirty days, so the next
   * restore signed them back in. Being told is now the condition for ending it
   * here, which is the only honest reading: on a shared computer a sign-out
   * that silently did nothing is worse than one that says it could not.
   */
  it('stays signed in, and says so, when the server could not be told', async () => {
    post.mockRejectedValue(new Error('network'));
    const user = await open();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(screen.getByTestId('failed')).toHaveTextContent('true'));
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(getAccessToken()).toBe('live-token');
  });

  /** A dropped request is the common case, so one is not taken as the answer. */
  it('asks a second time before giving up', async () => {
    post
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ response: { ok: true, status: 200 } });
    const user = await open();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    expect(post).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('failed')).toHaveTextContent('false');
  });

  /**
   * 401 is the state being asked for, not a failure: the session this was
   * ending has already ended. Treating it as one would strand somebody whose
   * session expired while they were reading the page.
   */
  it('counts a session that has already ended as signed out', async () => {
    post.mockResolvedValue({ response: { ok: false, status: 401 } });
    const user = await open();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    expect(post).toHaveBeenCalledTimes(1);
  });

  /**
   * The endpoint reads the refresh cookie for itself, and that cookie is what
   * keeps somebody signed in. Skipping the call because the access token
   * happened to be missing left the session running on the server.
   */
  it('asks the server even with no access token in memory', async () => {
    post.mockResolvedValue({ response: { ok: true, status: 200 } });
    const user = await open();
    act(() => setAccessToken(null));

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post).toHaveBeenCalledWith('/api/v1/auth/logout', {});
  });
});
