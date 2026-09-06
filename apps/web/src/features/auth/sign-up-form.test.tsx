import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SignUpForm } from './sign-up-form.tsx';

// The form links to /recover. `next/link` needs an App Router context that a
// unit test has no reason to build, so it renders as the anchor it becomes.
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const fill = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText('First Name'), 'Ada');
  await user.type(screen.getByLabelText('Last Name'), 'Lovelace');
  await user.type(screen.getByLabelText('E-mail'), 'ada@example.com');
  await user.type(screen.getByLabelText('User Name'), 'ada_l');
};

describe('SignUpForm', () => {
  it('ticks each password rule as the password satisfies it', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    expect(screen.getByText('At least 8 characters').textContent).toContain('not met yet');

    await user.type(screen.getByLabelText('Password'), 'abcdefgh');
    expect(screen.getByText('At least 8 characters').textContent).toContain('— met');
    expect(screen.getByText('At least 1 uppercase letter').textContent).toContain('not met yet');

    await user.type(screen.getByLabelText('Password'), 'A1');
    expect(screen.getByText('At least 1 uppercase letter').textContent).toContain('— met');
    expect(screen.getByText('At least 1 number').textContent).toContain('— met');
  });

  it('does not complain until the form is submitted', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    await user.type(screen.getByLabelText('E-mail'), 'not-an-address');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription(
      'Enter a valid email address.',
    );
  });

  it('clears a field’s error as soon as it is edited', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(screen.getByLabelText('First Name')).toHaveAttribute('aria-invalid', 'true');

    await user.type(screen.getByLabelText('First Name'), 'A');
    expect(screen.getByLabelText('First Name')).not.toHaveAttribute('aria-invalid');
  });

  it('reports mismatched passwords on the confirmation field', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    await fill(user);
    await user.type(screen.getByLabelText('Password'), 'Passw0rdy');
    await user.type(screen.getByLabelText('Re-Password'), 'Passw0rdz');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByLabelText('Re-Password')).toHaveAccessibleDescription(
      'Both passwords must match.',
    );
  });

  it('surfaces a whole-form failure once validation passes', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    await fill(user);
    await user.type(screen.getByLabelText('Password'), 'Passw0rdy');
    await user.type(screen.getByLabelText('Re-Password'), 'Passw0rdy');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    // The accounts API is not wired up yet, so the seam reports that rather
    // than the screen pretending the account was created.
    expect(await screen.findByRole('alert')).toHaveTextContent('Accounts are not connected yet');
  });
});
