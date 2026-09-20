import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps, MouseEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Api from './api.ts';
import type { OwnProfile } from './api.ts';
import { sinceLabel } from './draft-status-card.tsx';
import { ProfileSetupScreen, sectionsSavedIn } from './profile-setup-screen.tsx';
import { NO_PUBLIC_SECTIONS } from './use-visibility-draft.ts';

const nav = vi.hoisted(() => ({ push: vi.fn(), step: null as string | null }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push, replace: nav.push }),
  useSearchParams: () => ({ get: () => nav.step }),
}));
// jsdom cannot navigate, so a link does what Next's does on this page: its own
// onClick, and no page load.
vi.mock('next/link', () => ({
  default: ({ scroll: _scroll, onClick, ...props }: ComponentProps<'a'> & { scroll?: boolean }) => (
    <a
      {...props}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        event.preventDefault();
      }}
    />
  ),
}));

const calls = vi.hoisted(() => ({
  load: vi.fn<typeof Api.loadOrCreateProfile>(),
  save: vi.fn<typeof Api.saveProfile>(),
  visibility: vi.fn<typeof Api.saveVisibility>(),
  publish: vi.fn<typeof Api.publishProfile>(),
  skills: vi.fn<typeof Api.listSkills>(),
  suggest: vi.fn<typeof Api.suggestSkill>(),
}));
vi.mock('./api.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof Api>()),
  loadOrCreateProfile: (...args: Parameters<typeof Api.loadOrCreateProfile>) => calls.load(...args),
  saveProfile: (...args: Parameters<typeof Api.saveProfile>) => calls.save(...args),
  saveVisibility: (...args: Parameters<typeof Api.saveVisibility>) => calls.visibility(...args),
  publishProfile: (...args: Parameters<typeof Api.publishProfile>) => calls.publish(...args),
  listSkills: (...args: Parameters<typeof Api.listSkills>) => calls.skills(...args),
  suggestSkill: (...args: Parameters<typeof Api.suggestSkill>) => calls.suggest(...args),
}));

/** The approved taxonomy, as the skills endpoint serves it. */
const TAXONOMY = [
  { slug: 'accessibility', name: 'Accessibility', category: 'Design' },
  { slug: 'service-design', name: 'Service design', category: 'Design' },
  { slug: 'user-research', name: 'User research', category: 'Research' },
];

const NOTHING_SHARED = {
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
};

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
    displayName: 'Sophie Brandt',
    headline: 'Senior service designer',
    overview: 'I partner with product leaders.',
    availabilityNote: null,
    locationCountry: null,
    locationRegion: null,
    locationCity: null,
    serviceArea: null,
    timezone: null,
    remoteMode: null,
    availability: null,
    rateAmountMinor: null,
    ratePeriod: null,
    sections: NO_SECTIONS,
    visibility: {
      profilePublic: false,
      locationGranularity: 'hidden',
      sections: NOTHING_SHARED,
      searchIndexable: false,
    },
    ...overrides,
  }) as OwnProfile;

const scrollIntoView = vi.fn();

/**
 * 40ms so the autosave lands quickly. A test that needs the pause *not* to
 * have elapsed passes a long one instead — asserting "not saved yet" against a
 * 40ms timer is a race the test loses on a slow machine, and did.
 */
const renderScreen = (autosaveDelay = 40) => {
  render(<ProfileSetupScreen autosaveDelay={autosaveDelay} />);
  return userEvent.setup();
};

/** One section of the page, found by its heading once the profile has loaded. */
const section = async (name: RegExp) => within(await screen.findByRole('region', { name }));

/** The elements the page scrolled to, in order. */
const scrolledTo = () => scrollIntoView.mock.contexts as Element[];

beforeEach(() => {
  nav.push.mockReset();
  nav.step = null;
  scrollIntoView.mockReset();
  Element.prototype.scrollIntoView = scrollIntoView;
  calls.load.mockReset().mockResolvedValue({ ok: true, profile: stored() });
  calls.save.mockReset().mockImplementation((version, values) => {
    // The claimed photo is a key to send, not a field the profile answers with,
    // and a remote mode is one of three words rather than whatever was typed.
    const { avatarKey: _claimed, remoteMode: _mode, ratePeriod: _period, ...fields } = values;
    return Promise.resolve({ ok: true, profile: stored({ ...fields, version: version + 1 }) });
  });
  calls.visibility.mockReset().mockImplementation((settings) =>
    Promise.resolve({
      ok: true,
      visibility: {
        profilePublic: settings.profilePublic,
        locationGranularity: settings.locationGranularity,
        sections: settings.sections,
        searchIndexable: settings.searchIndexable,
      },
    }),
  );
  calls.publish.mockReset();
  calls.skills.mockReset().mockResolvedValue(TAXONOMY);
  calls.suggest.mockReset().mockResolvedValue({ ok: true });
});

