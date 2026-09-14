import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProfileBuilder } from './profile-builder.tsx';

const push = vi.fn<(href: string) => void>();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: push }) }));

vi.mock('@/features/auth/session.tsx', () => ({
  useSession: () => ({
    status: 'authenticated',
    user: { username: 'blacksmith90' },
    adopt: vi.fn(),
    signOut: vi.fn(),
  }),
}));

const bar = () => screen.getByRole('progressbar', { name: 'Profile completion' });

describe('ProfileBuilder', () => {
  it('opens in the state the design draws', () => {
    render(<ProfileBuilder />);

    expect(screen.getByText('Profile 20% complete')).toBeInTheDocument();
    expect(screen.getByText('1 of 5 key steps')).toBeInTheDocument();
    expect(bar()).toHaveAttribute('aria-valuenow', '20');
    expect(screen.getByText('@blacksmith90')).toBeInTheDocument();
    expect(screen.getByText('English · Conversational')).toBeInTheDocument();
  });

  it('counts a step the moment it is answered', async () => {
    const user = userEvent.setup();
    render(<ProfileBuilder />);

    await user.click(screen.getByRole('button', { name: 'Add details' }));
    await user.type(screen.getByLabelText('About you'), 'I build design systems.');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(bar()).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByText('2 of 5 key steps')).toBeInTheDocument();
  });

  it('gives back the step when the answer is removed again', async () => {
    const user = userEvent.setup();
    render(<ProfileBuilder />);

    await user.click(
      within(screen.getByRole('region', { name: /Skills and expertise/ })).getByRole('button', {
        name: 'Add skills and expertise',
      }),
    );
    await user.type(screen.getByLabelText('Add a skill'), 'Figma{Enter}');
    expect(bar()).toHaveAttribute('aria-valuenow', '40');

    await user.click(screen.getByRole('button', { name: 'Remove Figma' }));
    expect(bar()).toHaveAttribute('aria-valuenow', '20');
  });

  it('needs a name and a title together for the identity step', async () => {
    const user = userEvent.setup();
    render(<ProfileBuilder />);

    await user.click(screen.getByRole('button', { name: 'Add display name' }));
    await user.keyboard('Ayesha Khan{Enter}');
    expect(bar()).toHaveAttribute('aria-valuenow', '20');

    await user.click(screen.getByRole('button', { name: 'Add title' }));
    await user.keyboard('Product Designer{Enter}');
    expect(bar()).toHaveAttribute('aria-valuenow', '40');
  });

  it('leaves the bar alone for an optional section', async () => {
    const user = userEvent.setup();
    render(<ProfileBuilder />);

    await user.click(screen.getByRole('button', { name: 'Add work experience' }));
    await user.type(screen.getByLabelText('Role'), 'Product Designer');
    await user.type(screen.getByLabelText('Company'), 'Acme');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Product Designer · Acme')).toBeInTheDocument();
    // Marked "(Optional)" in the design, and not one of the five key steps.
    expect(bar()).toHaveAttribute('aria-valuenow', '20');
  });

  it('will not save a record that has no name', async () => {
    const user = userEvent.setup();
    render(<ProfileBuilder />);

    await user.click(screen.getByRole('button', { name: 'Add education' }));
    await user.type(screen.getByLabelText('Degree or program'), 'BSc');

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.type(screen.getByLabelText('Institution'), 'NUST');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('removes a language from the header', async () => {
    const user = userEvent.setup();
    render(<ProfileBuilder />);

    await user.click(screen.getByRole('button', { name: 'Remove English' }));

    expect(screen.queryByText('English · Conversational')).not.toBeInTheDocument();
    expect(bar()).toHaveAttribute('aria-valuenow', '0');
  });

  it('will not offer a language that is already on the profile', async () => {
    const user = userEvent.setup();
    render(<ProfileBuilder />);

    await user.click(screen.getByRole('button', { name: 'Add languages' }));
    const options = within(screen.getByLabelText('Language')).getAllByRole('option');

    expect(options.map((option) => option.textContent)).not.toContain('English');
  });

  it('saves and moves on when Continue is pressed', async () => {
    const user = userEvent.setup();
    render(<ProfileBuilder />);

    await user.click(screen.getByRole('button', { name: /Continue/ }));

    await expect.poll(() => push.mock.calls.at(-1)?.[0]).toBe('/dashboard');
  });
});
