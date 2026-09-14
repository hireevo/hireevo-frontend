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

const DESIGN_TITLES = [
  'Public benefits eligibility service redesign',
  'See allowance, renewal and reset state',
  'Draft, preview and publish a versioned brief',
  'You’re nearly market-ready',
];

/** The open panel of a header dropdown, found through its button's aria-controls. */
const panelOf = (trigger: HTMLElement) => {
  const id = trigger.getAttribute('aria-controls');
  const panel = id === null ? null : document.getElementById(id);
  if (panel === null) throw new Error('the dropdown is not open');
  return within(panel);
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
    for (const title of DESIGN_TITLES) {
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

  it('draws an action with nowhere to go as the design does, but not as a link', () => {
    render(<WorkspaceDashboard snapshot={DESIGN_SNAPSHOT} onSignOut={null} />);
    expect(screen.queryByRole('link', { name: /Review membership/ })).not.toBeInTheDocument();
    expect(screen.getByText('Review membership')).toHaveClass('underline');
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
  it('draws the designed dashboard', () => {
    renderReal();
    for (const title of DESIGN_TITLES) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    expect(screen.getByRole('progressbar', { name: 'Profile strength' })).toHaveAttribute(
      'aria-valuenow',
      '60',
    );
    expect(screen.getByRole('switch', { name: 'Available' })).toBeInTheDocument();
    expect(screen.getByText('12 of 15 bids left this month')).toBeInTheDocument();
  });

  it('puts the signed-in person in the avatar', () => {
    renderReal();
    expect(screen.getByRole('button', { name: 'Account menu for Ayesha Khan' })).toHaveTextContent(
      'AK',
    );
    expect(screen.queryByText('DP')).not.toBeInTheDocument();
  });

  it('links only to screens that exist', () => {
    renderReal();
    for (const link of screen.getAllByRole('link')) {
      expect(['/dashboard', '/client-profile', '/account']).toContain(link.getAttribute('href'));
    }
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
    expect(screen.getByRole('button', { name: 'Account menu for Ayesha Khan' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

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
});

describe('the header dropdowns', () => {
  it('opens Profile with its entries, linking only what exists', async () => {
    const { user } = renderReal();
    const profile = screen.getByRole('button', { name: 'Profile' });

    await user.click(profile);
    expect(profile).toHaveAttribute('aria-expanded', 'true');
    const panel = panelOf(profile);
    expect(panel.getByRole('link', { name: 'Edit profile' })).toHaveAttribute(
      'href',
      '/client-profile',
    );
    // Listed so the menu shows what is coming, but not a link to a 404.
    expect(panel.getByText('View public profile')).toBeInTheDocument();
    expect(panel.queryByRole('link', { name: /View public profile/ })).not.toBeInTheDocument();
    expect(panel.getAllByText('Soon')).toHaveLength(2);
  });

  it('keeps one dropdown open at a time', async () => {
    const { user } = renderReal();
    const profile = screen.getByRole('button', { name: 'Profile' });
    const projects = screen.getByRole('button', { name: 'Projects' });

    await user.click(profile);
    await user.click(projects);

    expect(profile).toHaveAttribute('aria-expanded', 'false');
    expect(projects).toHaveAttribute('aria-expanded', 'true');
    expect(panelOf(projects).getByText('Post a project brief')).toBeInTheDocument();
  });

  it('closes on Escape and puts focus back on its button', async () => {
    const { user } = renderReal();
    const projects = screen.getByRole('button', { name: 'Projects' });

    await user.click(projects);
    await user.keyboard('{Escape}');

    expect(projects).toHaveAttribute('aria-expanded', 'false');
    expect(projects).toHaveFocus();
  });

  it('closes on a click elsewhere', async () => {
    const { user } = renderReal();
    const account = screen.getByRole('button', { name: 'Account' });

    await user.click(account);
    await user.click(screen.getByRole('heading', { level: 1 }));

    expect(account).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes when focus tabs out past its last entry', async () => {
    const { user } = renderReal();
    const account = screen.getByRole('button', { name: 'Account' });

    await user.click(account);
    await user.tab(); // Account settings
    await user.tab(); // Sign out
    await user.tab(); // out of the dropdown

    expect(account).toHaveAttribute('aria-expanded', 'false');
  });

  it('goes to account settings, and signs out, from Account', async () => {
    const { onSignOut, user } = renderReal();
    const account = screen.getByRole('button', { name: 'Account' });

    await user.click(account);
    expect(panelOf(account).getByRole('link', { name: 'Account settings' })).toHaveAttribute(
      'href',
      '/account',
    );
    await user.click(panelOf(account).getByRole('button', { name: 'Sign out' }));

    expect(onSignOut).toHaveBeenCalledOnce();
    expect(account).toHaveAttribute('aria-expanded', 'false');
  });

  it('lists every dropdown’s entries under its name in the phone menu', async () => {
    const { user } = renderReal();

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const [, phoneMenu] = screen.getAllByRole('navigation', { name: 'Workspace' });
    if (phoneMenu === undefined) throw new Error('the phone menu did not open');

    for (const [group, entry] of [
      ['Profile', 'Edit profile'],
      ['Projects', 'Project workspace'],
      ['Account', 'Account settings'],
    ] as const) {
      expect(
        within(within(phoneMenu).getByRole('list', { name: group })).getByText(entry),
      ).toBeInTheDocument();
    }
  });

  it('shows sign-out as unavailable on the design preview, where no one is signed in', async () => {
    render(<WorkspaceDashboard snapshot={DESIGN_SNAPSHOT} onSignOut={null} />);
    const user = userEvent.setup();
    const account = screen.getByRole('button', { name: 'Account' });

    await user.click(account);

    expect(panelOf(account).queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
    expect(panelOf(account).getByText('Sign out')).toBeInTheDocument();
  });
});
