import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type * as ApiModule from './api.ts';
import type { isUsernameAvailable, signUp } from './api.ts';
import { SignUpForm } from './sign-up-form.tsx';

// The form links to /recover. `next/link` needs an App Router context that a
// unit test has no reason to build, so it renders as the anchor it becomes.
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// Same reasoning for the router: this file is about what the form does with a
// submission, and a successful one navigates. The push is recorded rather than
// performed so the assertion can be about where it would have gone.
const push = vi.fn<(href: string) => void>();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: push }) }));

// The session is a real provider that spends the refresh cookie on mount, which
// means a network call. The form only needs somewhere to hand a session it was
// given, so it gets a stub.
vi.mock('./session.tsx', () => ({
  useSession: () => ({ status: 'anonymous', user: null, adopt: vi.fn(), signOut: vi.fn() }),
}));

// The form talks to the API in two places: the username field asks whether a
// handle is free when it loses focus, and submitting registers. Both are stubbed
// — these cases are about what the form does with an answer, not about getting
// one, and left real every case here would make a request.
const signUpMock = vi.fn<typeof signUp>(() => Promise.resolve({ ok: true }));

// Returns the verdict shape the real function returns, so a change to that
// shape breaks here rather than passing silently against a stale stub.
const availabilityMock = vi.fn<typeof isUsernameAvailable>(() =>
  Promise.resolve({ status: 'available' as const }),
);
vi.mock('./api.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiModule>()),
  isUsernameAvailable: (...args: Parameters<typeof isUsernameAvailable>) =>
    availabilityMock(...args),
  signUp: (...args: Parameters<typeof signUp>) => signUpMock(...args),
}));

const fill = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText('First Name'), 'Ada');
  await user.type(screen.getByLabelText('Last Name'), 'Lovelace');
  await user.type(screen.getByLabelText('E-mail'), 'ada@example.com');
  await user.type(screen.getByLabelText('User Name'), 'ada_l');
};

