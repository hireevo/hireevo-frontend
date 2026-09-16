import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ProfileApi from '@/features/profile-setup/api.ts';
import type { OwnProfile } from '@/features/profile-setup/api.ts';
import { ProfileBuilder } from './profile-builder.tsx';

const push = vi.fn<(href: string) => void>();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: push }) }));

vi.mock('@/features/auth/session.tsx', () => ({
  useSession: () => ({
    status: 'authenticated',
    user: {
      username: 'blacksmith90',
      firstName: 'Ayesha',
      lastName: 'Khan',
      email: 'ayesha@example.com',
    },
    adopt: vi.fn(),
    signOut: vi.fn(),
  }),
}));

const calls = vi.hoisted(() => ({
  load: vi.fn<typeof ProfileApi.loadOrCreateProfile>(),
  save: vi.fn<typeof ProfileApi.saveIdentity>(),
}));
vi.mock('@/features/profile-setup/api.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof ProfileApi>()),
  loadOrCreateProfile: () => calls.load(),
  saveIdentity: (...args: Parameters<typeof ProfileApi.saveIdentity>) => calls.save(...args),
}));

const stored = (overrides: Partial<OwnProfile> = {}): OwnProfile =>
  ({
    id: 'p1',
    slug: 's1',
    status: 'draft',
    version: 3,
    completeness: 0,
    displayName: null,
    headline: null,
    overview: null,
    availabilityNote: null,
    locationCountry: null,
    locationRegion: null,
    locationCity: null,
    availability: null,
    rateAmountMinor: null,
    rateCurrency: null,
    ...overrides,
  }) as OwnProfile;

const bar = () => screen.getByRole('progressbar', { name: 'Profile completion' });
const section = (name: RegExp) => within(screen.getByRole('region', { name }));

const open = async () => {
  render(<ProfileBuilder />);
  const user = userEvent.setup();
  await screen.findByRole('progressbar', { name: 'Profile completion' });
  return user;
};

beforeEach(() => {
  push.mockReset();
  calls.load.mockReset().mockResolvedValue({ ok: true, profile: stored() });
  calls.save
    .mockReset()
    .mockImplementation((version, values) =>
      Promise.resolve({ ok: true, profile: stored({ ...values, version: version + 1 }) }),
    );
});

describe('ProfileBuilder', () => {
  it('opens on the account holder’s name, which is not saved until something is', async () => {
    await open();

    expect(
      screen.getByRole('button', { name: 'Edit display name: Ayesha Khan' }),
    ).toBeInTheDocument();
    expect(screen.getByText('@blacksmith90')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Not saved yet');
    expect(bar()).toHaveAttribute('aria-valuetext', '20 percent complete, 1 of 5 key steps');
    expect(calls.save).not.toHaveBeenCalled();
  });

  it('keeps the profile’s own display name when it has one', async () => {
    calls.load.mockResolvedValue({ ok: true, profile: stored({ displayName: 'Sophie Brandt' }) });
    await open();

    expect(
      screen.getByRole('button', { name: 'Edit display name: Sophie Brandt' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('All changes saved');
  });

  it('opens Identity and story where the About card was, and closes it once saved', async () => {
    const user = await open();

    await user.click(screen.getByRole('button', { name: 'Add details' }));

    const editor = within(await screen.findByRole('region', { name: /Identity and story/ }));
    await user.type(editor.getByLabelText('Biography'), 'I build design systems.');
    await user.click(editor.getByRole('button', { name: 'Save and close' }));

    await waitFor(() =>
      expect(calls.save.mock.calls.at(-1)?.[1]).toMatchObject({
        displayName: 'Ayesha Khan',
        overview: 'I build design systems.',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: /Identity and story/ })).not.toBeInTheDocument(),
    );
    expect(section(/About/).getByText('I build design systems.')).toBeInTheDocument();
    expect(bar()).toHaveAttribute('aria-valuenow', '40');
  });

  it('opens the skills editor inside its card and says it is not saved', async () => {
    const user = await open();

    await user.click(screen.getByRole('button', { name: 'Add skills and expertise' }));

    const skills = section(/Skills and expertise/);
    await user.type(await skills.findByLabelText('Skill'), 'Figma');
    expect(skills.getByText(/Not connected to your profile yet/)).toBeInTheDocument();
    expect(bar()).toHaveAttribute('aria-valuenow', '40');

    await user.click(skills.getByRole('button', { name: 'Done' }));
    expect(skills.getByText('Figma')).toBeInTheDocument();
    expect(skills.queryByLabelText('Skill')).not.toBeInTheDocument();
  });

  it('opens the designed editor for work experience', async () => {
    const user = await open();

    await user.click(screen.getByRole('button', { name: 'Add work experience' }));

    const experience = section(/Work experience/);
    expect(await experience.findByRole('group', { name: 'Role 1' })).toBeInTheDocument();
    expect(experience.getByLabelText('Organization')).toBeInTheDocument();
    // Optional in the design, and not one of the five key steps.
    expect(bar()).toHaveAttribute('aria-valuenow', '20');
  });

  it('opens education and certifications separately, as the design draws them', async () => {
    const user = await open();

    await user.click(screen.getByRole('button', { name: 'Add education' }));
    expect(
      await section(/Education/).findByRole('group', { name: 'Institution 1' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add certifications' }));
    expect(
      await section(/Certifications/).findByRole('group', { name: 'License 1' }),
    ).toBeInTheDocument();
    // Opening one closes the other: two long forms at once is a page nobody reads.
    expect(
      section(/Education/).queryByRole('group', { name: 'Institution 1' }),
    ).not.toBeInTheDocument();
  });

  it('needs a name and a title together for the identity step', async () => {
    const user = await open();
    expect(bar()).toHaveAttribute('aria-valuenow', '20');

    await user.click(screen.getByRole('button', { name: 'Add title' }));
    await user.keyboard('Product Designer{Enter}');

    expect(bar()).toHaveAttribute('aria-valuenow', '40');
  });

  it('removes a language from the header', async () => {
    const user = await open();

    await user.click(screen.getByRole('button', { name: 'Remove English' }));

    expect(screen.queryByText('English · Conversational')).not.toBeInTheDocument();
    expect(bar()).toHaveAttribute('aria-valuenow', '0');
  });

  it('autosaves what is typed, with no separate save to press', async () => {
    const user = await open();

    await user.click(screen.getByRole('button', { name: 'Add title' }));
    await user.keyboard('Product Designer{Enter}');

    await waitFor(() =>
      expect(calls.save.mock.calls.at(-1)?.[1]).toMatchObject({ headline: 'Product Designer' }),
    );
    expect(screen.queryByRole('button', { name: /Continue/ })).not.toBeInTheDocument();
  });

  it('explains a profile that could not be loaded, and tries again', async () => {
    calls.load.mockResolvedValueOnce({ ok: false, message: 'Could not reach HireEvo.' });
    render(<ProfileBuilder />);
    const user = userEvent.setup();

    expect(await screen.findByText('Could not reach HireEvo.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('progressbar', { name: 'Profile completion' }),
    ).toBeInTheDocument();
  });
});
