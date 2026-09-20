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
        portfolio: false,
        videoIntro: false,
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

/**
 * The page as somebody filling it in sees it: landing on the profile, then
 * pressing the button that turns every section's pencil on. Nothing is
 * editable before that, which is the whole point of the button.
 */
const openForEditing = async () => {
  const user = await open();
  await user.click(screen.getByRole('button', { name: /Complete your profile/ }));
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
    const { avatarKey: _claimed, remoteMode: _mode, ratePeriod: _period, ...fields } = values;
    return Promise.resolve({ ok: true, profile: stored({ ...fields, version: version + 1 }) });
  });
});

describe('ProfileBuilder', () => {
  it('opens on the account holder’s name, which is not saved until Save is pressed', async () => {
    await open();

    // Read, not pressed: the page is landed on as the profile it is, so the
    // name is text here and gains its pencil only in edit mode.
    expect(screen.getByText('Ayesha Khan')).toBeInTheDocument();
    expect(screen.getByText('@blacksmith90')).toBeInTheDocument();
    expect(bar()).toHaveAttribute('aria-valuetext', '0 percent complete, 0 of 7 steps done');
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
    expect(screen.getByText('Austria')).toBeInTheDocument();
    expect(section(/Skills and expertise/).getByText('Service design')).toBeInTheDocument();
    // Filling the page in from the server is not work to send back.
    expect(calls.save).not.toHaveBeenCalled();
  });

  it('keeps the profile’s own display name when it has one', async () => {
    calls.load.mockResolvedValue({ ok: true, profile: stored({ displayName: 'Sophie Brandt' }) });
    const user = await openForEditing();

    expect(
      screen.getByRole('button', { name: 'Edit display name: Sophie Brandt' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('All changes saved');
    expect(user).toBeDefined();
  });

  it('opens About in its own card, with no save of its own', async () => {
    const user = await openForEditing();

    await user.click(screen.getByRole('button', { name: 'Edit About' }));

    const about = section(/About/);
    expect(await about.findByLabelText('Biography')).toBeInTheDocument();
    expect(about.getByLabelText('Display name')).toHaveValue('Ayesha Khan');
    expect(screen.queryByRole('button', { name: /Save and close/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save and next/ })).not.toBeInTheDocument();
    expect(about.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('sends nothing while typing, and everything when Save is pressed', async () => {
    const user = await openForEditing();
    await user.click(screen.getByRole('button', { name: 'Edit About' }));
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
    const user = await openForEditing();

    await user.click(screen.getByRole('button', { name: 'Edit skills and expertise' }));
    await user.type(await section(/Skills and expertise/).findByLabelText('Skill'), 'Figma');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(calls.save).toHaveBeenCalled());
    const [, , sections] = calls.save.mock.calls.at(-1) ?? [];
    expect(sections).toMatchObject({ skills: [{ name: 'Figma' }] });
  });

  it('lets go of the browser draft once the save it was protecting lands', async () => {
    const user = await openForEditing();
    await user.click(screen.getByRole('button', { name: 'Edit About' }));
    await user.type(await section(/About/).findByLabelText('Biography'), 'Saved for real.');
    await afterTheDraftIsWritten();
    expect(window.localStorage.length).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(window.localStorage.length).toBe(0));
  });

  it('opens the page again on what was typed but never saved', async () => {
    const user = await openForEditing();

    await user.click(screen.getByRole('button', { name: 'Edit skills and expertise' }));
    await user.type(await section(/Skills and expertise/).findByLabelText('Skill'), 'Figma');
    await user.click(screen.getByRole('button', { name: 'Edit About' }));
    await user.type(await section(/About/).findByLabelText('Biography'), 'Kept for later.');
    await afterTheDraftIsWritten();

    // The tab is closed and opened again. Reopened for editing, because the
    // save status lives on the card that only edit mode shows.
    cleanup();
    await openForEditing();

    expect(section(/About/).getByText('Kept for later.')).toBeInTheDocument();
    expect(section(/Skills and expertise/).getByText('Figma')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Not saved yet');
    expect(calls.save).not.toHaveBeenCalled();
  });

  it('keeps every kind of section in the browser draft as it is typed', async () => {
    // One section from each way the page persists work — a profile value, a
    // second value, and two of the dated lists that each save on their own — so
    // a section is never the one left out of the draft that survives the tab.
    const user = await openForEditing();

    await user.click(screen.getByRole('button', { name: 'Edit About' }));
    await user.type(await section(/About/).findByLabelText('Biography'), 'Kept for later.');

    await user.click(screen.getByRole('button', { name: 'Edit video intro' }));
    await user.type(
      await section(/Video intro/).findByLabelText('Link to your video'),
      'https://vimeo.com/42',
    );

    await user.click(screen.getByRole('button', { name: 'Edit skills and expertise' }));
    await user.type(await section(/Skills and expertise/).findByLabelText('Skill'), 'Figma');

    await user.click(screen.getByRole('button', { name: 'Edit work experience' }));
    await user.type(await section(/Work experience/).findByLabelText('Organization'), 'Acme');

    await afterTheDraftIsWritten();

    const raw = window.localStorage.getItem('hireevo.client-profile-draft.user-1');
    expect(raw).not.toBeNull();
    const draft = JSON.parse(raw ?? '{}') as {
      identity: Record<string, string>;
      skills: unknown[];
      experience: unknown[];
    };
    expect(draft.identity.overview).toBe('Kept for later.');
    expect(draft.identity.videoIntroUrl).toBe('https://vimeo.com/42');
    expect(JSON.stringify(draft.skills)).toContain('Figma');
    expect(JSON.stringify(draft.experience)).toContain('Acme');
  });

  it('opens the skills editor inside its card and closes back to a summary', async () => {
    const user = await openForEditing();

    await user.click(screen.getByRole('button', { name: 'Edit skills and expertise' }));

    const skills = section(/Skills and expertise/);
    await user.type(await skills.findByLabelText('Skill'), 'Figma');
    expect(bar()).toHaveAttribute('aria-valuenow', '20');

    await user.click(skills.getByRole('button', { name: 'Close' }));
    expect(skills.getByText('Figma')).toBeInTheDocument();
    expect(skills.queryByLabelText('Skill')).not.toBeInTheDocument();
  });

  it('opens the designed editor for work experience', async () => {
    const user = await openForEditing();

    await user.click(screen.getByRole('button', { name: 'Edit work experience' }));

    const experience = section(/Work experience/);
    expect(await experience.findByRole('group', { name: 'Role 1' })).toBeInTheDocument();
    expect(experience.getByLabelText('Organization')).toBeInTheDocument();
    // Optional in the design, and not one of the five key steps.
    expect(bar()).toHaveAttribute('aria-valuenow', '0');
  });

  it('opens education and certifications separately, as the design draws them', async () => {
    const user = await openForEditing();

    await user.click(screen.getByRole('button', { name: 'Edit education' }));
    expect(
      await section(/Education/).findByRole('group', { name: 'Institution 1' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit certifications' }));
    expect(
      await section(/Certifications/).findByRole('group', { name: 'License 1' }),
    ).toBeInTheDocument();
    // Opening one closes the other: two long forms at once is a page nobody reads.
    expect(
      section(/Education/).queryByRole('group', { name: 'Institution 1' }),
    ).not.toBeInTheDocument();
  });

  it('counts what a buyer decides on more heavily than the rest', async () => {
    const user = await openForEditing();
    expect(bar()).toHaveAttribute('aria-valuenow', '0');

    await user.click(screen.getByRole('button', { name: 'Edit skills and expertise' }));
    await user.type(await section(/Skills and expertise/).findByLabelText('Skill'), 'Figma');
    expect(bar()).toHaveAttribute('aria-valuenow', '20');

    await user.click(screen.getByRole('button', { name: 'Edit About' }));
    await user.type(await section(/About/).findByLabelText('Biography'), 'I build things.');
    expect(bar()).toHaveAttribute('aria-valuenow', '30');
  });

  it('removes a language from the header', async () => {
    calls.load.mockResolvedValue({ ok: true, profile: withLanguage() });
    const user = await openForEditing();
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

    // Landing here shows the profile, not a form: nothing offers a way in, and
    // that holds for the sections with something in them and the empty ones
    // alike.
    expect(section(/About/).getByText('I map difficult journeys.')).toBeInTheDocument();
    for (const name of ['Edit About', 'Edit skills and expertise', 'Edit expected rates']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }

    await user.click(screen.getByRole('button', { name: /Complete your profile/ }));

    // And now every one of them does.
    for (const name of ['Edit About', 'Edit skills and expertise', 'Edit expected rates']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }

    await user.click(screen.getByRole('button', { name: 'Edit About' }));
    expect(await section(/About/).findByLabelText('Biography')).toHaveValue(
      'I map difficult journeys.',
    );
  });

  /**
   * The same rule, for the card the page opens on.
   *
   * The sections followed it and this card did not, so landing here gave a
   * screen that was half read-only and half a form: the name, title, location,
   * photo and languages were all editable before anything asked for them, and
   * a Save button offered to write changes that could not yet be made.
   */
  it('keeps the header card and the save button out of the way too', async () => {
    calls.load.mockResolvedValue({
      ok: true,
      profile: stored({ displayName: 'Sophie', locationCountry: 'AT' }),
    });
    const user = await open();

    // Everything is still legible — it is a profile being read.
    expect(await screen.findByText('Sophie')).toBeInTheDocument();
    expect(screen.getByText('Austria')).toBeInTheDocument();

    // And none of it can be typed into.
    for (const name of [
      'Edit display name: Sophie',
      'Edit location: Austria',
      'Add languages',
      'Save',
    ]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/profile photo/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Complete your profile/ }));

    for (const name of ['Edit display name: Sophie', 'Edit location: Austria', 'Add languages']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByText('Add a profile photo')).toBeInTheDocument();
  });

  it('brings the portfolio into edit mode like every other section', async () => {
    const user = await openForEditing();
    const portfolio = () => section(/Portfolio/);

    // The corner opens the section; the control inside it adds a piece. There
    // is no Save on the piece: a portfolio piece is edited in place, because
    // attaching twenty images to it is something done over more than one
    // sitting rather than inside one submit.
    await user.click(screen.getByRole('button', { name: 'Edit portfolio' }));
    await user.click(await portfolio().findByRole('button', { name: 'Add portfolio' }));
    await user.type(portfolio().getByLabelText('Title'), 'Checkout redesign');
    await user.click(portfolio().getByRole('button', { name: 'Close' }));

    expect(portfolio().getByText('Checkout redesign')).toBeInTheDocument();
    expect(bar()).toHaveAttribute('aria-valuenow', '20');
  });

  it('keeps editing a piece it has already added, rather than only adding and deleting', async () => {
    const user = await openForEditing();
    const portfolio = () => section(/Portfolio/);

    await user.click(screen.getByRole('button', { name: 'Edit portfolio' }));
    await user.click(await portfolio().findByRole('button', { name: 'Add portfolio' }));

    const title = portfolio().getByLabelText('Title');
    await user.type(title, 'Checkout');
    await user.type(title, ' redesign');

    expect(title).toHaveValue('Checkout redesign');
    // Both attachment controls are there from the start, each stating how much
    // room is left, so nobody has to guess whether twenty is the limit.
    expect(portfolio().getByText('0 of 20')).toBeInTheDocument();
    expect(portfolio().getByText('0 of 5')).toBeInTheDocument();
  });

  it('saves the video link to the profile rather than keeping it here', async () => {
    const user = await openForEditing();

    await user.click(screen.getByRole('button', { name: 'Edit video intro' }));
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
    const user = await openForEditing();

    expect(screen.getByRole('region', { name: /Video intro/ })).toBeInTheDocument();
    expect(section(/Visibility/).getByText(/Private/)).toBeInTheDocument();
    expect(section(/Expected rates/).getByText('No rates set yet.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit expected rates' }));
    const rates = section(/Expected rates/);
    await user.type(await rates.findByLabelText('Rate'), '85');
    await user.selectOptions(rates.getByLabelText('Per'), 'weekly');

    expect(rates.getByLabelText('Rate')).toHaveValue('85');
  });

  /**
   * The amount is typed the way it is spoken and stored in minor units, and
   * the two are a hundred apart. It used to be typed in minor units behind a
   * "$", so anyone who typed what they charge priced their week at 85 cents.
   */
  it('sends the rate as minor units, not as the number that was typed', async () => {
    const user = await openForEditing();

    await user.click(screen.getByRole('button', { name: 'Edit expected rates' }));
    const rates = section(/Expected rates/);
    await user.type(await rates.findByLabelText('Rate'), '85.50');
    await user.selectOptions(rates.getByLabelText('Per'), 'monthly');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(calls.save.mock.calls.at(-1)?.[1]).toMatchObject({
        rateAmountMinor: '85.50',
        ratePeriod: 'monthly',
      }),
    );
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