describe('SignUpForm', () => {
  it('shows the password getting stronger as it is typed', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    expect(screen.getByRole('status')).toHaveTextContent('Password strength: empty');

    await user.type(screen.getByLabelText('Password'), 'ab');
    expect(screen.getByRole('status')).toHaveTextContent('Password strength: Weak');

    // length, upper + lower, a digit and a symbol — the strongest step.
    await user.type(screen.getByLabelText('Password'), 'Cdefg1!!');
    expect(screen.getByRole('status')).toHaveTextContent('Password strength: Strong');
  });

  it('does not complain until the form is submitted', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    await user.type(screen.getByLabelText('E-mail'), 'not-an-address');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription(
      'Enter a valid email address.',
    );
  });

  it('clears a field’s error as soon as it is edited', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByLabelText('First Name')).toHaveAttribute('aria-invalid', 'true');

    await user.type(screen.getByLabelText('First Name'), 'A');
    expect(screen.getByLabelText('First Name')).not.toHaveAttribute('aria-invalid');
  });

  it('reports mismatched passwords on the confirmation field', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    await fill(user);
    await user.type(screen.getByLabelText('Password'), 'Passw0rd!y');
    await user.type(screen.getByLabelText('Re-Password'), 'Passw0rd!z');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByLabelText('Re-Password')).toHaveAccessibleDescription(
      'Both passwords must match.',
    );
  });

  it('puts a rejected field’s message on that field, not only in the banner', async () => {
    signUpMock.mockResolvedValueOnce({
      ok: false,
      message: 'That username is already taken',
      fieldErrors: { username: 'That username is already taken' },
    });

    const user = userEvent.setup();
    render(<SignUpForm />);

    await fill(user);
    await user.type(screen.getByLabelText('Password'), 'Passw0rd!y');
    await user.type(screen.getByLabelText('Re-Password'), 'Passw0rd!y');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // On the field it can be fixed: a banner alone leaves the user to work out
    // which of six inputs the complaint is about.
    await expect
      .poll(() => screen.getByLabelText('User Name').getAttribute('aria-invalid'))
      .toBe('true');
    expect(screen.getByLabelText('User Name')).toHaveAccessibleDescription(/already taken/i);
  });

  it('surfaces a failure that belongs to no single field', async () => {
    signUpMock.mockResolvedValueOnce({
      ok: false,
      message: 'Too many attempts. Wait a few minutes and try again.',
    });

    const user = userEvent.setup();
    render(<SignUpForm />);

    await fill(user);
    await user.type(screen.getByLabelText('Password'), 'Passw0rd!y');
    await user.type(screen.getByLabelText('Re-Password'), 'Passw0rd!y');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/too many attempts/i);
  });

  it('will not submit a username the blur check already flagged as taken', async () => {
    // Bug: the field showed "already taken" but pressing the button still moved
    // the person to the code screen. The form must stop at the field instead.
    availabilityMock.mockResolvedValue({ status: 'taken' });
    signUpMock.mockClear();
    push.mockClear();

    const user = userEvent.setup();
    render(<SignUpForm />);

    // `fill` leaves the username field (to click the consent box), which is the
    // blur that runs the check and marks the name taken.
    await fill(user);
    await user.type(screen.getByLabelText('Password'), 'Passw0rd!y');
    await user.type(screen.getByLabelText('Re-Password'), 'Passw0rd!y');
    expect(await screen.findByText('User name is already taken')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(signUpMock).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();

    // Restore the default so later cases see an available handle.
    availabilityMock.mockResolvedValue({ status: 'available' });
  });

  it('sends the person on to confirmation once the account is accepted', async () => {
    signUpMock.mockResolvedValueOnce({ ok: true, redirectTo: '/confirm-email?email=a%40b.com' });

    const user = userEvent.setup();
    render(<SignUpForm />);

    await fill(user);
    await user.type(screen.getByLabelText('Password'), 'Passw0rd!y');
    await user.type(screen.getByLabelText('Re-Password'), 'Passw0rd!y');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await expect.poll(() => push.mock.calls.at(-1)?.[0]).toBe('/confirm-email?email=a%40b.com');
  });
});

describe('the username check', () => {
  it('says nothing while the field is too short to ask about', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);
    availabilityMock.mockClear();

    await user.type(screen.getByLabelText('User Name'), 'ab');
    await user.tab();

    expect(availabilityMock).not.toHaveBeenCalled();
  });

  it('reports a name that is already taken', async () => {
    const user = userEvent.setup();
    availabilityMock.mockResolvedValueOnce({ status: 'taken' });
    render(<SignUpForm />);

    await user.type(screen.getByLabelText('User Name'), 'ayesha');
    await user.tab();

    expect(await screen.findByText('User name is already taken')).toBeInTheDocument();
  });

  it('passes on the reason the server gives for refusing a name', async () => {
    // The server answers a reserved name with a 400 and a message. That is an
    // answer, not a failure to answer, so it reaches the field rather than
    // being swallowed and discovered only on submit.
    const user = userEvent.setup();
    availabilityMock.mockResolvedValueOnce({
      status: 'rejected',
      message: 'This username is reserved',
    });
    render(<SignUpForm />);

    await user.type(screen.getByLabelText('User Name'), 'admin');
    await user.tab();

    expect(await screen.findByText('This username is reserved')).toBeInTheDocument();
  });

  it('stays silent when the question could not be answered', async () => {
    // A dropped request or a rate limit must never read as "that name is
    // unavailable" — the person would rename for no reason.
    const user = userEvent.setup();
    availabilityMock.mockResolvedValueOnce({ status: 'unknown' });
    render(<SignUpForm />);

    await user.type(screen.getByLabelText('User Name'), 'ayesha');
    await user.tab();

    expect(screen.queryByText(/taken|reserved/i)).not.toBeInTheDocument();
  });
});
