import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PasswordField } from './password-field.tsx';

describe('PasswordField', () => {
  it('masks the value until the toggle is pressed', async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Password" />);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');

    // The name has to flip too — "show password" on a visible password is a
    // worse instruction than none at all.
    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('reports the toggle state through aria-pressed', async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Password" />);

    const toggle = screen.getByRole('button');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('never submits the reveal toggle as a form button', () => {
    render(<PasswordField label="Password" />);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
});
