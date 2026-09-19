import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
      id: 'user-1',
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
  save: vi.fn<typeof ProfileApi.saveProfile>(),
  skills: vi.fn<typeof ProfileApi.listSkills>(),
}));
vi.mock('@/features/profile-setup/api.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof ProfileApi>()),
  loadOrCreateProfile: () => calls.load(),
  saveProfile: (...args: Parameters<typeof ProfileApi.saveProfile>) => calls.save(...args),
  listSkills: (...args: Parameters<typeof ProfileApi.listSkills>) => calls.skills(...args),
}));

const NO_SECTIONS = {
  languages: [],
  skills: [],
  experience: [],
  education: [],
  licenses: [],
  portfolio: [],
};

const stored = (overrides: Partial<OwnProfile> = {}): OwnProfile =>
  ({
    id: 'p1',
    slug: 's1',
    status: 'draft',
    version: 3,
    completeness: 0,
    displayName: null,
    avatarUrl: null,
    headline: null,
    overview: null,
    availabilityNote: null,
    locationCountry: null,
    locationRegion: null,
    locationCity: null,
    serviceArea: null,
    timezone: null,
    remoteMode: null,
    availability: null,
    rateAmountMinor: null,
    rateCurrency: null,
    sections: NO_SECTIONS,
    visibility: {
      profilePublic: false,
      locationGranularity: 'hidden',
      sections: {
        nameHeadline: false,
        biography: false,
        location: false,
        languages: false,
        rate: false,
        skills: false,
        experience: false,
        education: false,
        licenses: false,
        availability: false,
      },
      searchIndexable: false,
    },
    ...overrides,
  }) as OwnProfile;

/** A profile with a language on it, for the chips beside the person's name. */
const withLanguage = () =>
  stored({ sections: { ...NO_SECTIONS, languages: [{ name: 'English', proficiency: null }] } });

const bar = () => screen.getByRole('progressbar', { name: 'Profile strength' });
const section = (name: RegExp) => within(screen.getByRole('region', { name }));

const open = async () => {
  render(<ProfileBuilder />);
  const user = userEvent.setup();
  await screen.findByRole('progressbar', { name: 'Profile strength' });
  return user;
};

/** Past the pause the draft waits for before it is written to this browser. */
const afterTheDraftIsWritten = () => new Promise((resolve) => setTimeout(resolve, 500));

beforeEach(() => {
  push.mockReset();
  window.localStorage.clear();
  calls.load.mockReset().mockResolvedValue({ ok: true, profile: stored() });
  calls.skills.mockReset().mockResolvedValue([
    { slug: 'accessibility', name: 'Accessibility', category: 'Design' },
    { slug: 'service-design', name: 'Service design', category: 'Design' },
  ]);
  calls.save.mockReset().mockImplementation((version, values) => {
    // The claimed photo is a key to send, not a field the profile answers with,
    // and a remote mode is one of three words rather than whatever was typed.
    const { avatarKey: _claimed, remoteMode: _mode, ...fields } = values;
    return Promise.resolve({ ok: true, profile: stored({ ...fields, version: version + 1 }) });
  });
});

