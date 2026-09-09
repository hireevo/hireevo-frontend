import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type * as ApiModule from './api.ts';
import type { resetPassword } from './api.ts';
import { ResetPasswordForm } from './reset-password-form.tsx';

// The form links to /recover. `next/link` needs an App Router context that a
// unit test has no reason to build, so it renders as the anchor it becomes.
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const push = vi.fn<(href: string) => void>();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: push }) }));

vi.mock('./session.tsx', () => ({
  useSession: () => ({ status: 'anonymous', user: null, adopt: vi.fn(), signOut: vi.fn() }),
}));

const resetMock = vi.fn<typeof resetPassword>(() =>
  Promise.resolve({ ok: true, redirectTo: '/sign-in?reset=1' as never }),
);
vi.mock('./api.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiModule>()),
  resetPassword: (...args: Parameters<typeof resetPassword>) => resetMock(...args),
}));

describe('the reset password form', () => {
  it('shows the fields and the action the design draws', () => {
    render(<ResetPasswordForm token="a-token" />);

    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forgot Password?' })).toHaveAttribute(
      'href',
      '/recover',
    );
  });

  it('has no "remember me" control', () => {
    // The frame draws one, copied from sign-in. This screen creates no session
    // — resetting revokes every one — so the checkbox would change nothing, and
    // a control that does nothing is worse than an absent one.
    render(<ResetPasswordForm token="a-token" />);

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/remember me/i)).not.toBeInTheDocument();
  });

  it('marks each rule as met only once the password satisfies it', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm token="a-token" />);

    const notMet = () => screen.queryAllByText('— not met yet').length;
    expect(notMet()).toBe(4);

    // Punctuation only, so it satisfies the length rule and nothing else —
    // letters would quietly satisfy the lowercase rule too and make this
    // assertion about two rules while claiming to be about one.
    await user.type(screen.getByLabelText('New Password'), '!!!!!!!!');
    expect(notMet()).toBe(3);

    await user.clear(screen.getByLabelText('New Password'));
    await user.type(screen.getByLabelText('New Password'), 'Passw0rdish');
    expect(notMet()).toBe(0);
  });

  it('states each rule in text, not only by the colour of its mark', () => {
    // The design separates met from unmet by fill alone, which is the one cue a
    // colour-blind user does not get.
    render(<ResetPasswordForm token="a-token" />);

    expect(screen.getAllByText(/— (met|not met yet)/)).toHaveLength(4);
  });

  it('sends the token it was given along with the new password', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm token="the-emailed-token" />);

    await user.type(screen.getByLabelText('New Password'), 'Passw0rdish');
    await user.type(screen.getByLabelText('Confirm New Password'), 'Passw0rdish');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(resetMock).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'the-emailed-token', password: 'Passw0rdish' }),
    );
  });

  it('refuses a confirmation that does not match, without calling the API', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm token="a-token" />);
    resetMock.mockClear();

    await user.type(screen.getByLabelText('New Password'), 'Passw0rdish');
    await user.type(screen.getByLabelText('Confirm New Password'), 'Passw0rdother');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(resetMock).not.toHaveBeenCalled();
  });
});
