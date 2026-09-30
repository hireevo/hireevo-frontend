import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminIdentity, roleLabel } from './admin-account.tsx';

afterEach(cleanup);

/**
 * The console's way out.
 *
 * The console shipped without one: its header named a person in its source and
 * offered nothing to press, so signing out of it meant clearing the cookie by
 * hand. These are about the disclosure behaving the way the workspace's does —
 * it opens, it leads somewhere, it closes from the keyboard, and it gives the
 * focus back (§6.8).
 */
describe('the console account menu', () => {
  const draw = (onSignOut: (() => void) | null) => {
    const user = userEvent.setup();
    render(
      <AdminIdentity
        name="Husnain Raza"
        role="Administrator"
        email="admin@hireevo.test"
        onSignOut={onSignOut}
      />,
    );
    return user;
  };

  it('names who is signed in, and opens on the initials', async () => {
    const user = draw(() => undefined);

    const button = screen.getByRole('button', { name: 'Account menu for Husnain Raza' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();

    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    // The address, not the name again: two accounts on one machine are told
    // apart by the address, and the name is already above.
    expect(screen.getByText('admin@hireevo.test')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Account settings' })).toHaveAttribute(
      'href',
      '/account',
    );
  });

  it('signs out when Sign out is pressed', async () => {
    const signOut = vi.fn();
    const user = draw(signOut);

    await user.click(screen.getByRole('button', { name: 'Account menu for Husnain Raza' }));
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  /**
   * Escape rather than only a click outside: a panel that covers part of the
   * page and can only be dismissed with a mouse is one a keyboard is stuck
   * behind, and focus dropped to the page is focus nobody can find again.
   */
  it('closes on Escape and hands the focus back', async () => {
    const user = draw(() => undefined);

    const button = screen.getByRole('button', { name: 'Account menu for Husnain Raza' });
    await user.click(button);
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('closes when something else on the page is pressed', async () => {
    const user = draw(() => undefined);

    await user.click(screen.getByRole('button', { name: 'Account menu for Husnain Raza' }));
    await user.click(document.body);

    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  /**
   * The preview has nobody to sign out, so it gets the name and no button —
   * a control that cannot do anything is one §6.7 asks to be removed rather
   * than drawn dead.
   */
  it('draws the name alone when there is nobody to sign out', () => {
    draw(null);

    expect(screen.getByRole('img', { name: 'Husnain Raza, Administrator' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('roleLabel', () => {
  it('calls the admin role an administrator', () => {
    expect(roleLabel(['admin'])).toBe('Administrator');
  });

  // The console opens on a permission, not on a role name, so a role granted
  // that permission tomorrow is named rather than called an administrator.
  it('names any other role it is opened by', () => {
    expect(roleLabel(['moderator'])).toBe('Moderator');
  });

  it('falls back when the account carries no role', () => {
    expect(roleLabel([])).toBe('Administrator');
  });
});