describe('ProfileBuilder', () => {
  it('opens on the account holder’s name, which is not saved until Save is pressed', async () => {
    await open();

    expect(
      screen.getByRole('button', { name: 'Edit display name: Ayesha Khan' }),
    ).toBeInTheDocument();
    expect(screen.getByText('@blacksmith90')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Not saved yet');
    expect(bar()).toHaveAttribute('aria-valuetext', '0 percent complete, 0 of 6 steps done');
    expect(calls.save).not.toHaveBeenCalled();
  });

  it('opens on the sections the profile already holds', async () => {
    calls.load.mockResolvedValue({
      ok: true,
      profile: stored({
        displayName: 'Sophie Brandt',
        locationCountry: 'AT',
        sections: {
          ...NO_SECTIONS,
          languages: [{ name: 'German', proficiency: 'fluent' }],
          skills: [{ name: 'Service design', proficiency: 'expert', years: 7, approved: true }],
        },
      }),
    });
    await open();

    expect(await screen.findByText('German · Fluent')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit location: Austria' })).toBeInTheDocument();
    expect(section(/Skills and expertise/).getByText('Service design')).toBeInTheDocument();
    // Filling the page in from the server is not work to send back.
    expect(screen.getByRole('status')).toHaveTextContent('All changes saved');
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

  it('opens About in its own card, with no save of its own', async () => {
    const user = await open();

    await user.click(screen.getByRole('button', { name: 'Add details' }));

    const about = section(/About/);
    expect(await about.findByLabelText('Biography')).toBeInTheDocument();
    expect(about.getByLabelText('Display name')).toHaveValue('Ayesha Khan');
    expect(screen.queryByRole('button', { name: /Save and close/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save and next/ })).not.toBeInTheDocument();
    expect(about.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('sends nothing while typing, and everything when Save is pressed', async () => {
    const user = await open();
    await user.click(screen.getByRole('button', { name: 'Add details' }));
    const about = section(/About/);

    await user.type(await about.findByLabelText('Biography'), 'I build design systems.');
    // Long past the pause an autosave would have used.
    await afterTheDraftIsWritten();
    expect(calls.save).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(calls.save.mock.calls.at(-1)?.[1]).toMatchObject({
        displayName: 'Ayesha Khan',
        overview: 'I build design systems.',
      }),
    );
    expect(await screen.findByText('All changes saved')).toBeInTheDocument();
    // About is one of the four sections worth ten; skills, work experience and
    // portfolio are the three worth twenty.
    expect(bar()).toHaveAttribute('aria-valuenow', '10');
  });

  it('sends every section in the one request the profile takes', async () => {
    const user = await open();

    await user.click(screen.getByRole('button', { name: 'Add skills and expertise' }));
    await user.type(await section(/Skills and expertise/).findByLabelText('Skill'), 'Figma');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(calls.save).toHaveBeenCalled());
    const [, , sections] = calls.save.mock.calls.at(-1) ?? [];
    expect(sections).toMatchObject({ skills: [{ name: 'Figma' }] });
  });

  it('lets go of the browser draft once the save it was protecting lands', async () => {
    const user = await open();
    await user.click(screen.getByRole('button', { name: 'Add details' }));
    await user.type(await section(/About/).findByLabelText('Biography'), 'Saved for real.');
    await afterTheDraftIsWritten();
    expect(window.localStorage.length).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(window.localStorage.length).toBe(0));
  });

  it('opens the page again on what was typed but never saved', async () => {
    const user = await open();

    await user.click(screen.getByRole('button', { name: 'Add skills and expertise' }));
    await user.type(await section(/Skills and expertise/).findByLabelText('Skill'), 'Figma');
    await user.click(screen.getByRole('button', { name: 'Add details' }));
    await user.type(await section(/About/).findByLabelText('Biography'), 'Kept for later.');
    await afterTheDraftIsWritten();

    // The tab is closed and opened again.
    cleanup();
    await open();

    expect(section(/About/).getByText('Kept for later.')).toBeInTheDocument();
    expect(section(/Skills and expertise/).getByText('Figma')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Not saved yet');
    expect(calls.save).not.toHaveBeenCalled();
  });

  it('opens the skills editor inside its card and closes back to a summary', async () => {
    const user = await open();

    await user.click(screen.getByRole('button', { name: 'Add skills and expertise' }));

    const skills = section(/Skills and expertise/);
    await user.type(await skills.findByLabelText('Skill'), 'Figma');
    expect(bar()).toHaveAttribute('aria-valuenow', '20');

    await user.click(skills.getByRole('button', { name: 'Close' }));
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
    expect(bar()).toHaveAttribute('aria-valuenow', '0');
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

  it('counts what a buyer decides on more heavily than the rest', async () => {
    const user = await open();
    expect(bar()).toHaveAttribute('aria-valuenow', '0');

    await user.click(screen.getByRole('button', { name: 'Add skills and expertise' }));
    await user.type(await section(/Skills and expertise/).findByLabelText('Skill'), 'Figma');
    expect(bar()).toHaveAttribute('aria-valuenow', '20');

    await user.click(screen.getByRole('button', { name: 'Add details' }));
    await user.type(await section(/About/).findByLabelText('Biography'), 'I build things.');
    expect(bar()).toHaveAttribute('aria-valuenow', '30');
  });

  it('removes a language from the header', async () => {
    calls.load.mockResolvedValue({ ok: true, profile: withLanguage() });
    const user = await open();
    expect(await screen.findByRole('button', { name: 'Remove English' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove English' }));

    expect(screen.queryByRole('button', { name: 'Remove English' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Not saved yet');
  });

  it('keeps the pencils away until Complete your profile asks for them', async () => {
    calls.load.mockResolvedValue({
      ok: true,
      profile: stored({ displayName: 'Sophie', overview: 'I map difficult journeys.' }),
    });
    const user = await open();

    // A section with something in it reads as the profile, not as a form.
    expect(section(/About/).getByText('I map difficult journeys.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit About' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Complete your profile/ }));

    await user.click(screen.getByRole('button', { name: 'Edit About' }));
    expect(await section(/About/).findByLabelText('Biography')).toHaveValue(
      'I map difficult journeys.',
    );
  });

  it('saves the video link to the profile rather than keeping it here', async () => {
    const user = await open();

    await user.click(screen.getByRole('button', { name: 'Add video intro' }));
    await user.type(
      await section(/Video intro/).findByLabelText('Link to your video'),
      'https://vimeo.com/123456789',
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(calls.save.mock.calls.at(-1)?.[1]).toMatchObject({
        videoIntroUrl: 'https://vimeo.com/123456789',
      }),
    );
    expect(bar()).toHaveAttribute('aria-valuenow', '10');
  });

  it('shows the sections the design draws below the portfolio', async () => {
    const user = await open();

    expect(screen.getByRole('region', { name: /Video intro/ })).toBeInTheDocument();
    expect(section(/Visibility/).getByText(/Private/)).toBeInTheDocument();
    expect(section(/Expected rates/).getByText('No rate set yet.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Manage rates' }));
    const rates = section(/Expected rates/);
    await user.type(await rates.findByLabelText('Rate currency (3 letters)'), 'eur');
    await user.type(rates.getByLabelText('Hourly rate in smallest currency unit'), '14000');

    expect(rates.getByLabelText('Rate currency (3 letters)')).toHaveValue('EUR');
    expect(rates.getByText('€140.00 per hour')).toBeInTheDocument();
  });

  it('explains a profile that could not be loaded, and tries again', async () => {
    calls.load.mockResolvedValueOnce({ ok: false, message: 'Could not reach HireEvo.' });
    render(<ProfileBuilder />);
    const user = userEvent.setup();

    expect(await screen.findByText('Could not reach HireEvo.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('progressbar', { name: 'Profile strength' }),
    ).toBeInTheDocument();
  });
});
