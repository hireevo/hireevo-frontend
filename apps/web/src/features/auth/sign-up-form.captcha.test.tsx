import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ApiModule from './api.ts';
import type { signUp } from './api.ts';
import type { RecaptchaHandle } from './recaptcha-checkbox.tsx';
import { SignUpForm } from './sign-up-form.tsx';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('./session.tsx', () => ({
  useSession: () => ({ status: 'anonymous', user: null, adopt: vi.fn(), signOut: vi.fn() }),
}));

// With protection switched on, the checkbox is present and must be solved before
// submit. The stub reports a token the instant it mounts — the same as a person
// ticking the box — and exposes the reset the form calls, so a test can watch
// whether a given outcome cost the person their solved challenge.
const resetSpy = vi.fn();
vi.mock('./recaptcha.ts', () => ({ recaptchaEnabled: true, recaptchaSiteKey: 'test-site-key' }));
vi.mock('./recaptcha-checkbox.tsx', () => ({
  RecaptchaCheckbox: forwardRef<RecaptchaHandle, { onChange: (token: string | null) => void }>(
    function Stub({ onChange }, ref) {
      useImperativeHandle(ref, () => ({ reset: resetSpy }), []);
      useEffect(() => {
        onChange('a-solved-token');
      }, [onChange]);
      return <div data-testid="captcha" />;
    },
  ),
}));

const signUpMock = vi.fn<typeof signUp>(() => Promise.resolve({ ok: true }));
vi.mock('./api.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiModule>()),
  isUsernameAvailable: () => Promise.resolve({ status: 'available' as const }),
  signUp: (...args: Parameters<typeof signUp>) => signUpMock(...args),
}));

const fillValid = async (
  user: ReturnType<typeof userEvent.setup>,
  { password = 'Str0ngPass', confirmPassword = 'Str0ngPass' } = {},
) => {
  await user.type(screen.getByLabelText('First Name'), 'Ada');
  await user.type(screen.getByLabelText('Last Name'), 'Lovelace');
  await user.type(screen.getByLabelText('E-mail'), 'ada@example.com');
  await user.type(screen.getByLabelText('User Name'), 'ada_l');
  await user.type(screen.getByLabelText('Password', { exact: true }), password);
  await user.type(screen.getByLabelText('Re-Password'), confirmPassword);
};

describe('SignUpForm reCAPTCHA lifecycle', () => {
  beforeEach(() => {
    resetSpy.mockClear();
    signUpMock.mockClear();
  });

  it('keeps the solved checkbox when submission fails client-side validation', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    // Passwords do not match: the request never leaves the browser, so the
    // reCAPTCHA token is not spent and the person must not have to solve it again.
    await fillValid(user, { confirmPassword: 'Different1' });
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(signUpMock).not.toHaveBeenCalled();
    expect(resetSpy).not.toHaveBeenCalled();
  });

  it('clears the checkbox once the server has rejected the attempt', async () => {
    signUpMock.mockResolvedValueOnce({ ok: false, message: 'Something went wrong.' });
    const user = userEvent.setup();
    render(<SignUpForm />);

    // A valid submission that the server refuses: the token reached siteverify and
    // is single-use, so the next attempt needs a fresh tick.
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(signUpMock).toHaveBeenCalledOnce();
    expect(resetSpy).toHaveBeenCalledOnce();
  });
});