describe('ProfileSetupScreen', () => {
  it('shows all six sections on one page, opening at the first without scrolling', async () => {
    renderScreen();

    for (const name of [
      /Step 1:\s?Identity and story/,
      /Step 2:\s?Location and rate/,
      /Step 3:\s?Languages and skills/,
      /Step 4:\s?Experience/,
      /Step 5:\s?Education and licenses/,
      /Step 6:\s?Visibility and publication/,
    ]) {
      expect(await screen.findByRole('region', { name })).toBeInTheDocument();
    }
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(document.body).toHaveFocus();
  });

  it('opens at the section the address names, without taking focus', async () => {
    nav.step = 'experience';
    renderScreen();

    await section(/Step 4:\s?Experience/);
    await waitFor(() => expect(scrolledTo()).toContain(document.getElementById('step-experience')));
    expect(document.body).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Experience' })).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('brings a section into view from the step list and moves focus to its heading', async () => {
    const user = renderScreen();
    const education = await section(/Education and licenses/);

    await user.click(screen.getByRole('link', { name: /Education & licenses/ }));

    expect(scrolledTo()).toContain(document.getElementById('step-education'));
    expect(education.getByRole('heading', { level: 2 })).toHaveFocus();
  });

  it('opens on the saved profile', async () => {
    renderScreen();
    const identity = await section(/Identity and story/);

    expect(identity.getByLabelText('Display name')).toHaveValue('Sophie Brandt');
    expect(identity.getByLabelText('Professional headline')).toHaveValue('Senior service designer');
    expect(screen.getByText('Autosaved')).toBeInTheDocument();
    expect(identity.getByText('Complete every field to continue')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Identity & story/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('says the work is unsaved until the pause is over', async () => {
    // A pause long enough that it cannot have elapsed, so "not saved yet" is a
    // fact rather than a race: with the 40ms the other tests use, typing twelve
    // characters takes longer than the pause and the save lands mid-word.
    const user = renderScreen(10_000);
    const identity = await section(/Identity and story/);

    await user.type(identity.getByLabelText('Availability'), 'F');

    expect(screen.getByText('Unsaved')).toBeInTheDocument();
    expect(calls.save).not.toHaveBeenCalled();
  });

  it('saves after a pause in typing, not on every keystroke', async () => {
    const user = renderScreen();
    const identity = await section(/Identity and story/);

    await user.type(identity.getByLabelText('Availability'), 'From October');

    await waitFor(() => expect(screen.getByText('Autosaved')).toBeInTheDocument());
    // The whole point: one save for many keystrokes, carrying what was typed.
    expect(calls.save.mock.calls.length).toBeLessThan('From October'.length);
    await waitFor(() =>
      expect(calls.save.mock.calls.at(-1)?.[1]).toMatchObject({
        availabilityNote: 'From October',
      }),
    );
    expect(identity.getByText('All fields complete')).toBeInTheDocument();
  });

  it('sends the version the last save returned, so its own saves never conflict', async () => {
    const user = renderScreen();
    const name = (await section(/Identity and story/)).getByLabelText('Display name');

    await user.type(name, ' A');
    await waitFor(() => expect(calls.save).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('Autosaved')).toBeInTheDocument());
    await user.type(name, 'B');
    await waitFor(() => expect(calls.save).toHaveBeenCalledTimes(2));

    expect(calls.save.mock.calls.map((call) => call[0])).toEqual([3, 4]);
  });

  it('stops autosaving on a conflict and offers the latest version', async () => {
    calls.save.mockResolvedValueOnce({
      ok: false,
      kind: 'conflict',
      message: 'This profile was changed in another tab or window.',
    });
    const user = renderScreen();
    const name = (await section(/Identity and story/)).getByLabelText('Display name');

    await user.type(name, '!');
    expect(
      await screen.findByText('This profile was changed in another tab or window.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Out of date')).toBeInTheDocument();

    // Carrying on would overwrite whatever the other tab saved.
    await user.type(name, 'more');
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(calls.save).toHaveBeenCalledTimes(1);

    calls.load.mockResolvedValueOnce({
      ok: true,
      profile: stored({ displayName: 'Changed elsewhere', version: 9 }),
    });
    await user.click(screen.getByRole('button', { name: 'Load the latest version' }));
    expect(await screen.findByDisplayValue('Changed elsewhere')).toBeInTheDocument();
  });

  it('puts a field the API rejected under that field', async () => {
    calls.save.mockResolvedValueOnce({
      ok: false,
      kind: 'invalid',
      message: 'Request validation failed',
      fieldErrors: { headline: 'Too long' },
    });
    const user = renderScreen();
    const identity = await section(/Identity and story/);

    await user.type(identity.getByLabelText('Professional headline'), '!');
    expect(await identity.findByRole('alert')).toHaveTextContent('Too long');
    expect(identity.getByLabelText('Professional headline')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('saves before moving on, then brings Location and rate into view', async () => {
    const user = renderScreen();
    const identity = await section(/Identity and story/);
    await user.type(identity.getByLabelText('Availability'), 'Now');

    await user.click(identity.getByRole('button', { name: /Save and next/ }));

    await waitFor(() =>
      expect(nav.push).toHaveBeenCalledWith('/profile/setup?step=location', { scroll: false }),
    );
    expect(calls.save.mock.calls.at(-1)?.[1]).toMatchObject({ availabilityNote: 'Now' });
    expect(scrolledTo()).toContain(document.getElementById('step-location'));
    expect((await section(/Location and rate/)).getByRole('heading', { level: 2 })).toHaveFocus();
  });

  it('stays put when the save before moving on fails', async () => {
    calls.save.mockResolvedValue({
      ok: false,
      kind: 'failed',
      message: 'Could not reach HireEvo.',
    });
    const user = renderScreen();
    const identity = await section(/Identity and story/);
    await user.type(identity.getByLabelText('Availability'), 'Now');

    await user.click(identity.getByRole('button', { name: /Save and next/ }));

    expect(await screen.findByText('Could not reach HireEvo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try saving again' })).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
  });

  it('lists what publishing still needs, with a link to the section that fixes each', async () => {
    calls.publish.mockResolvedValueOnce({
      ok: false,
      kind: 'incomplete',
      issues: [
        { field: 'locationCountry', message: 'Choose the country you work from' },
        { field: 'availability', message: 'Set your availability' },
      ],
    });
    const user = renderScreen();

    await user.click(await screen.findByRole('button', { name: 'Publish current revision' }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/Choose the country you work from/)).toBeInTheDocument();
    const fix = within(alert).getByRole('link', { name: 'Location & rate' });
    expect(fix).toHaveAttribute('href', '/profile/setup?step=location');
    expect(
      within(alert).getByRole('link', { name: 'Visibility & publication' }),
    ).toBeInTheDocument();

    await user.click(fix);
    expect(scrolledTo()).toContain(document.getElementById('step-location'));
  });

  it('says the profile is live once it is published', async () => {
    calls.publish.mockResolvedValueOnce({
      ok: true,
      profile: stored({ status: 'published', version: 4 }),
    });
    const user = renderScreen();

    await user.click(await screen.findByRole('button', { name: 'Publish current revision' }));

    expect(await screen.findByText('Your profile is live.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Publish current revision' }),
    ).not.toBeInTheDocument();
  });

  it('explains a profile that could not be loaded, and tries again', async () => {
    calls.load.mockResolvedValueOnce({ ok: false, message: 'Could not reach HireEvo.' });
    const user = renderScreen();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach HireEvo.');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByLabelText('Display name')).toBeInTheDocument();
  });

  it('counts down only as a field nears its limit', async () => {
    const user = renderScreen();
    const note = (await section(/Identity and story/)).getByLabelText('Availability');

    await user.click(note);
    await user.paste('x'.repeat(100));
    expect(screen.queryByText(/characters left/)).not.toBeInTheDocument();
    await user.paste('x'.repeat(30));
    expect(screen.getByText('10 characters left')).toBeInTheDocument();
  });

  /** Whether the page would stop someone closing the tab. */
  const leave = () => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  };

  it('asks before leaving while there is work the server has not got', async () => {
    // A pause that cannot have elapsed, so "there is unsaved work" is a fact.
    // At 40ms the save lands while the word is still being typed, and the test
    // then asks whether unsaved work exists a moment after it stopped existing.
    const user = renderScreen(10_000);
    const location = await section(/Location and rate/);

    expect(leave()).toBe(false);
    await user.type(location.getByLabelText('City'), 'Vienna');

    expect(leave()).toBe(true);
  });

  it('saves a section that is not the first, and stops asking once it lands', async () => {
    const user = renderScreen();
    const location = await section(/Location and rate/);

    await user.type(location.getByLabelText('City'), 'Vienna');

    await waitFor(() => expect(screen.getByText('Autosaved')).toBeInTheDocument());
    await waitFor(() =>
      expect(calls.save.mock.calls.at(-1)?.[1]).toMatchObject({ locationCity: 'Vienna' }),
    );
    expect(leave()).toBe(false);
  });

  it('saves the country as the code the API stores, and opens on its name', async () => {
    const user = renderScreen();
    const location = await section(/Location and rate/);

    await user.type(location.getByLabelText('Country'), 'austria');
    await waitFor(() => expect(screen.getByText('Autosaved')).toBeInTheDocument());

    expect(calls.save.mock.calls.at(-1)?.[1]).toMatchObject({ locationCountry: 'AT' });
  });

  it('saves a list in the same request as the fields', async () => {
    const user = renderScreen();
    const skills = await section(/Languages and skills/);

    await user.type(
      within(skills.getByRole('group', { name: 'Skill 1' })).getByLabelText('Skill'),
      'Figma',
    );

    // Waited for by name, not by "any call carrying a skill": typing is slow
    // enough on a loaded machine that a save fires mid-word, and a search for
    // a non-empty list keeps finding that first partial one for ever.
    await waitFor(() => {
      const carrying = calls.save.mock.calls.find((call) => call[2]?.skills?.[0]?.name === 'Figma');
      expect(carrying?.[2]).toMatchObject({
        skills: [{ name: 'Figma', proficiency: null, years: null }],
      });
    });
  });

  it('opens on the lists the profile already holds, without sending them back', async () => {
    calls.load.mockResolvedValue({
      ok: true,
      profile: stored({
        sections: {
          ...NO_SECTIONS,
          skills: [{ name: 'Service design', proficiency: 'expert', years: 7, approved: true }],
        },
      }),
    });
    renderScreen();
    const skills = await section(/Languages and skills/);

    const first = within(skills.getByRole('group', { name: 'Skill 1' }));
    await waitFor(() => expect(first.getByLabelText('Skill')).toHaveValue('Service design'));
    expect(first.getByLabelText('Proficiency')).toHaveValue('Expert');
    expect(first.getByLabelText('Years')).toHaveValue('7');
    // Filling the page in from the server is not a change to save.
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(calls.save).not.toHaveBeenCalled();
    expect(screen.getByText('Autosaved')).toBeInTheDocument();
  });

  it('ticks Identity and story once its section is saved', async () => {
    calls.load.mockResolvedValue({
      ok: true,
      profile: stored({ availabilityNote: 'From October' }),
    });
    renderScreen();

    expect(
      await screen.findByRole('link', { name: 'Identity & story, complete' }),
    ).toBeInTheDocument();
  });
});

describe('sectionsSavedIn', () => {
  it('counts only what the server holds', () => {
    expect(sectionsSavedIn(null)).toBe(0);
    expect(sectionsSavedIn(stored())).toBe(0);
    expect(sectionsSavedIn(stored({ availabilityNote: 'From October' }))).toBe(1);
    expect(
      sectionsSavedIn(
        stored({
          availabilityNote: 'x',
          locationCountry: 'PK',
          rateAmountMinor: '100',
          sections: {
            ...NO_SECTIONS,
            languages: [{ name: 'Urdu', proficiency: 'native' }],
            skills: [{ name: 'Figma', proficiency: null, years: null, approved: true }],
          },
          visibility: {
            profilePublic: true,
            locationGranularity: 'country',
            sections: { ...NOTHING_SHARED, biography: true },
            searchIndexable: false,
          },
        }),
      ),
    ).toBe(4);
  });

  it('does not count a section the person has only typed into', () => {
    // Typing is not saving: this reads what came back from the API.
    expect(sectionsSavedIn(stored({ sections: { ...NO_SECTIONS, skills: [] } }))).toBe(0);
  });
});

describe('sinceLabel', () => {
  const at = new Date('2026-09-14T10:00:00Z');
  it.each([
    [10_000, 'just now'],
    [60_000, '1 minute ago'],
    [5 * 60_000, '5 minutes ago'],
  ])('%sms later reads %s', (elapsed, label) => {
    expect(sinceLabel(at, at.getTime() + elapsed)).toBe(label);
  });
});

describe('Location and rate', () => {
  const RATE = 'Rate in USD';
  const PERIOD = 'What that rate covers';
  type Section = Awaited<ReturnType<typeof section>>;

  async function fill(
    user: ReturnType<typeof userEvent.setup>,
    location: Section,
    overrides: Partial<Record<'country' | 'timezone', string>> = {},
  ) {
    await user.type(location.getByLabelText('Country'), overrides.country ?? 'austria');
    await user.type(location.getByLabelText('City'), 'Vienna');
    await user.type(location.getByLabelText('Service area'), 'Remote across Europe');
    await user.selectOptions(location.getByLabelText('Remote availability'), 'remote');
    await user.type(location.getByLabelText(RATE), '140');
    await user.selectOptions(location.getByLabelText(PERIOD), 'weekly');
    await user.type(location.getByLabelText('Timezone'), overrides.timezone ?? 'Europe/Vienna');
  }

  it('shows every field of the design, empty, as step 2 of 6', async () => {
    nav.step = 'location';
    renderScreen();
    const location = await section(/Location and rate/);

    expect(location.getByLabelText('Country')).toHaveValue('');
    for (const label of ['City', 'Service area', 'Timezone', 'Remote availability', RATE, PERIOD]) {
      expect(location.getByLabelText(label)).toBeInTheDocument();
    }
    expect(location.getByText('Complete every field to continue')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Location & rate/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('keeps Save and next locked, and saying why, until every field is filled', async () => {
    const user = renderScreen();
    const location = await section(/Location and rate/);
    await user.type(location.getByLabelText('City'), 'Vienna');

    const next = location.getByRole('button', { name: /Save and next/ });
    expect(next).toHaveAttribute('aria-disabled', 'true');
    expect(next).toHaveAccessibleDescription('Complete every field to continue');
    await user.click(next);
    expect(nav.push).not.toHaveBeenCalled();
  });

  it('fills in completely and moves on to step 3', async () => {
    const user = renderScreen();
    const location = await section(/Location and rate/);

    await fill(user, location);
    await user.tab();

    // Left the country field already, so it settled to its listed name.
    expect(location.getByLabelText('Country')).toHaveValue('Austria');
    expect(location.getByLabelText(RATE)).toHaveValue('140');
    expect(location.getByLabelText(PERIOD)).toHaveValue('weekly');
    // Read back in the currency it is stored in, so a rate typed as 140 is
    // visibly $140.00 and not a hundred times less.
    expect(location.getByText('$140.00')).toBeInTheDocument();
    expect(location.getByText('All fields complete')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Location & rate, complete' })).toBeInTheDocument();

    await user.click(location.getByRole('button', { name: /Save and next/ }));
    expect(nav.push).toHaveBeenCalledWith('/profile/setup?step=skills', { scroll: false });
  });

  it('leaves a field without an error, and shows it on Save and next until it is fixed', async () => {
    const user = renderScreen();
    const location = await section(/Location and rate/);
    const timezone = location.getByLabelText('Timezone');

    await fill(user, location, { timezone: 'Mars/Olympus' });
    await user.tab();
    // Nothing appears on leaving, so nothing moves under the pointer.
    expect(location.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(location.getByRole('button', { name: /Save and next/ }));
    expect(await location.findByRole('alert')).toHaveTextContent('Choose a timezone from the list');
    expect(timezone).toHaveAttribute('aria-invalid', 'true');

    await user.type(timezone, '{Backspace}');
    expect(location.queryByRole('alert')).not.toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
  });

  it('stays on the step and takes the person to the first problem', async () => {
    const user = renderScreen();
    const location = await section(/Location and rate/);

    await fill(user, location, { country: 'Atlantis' });
    await user.click(location.getByRole('button', { name: /Save and next/ }));

    await waitFor(() => expect(location.getByLabelText('Country')).toHaveFocus());
    expect(location.getByRole('alert')).toHaveTextContent('Choose a country from the list.');
    expect(nav.push).not.toHaveBeenCalled();
  });
});

describe('Languages and skills', () => {
  it('adds an approved skill into the empty entry, then moves to its proficiency', async () => {
    const user = renderScreen();
    const skills = await section(/Languages and skills/);

    await user.click(skills.getByRole('button', { name: 'Add approved skill' }));

    const first = within(skills.getByRole('group', { name: 'Skill 1' }));
    expect(first.getByLabelText('Skill')).toHaveValue('Accessibility');
    await waitFor(() => expect(first.getByLabelText('Proficiency')).toHaveFocus());
    expect(skills.getByRole('status')).toHaveTextContent('Accessibility added to your skills.');
    expect(skills.queryByRole('group', { name: 'Skill 2' })).not.toBeInTheDocument();

    await user.click(skills.getByRole('button', { name: 'Add approved skill' }));
    expect(skills.getByRole('status')).toHaveTextContent(
      'Accessibility is already in your skills.',
    );
  });

  it('offers the taxonomy the API serves, not a list of its own', async () => {
    renderScreen();
    const skills = await section(/Languages and skills/);

    const picker = skills.getByRole('combobox', { name: 'Approved skill' });
    await waitFor(() =>
      expect(
        within(picker)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['Accessibility', 'Service design', 'User research']),
    );
  });

  it('asks for a skill the taxonomy does not have, once one has been typed', async () => {
    const user = renderScreen();
    const skills = await section(/Languages and skills/);

    // Nothing typed yet: there is nothing to ask for, so it makes somewhere to type.
    await user.click(skills.getByRole('button', { name: /Suggest a skill/ }));
    expect(skills.getByRole('status')).toHaveTextContent('Type the skill you want');
    expect(calls.suggest).not.toHaveBeenCalled();

    await user.type(
      within(skills.getByRole('group', { name: 'Skill 1' })).getByLabelText('Skill'),
      'Regulatory service design',
    );
    await user.click(skills.getByRole('button', { name: /Suggest a skill/ }));

    await waitFor(() => expect(calls.suggest).toHaveBeenCalledWith('Regulatory service design'));
    expect(skills.getByRole('status')).toHaveTextContent('sent for approval');
  });

  it('says why a skill could not be sent', async () => {
    calls.suggest.mockResolvedValue({ ok: false, message: 'Too many requests.' });
    const user = renderScreen();
    const skills = await section(/Languages and skills/);

    await user.type(
      within(skills.getByRole('group', { name: 'Skill 1' })).getByLabelText('Skill'),
      'Regulatory service design',
    );
    await user.click(skills.getByRole('button', { name: /Suggest a skill/ }));

    await waitFor(() => expect(skills.getByRole('status')).toHaveTextContent('Too many requests.'));
  });

  it('adds a language with focus in it, and removes it with focus back on Add', async () => {
    const user = renderScreen();
    const skills = await section(/Languages and skills/);

    await user.click(skills.getByRole('button', { name: 'Add language' }));
    const second = skills.getByRole('group', { name: 'Language 2' });
    expect(within(second).getByRole('combobox')).toHaveFocus();

    await user.click(skills.getByRole('button', { name: 'Remove language 2' }));
    expect(skills.queryByRole('group', { name: 'Language 2' })).not.toBeInTheDocument();
    expect(skills.getByRole('button', { name: 'Add language' })).toHaveFocus();
  });

  it('finds a repeated skill and too many years, and goes to the first', async () => {
    const user = renderScreen();
    const skills = await section(/Languages and skills/);

    await user.type(
      within(skills.getByRole('group', { name: 'Language 1' })).getByRole('combobox'),
      'German',
    );
    const first = within(skills.getByRole('group', { name: 'Skill 1' }));
    await user.type(first.getByLabelText('Skill'), 'Service design');
    await user.type(first.getByLabelText('Proficiency'), 'expert');
    await user.type(first.getByLabelText('Years'), '70');
    await user.click(skills.getByRole('button', { name: 'Add skill' }));
    const second = within(skills.getByRole('group', { name: 'Skill 2' }));
    await user.type(second.getByLabelText('Skill'), 'service  design');
    await user.type(second.getByLabelText('Proficiency'), 'Advanced');
    await user.type(second.getByLabelText('Years'), '6');

    await user.click(skills.getByRole('button', { name: /Save and next/ }));

    expect(first.getByText('Enter whole years, up to 60.')).toBeInTheDocument();
    expect(second.getByText('This skill is already listed.')).toBeInTheDocument();
    await waitFor(() => expect(first.getByLabelText('Years')).toHaveFocus());
    expect(nav.push).not.toHaveBeenCalled();
  });

  it('moves on to Experience once languages and skills are complete', async () => {
    const user = renderScreen();
    const skills = await section(/Languages and skills/);

    await user.type(
      within(skills.getByRole('group', { name: 'Language 1' })).getByRole('combobox'),
      'German',
    );
    const first = within(skills.getByRole('group', { name: 'Skill 1' }));
    await user.type(first.getByLabelText('Skill'), 'Service design');
    await user.type(first.getByLabelText('Proficiency'), 'Expert');
    await user.type(first.getByLabelText('Years'), '7');

    expect(skills.getByText('All fields complete')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Languages & skills, complete' })).toBeInTheDocument();
    await user.click(skills.getByRole('button', { name: /Save and next/ }));
    expect(nav.push).toHaveBeenCalledWith('/profile/setup?step=experience', { scroll: false });
  });
});

describe('Experience', () => {
  it('accepts a role with no end date, which is a role someone still holds', async () => {
    const user = renderScreen();
    const experience = await section(/Step 4:\s?Experience/);

    await user.type(experience.getByLabelText('Role'), 'Lead Service Designer');
    await user.type(experience.getByLabelText('Organization'), 'Erste Digital');
    await user.type(experience.getByLabelText('Start date'), '2022-02-01');
    await user.type(experience.getByLabelText('Summary'), 'Led discovery.');

    expect(experience.getByText('All fields complete')).toBeInTheDocument();
    await user.click(experience.getByRole('button', { name: /Save and next/ }));
    expect(nav.push).toHaveBeenCalledWith('/profile/setup?step=education', { scroll: false });
  });

  it('refuses an end date before the start date', async () => {
    const user = renderScreen();
    const experience = await section(/Step 4:\s?Experience/);

    await user.type(experience.getByLabelText('Role'), 'Lead Service Designer');
    await user.type(experience.getByLabelText('Organization'), 'Erste Digital');
    await user.type(experience.getByLabelText('Start date'), '2022-02-01');
    await user.type(experience.getByLabelText('End date'), '2021-01-01');
    await user.type(experience.getByLabelText('Summary'), 'Led discovery.');
    await user.click(experience.getByRole('button', { name: /Save and next/ }));

    expect(experience.getByRole('alert')).toHaveTextContent(
      'The end date is before the start date.',
    );
    await waitFor(() => expect(experience.getByLabelText('End date')).toHaveFocus());
  });
});

describe('Education and licenses', () => {
  it('refuses a license that expires before it was issued, and moves on once fixed', async () => {
    const user = renderScreen();
    const education = await section(/Education and licenses/);

    await user.click(education.getByLabelText('Institution'));
    await user.paste('University of Applied Arts Vienna');
    await user.click(education.getByLabelText('Qualification'));
    await user.paste('Master of Arts');
    await user.click(education.getByLabelText('Field of study'));
    await user.paste('Interaction & Service Design');
    await user.type(education.getByLabelText('Start date'), '2013-09-01');
    await user.type(education.getByLabelText('End date'), '2017-06-30');
    await user.click(education.getByLabelText('License'));
    await user.paste('Accessibility Fundamentals');
    await user.click(education.getByLabelText('Issuer'));
    await user.paste('Interaction Design Foundation');
    await user.type(education.getByLabelText('Issued'), '2025-03-10');
    await user.type(education.getByLabelText('Expires'), '2025-01-01');

    await user.click(education.getByRole('button', { name: /Save and next/ }));
    expect(education.getByRole('alert')).toHaveTextContent(
      'The expiry date is before the issue date.',
    );

    await user.clear(education.getByLabelText('Expires'));
    expect(education.getByText('All fields complete')).toBeInTheDocument();

    await user.clear(education.getByLabelText('Expires'));
    await user.type(education.getByLabelText('Expires'), '2028-03-10');
    await user.click(education.getByRole('button', { name: /Save and next/ }));
    expect(nav.push).toHaveBeenCalledWith('/profile/setup?step=visibility', { scroll: false });
  });
});

describe('Visibility and publication', () => {
  it('starts private, with no section shared and no indexing', async () => {
    renderScreen();
    const visibility = await section(/Visibility and publication/);

    expect(visibility.getByRole('radio', { name: 'Private draft' })).toBeChecked();
    for (const box of visibility.getAllByRole('checkbox')) expect(box).not.toBeChecked();
  });

  it('refuses a public profile that shows nothing, then saves and goes to publishing', async () => {
    const user = renderScreen();
    const visibility = await section(/Visibility and publication/);

    await user.click(visibility.getByRole('radio', { name: 'Public after publishing' }));
    await user.click(visibility.getByRole('button', { name: 'Save section' }));

    expect(visibility.getByRole('alert')).toHaveTextContent(NO_PUBLIC_SECTIONS);
    await waitFor(() =>
      expect(visibility.getByRole('checkbox', { name: 'Name and headline' })).toHaveFocus(),
    );

    await user.click(visibility.getByRole('checkbox', { name: 'About' }));
    expect(visibility.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(visibility.getByRole('button', { name: 'Save section' }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Ready when you are.' })).toHaveFocus(),
    );
    const sent = calls.visibility.mock.calls.at(-1)?.[0];
    expect(sent).toMatchObject({ version: 3, profilePublic: true, searchIndexable: false });
    expect(sent?.sections.biography).toBe(true);
    expect(
      screen.getByRole('link', { name: 'Visibility & publication, complete' }),
    ).toBeInTheDocument();
  });

  it('shows a section that was never chosen at the coarsest location, not at none', async () => {
    const user = renderScreen();
    const visibility = await section(/Visibility and publication/);

    await user.click(visibility.getByRole('checkbox', { name: /Location and remote/ }));
    await user.click(visibility.getByRole('button', { name: 'Save section' }));

    await waitFor(() => expect(calls.visibility).toHaveBeenCalled());
    expect(calls.visibility.mock.calls.at(-1)?.[0]).toMatchObject({
      locationGranularity: 'country',
    });
  });

  it('reads the profile back, so the next save is at the version this one moved it to', async () => {
    const user = renderScreen();
    const visibility = await section(/Visibility and publication/);
    calls.load.mockResolvedValue({ ok: true, profile: stored({ version: 9 }) });

    await user.click(visibility.getByRole('checkbox', { name: 'About' }));
    await user.click(visibility.getByRole('button', { name: 'Save section' }));
    await waitFor(() => expect(calls.visibility).toHaveBeenCalled());

    const identity = await section(/Identity and story/);
    await user.type(identity.getByLabelText('Availability'), 'Now');
    await waitFor(() => expect(calls.save).toHaveBeenCalled());
    // The first save after the visibility write is the one that has to carry
    // the version it moved to. Later ones carry what each save returned, and
    // on a loaded machine typing three characters produces several.
    expect(calls.save.mock.calls[0]?.[0]).toBe(9);
  });

  it('keeps the setting on screen when it could not be saved', async () => {
    calls.visibility.mockResolvedValue({
      ok: false,
      kind: 'failed',
      message: 'Could not reach HireEvo.',
    });
    const user = renderScreen();
    const visibility = await section(/Visibility and publication/);

    await user.click(visibility.getByRole('checkbox', { name: 'About' }));
    await user.click(visibility.getByRole('button', { name: 'Save section' }));

    expect(await visibility.findByRole('alert')).toHaveTextContent('Could not reach HireEvo.');
    expect(visibility.getByRole('checkbox', { name: 'About' })).toBeChecked();
    expect(
      screen.queryByRole('link', { name: 'Visibility & publication, complete' }),
    ).not.toBeInTheDocument();
  });

  it('opens on the setting the profile already holds', async () => {
    calls.load.mockResolvedValue({
      ok: true,
      profile: stored({
        visibility: {
          profilePublic: true,
          locationGranularity: 'city',
          sections: { ...NOTHING_SHARED, skills: true },
          searchIndexable: true,
        },
      }),
    });
    renderScreen();
    const visibility = await section(/Visibility and publication/);

    await waitFor(() =>
      expect(visibility.getByRole('radio', { name: 'Public after publishing' })).toBeChecked(),
    );
    expect(visibility.getByRole('checkbox', { name: 'Skills and expertise' })).toBeChecked();
    expect(visibility.getByRole('checkbox', { name: /index the public profile/ })).toBeChecked();
  });
});
