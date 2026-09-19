import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ApiModule from './api.ts';
import type { signIn } from './api.ts';
import type { RecaptchaHandle } from './recaptcha-checkbox.tsx';
import { SignInForm } from './sign-in-form.tsx';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('./session.tsx', () => ({
  useSession: () => ({ status: 'anonymous', user: null, adopt: vi.fn(), signOut: vi.fn() }),
}));

// Protection on: the checkbox is present and must be solved before submit. The
// stub reports a token the instant it mounts — as a person ticking the box —
// and exposes the reset the form calls, so a test can watch whether an outcome
// cost the person their solved challenge.
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

const signInMock = vi.fn<typeof signIn>(() =>
  Promise.resolve({ ok: true, redirectTo: '/account' as never }),
);
vi.mock('./api.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiModule>()),
  signIn: (...args: Parameters<typeof signIn>) => signInMock(...args),
}));

describe('SignInForm reCAPTCHA lifecycle', () => {
  beforeEach(() => {
    resetSpy.mockClear();
    signInMock.mockClear();
  });

  it('sends the solved token to the API as a header argument', async () => {
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.type(screen.getByLabelText('E-mail'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'Str0ngPass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(signInMock).toHaveBeenCalledWith(expect.anything(), 'a-solved-token');
  });

  it('keeps the solved checkbox when submission fails client-side validation', async () => {
    const user = userEvent.setup();
    render(<SignInForm />);

    // A malformed email is rejected before the request leaves the browser, so
    // the token is not spent and the person must not solve the captcha again.
    await user.type(screen.getByLabelText('E-mail'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'Str0ngPass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(signInMock).not.toHaveBeenCalled();
    expect(resetSpy).not.toHaveBeenCalled();
  });

  it('clears the checkbox once the server has rejected the attempt', async () => {
    signInMock.mockResolvedValueOnce({ ok: false, message: 'Those details did not match.' });
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.type(screen.getByLabelText('E-mail'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'Str0ngPass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(signInMock).toHaveBeenCalledOnce();
    expect(resetSpy).toHaveBeenCalledOnce();
  });
});
