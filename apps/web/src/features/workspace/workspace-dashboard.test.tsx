import type { AuthenticatedUser } from '@hireevo/api-client';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DESIGN_SNAPSHOT } from './design-fixture.ts';
import { workspaceSnapshot } from './snapshot.ts';
import { WorkspaceDashboard } from './workspace-dashboard.tsx';

// Links render as the anchors they become; `next/link` needs a router a unit
// test has no reason to build. The logo is only checked for its name.
vi.mock('next/link', () => ({
  default: (props: ComponentProps<'a'>) => <a {...props} />,
}));
vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

const ayesha: AuthenticatedUser = {
  id: 'u1',
  email: 'ayesha@example.com',
  firstName: 'Ayesha',
  lastName: 'Khan',
  username: 'ayesha',
  status: 'active',
  emailVerified: true,
  roles: [],
  permissions: [],
};

const renderReal = (onSignOut = vi.fn()) => {
  render(<WorkspaceDashboard snapshot={workspaceSnapshot(ayesha)} onSignOut={onSignOut} />);
  return { onSignOut, user: userEvent.setup() };
};

describe('WorkspaceDashboard with the design preview content', () => {
  it('draws everything the design file draws', () => {
    render(<WorkspaceDashboard snapshot={DESIGN_SNAPSHOT} onSignOut={null} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Your market-ready foundation',
    );
    for (const title of [
      'Public benefits eligibility service redesign',
      'See allowance, renewal and reset state',
      'Draft, preview and publish a versioned brief',
      'You’re nearly market-ready',
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    expect(screen.getByRole('progressbar', { name: 'Profile strength' })).toHaveAttribute(
      'aria-valuenow',
      '60',
    );
    expect(screen.getByRole('switch', { name: 'Available' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('12 of 15 bids left this month')).toBeInTheDocument();
  });

  it('shows an action with nowhere to go as text, never as a link', () => {
    render(<WorkspaceDashboard snapshot={DESIGN_SNAPSHOT} onSignOut={null} />);
    expect(screen.queryByRole('link', { name: /Review membership/ })).not.toBeInTheDocument();
    expect(screen.getByText('Review membership')).toBeInTheDocument();
  });

  it('reads each count with its subject', () => {
    render(<WorkspaceDashboard snapshot={DESIGN_SNAPSHOT} onSignOut={null} />);
    expect(
      screen.getByText(
        (_, element) => element?.tagName === 'P' && element.textContent === '0 Skills',
      ),
    ).toBeInTheDocument();
  });

  it('has no account menu when there is no one to sign out', () => {
    render(<WorkspaceDashboard snapshot={DESIGN_SNAPSHOT} onSignOut={null} />);
    expect(screen.queryByRole('button', { name: /Account menu/ })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Design preview' })).toBeInTheDocument();
  });
});

describe('WorkspaceDashboard for a signed-in user', () => {
  it('links only to screens that exist', () => {
    renderReal();
    for (const link of screen.getAllByRole('link')) {
      expect(['/dashboard', '/client-profile', '/account']).toContain(link.getAttribute('href'));
    }
    expect(screen.queryByText(/not available yet/)).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getAllByText('Coming soon')).toHaveLength(2);
  });

  it('opens the navigation menu and closes it on Escape, back on its button', async () => {
    const { user } = renderReal();
    expect(screen.getAllByRole('navigation', { name: 'Workspace' })).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getAllByRole('navigation', { name: 'Workspace' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await user.keyboard('{Escape}');
    expect(screen.getAllByRole('navigation', { name: 'Workspace' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();
  });

  it('signs out from the account menu', async () => {
    const { onSignOut, user } = renderReal();

    await user.click(screen.getByRole('button', { name: 'Account menu for Ayesha Khan' }));
    const menuButton = screen.getByRole('button', { name: 'Account menu for Ayesha Khan' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it('closes the account menu on Escape without dropping focus', async () => {
    const { user } = renderReal();
    const menuButton = screen.getByRole('button', { name: 'Account menu for Ayesha Khan' });

    await user.click(menuButton);
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
    expect(menuButton).toHaveFocus();
  });

  it('closes the account menu on a click elsewhere', async () => {
    const { user } = renderReal();
    await user.click(screen.getByRole('button', { name: 'Account menu for Ayesha Khan' }));
    await user.click(screen.getByRole('heading', { level: 1 }));
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it('starts profile strength from nothing, because nothing is stored yet', () => {
    renderReal();
    const card = screen.getByRole('region', { name: 'Start your market-ready profile' });
    expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(within(card).getByRole('link', { name: /Complete your profile/ })).toHaveAttribute(
      'href',
      '/client-profile',
    );
  });
});
