import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RATE_CURRENCY } from '@/features/profile-setup/api.ts';
import { toMinorUnits } from '@/features/profile-setup/location-options.ts';
import type * as ProfileApi from '@/features/profile-setup/api.ts';
import type { OwnProfile } from '@/features/profile-setup/api.ts';
import { ProfileBuilder } from './profile-builder.tsx';

const push = vi.fn<(href: string) => void>();
// `?edit=1` is what the header's "Edit profile" opens this screen with, so the
// mock has to answer the same question the real hook does. Empty by default:
// these tests land on the profile as a person does, and turn editing on
// through the button.
let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push }),
  useSearchParams: () => search,
}));

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
  unpublish: vi.fn<typeof ProfileApi.unpublishProfile>(),
}));
vi.mock('@/features/profile-setup/api.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof ProfileApi>()),
  loadOrCreateProfile: () => calls.load(),
  saveProfile: (...args: Parameters<typeof ProfileApi.saveProfile>) => calls.save(...args),
  listSkills: (...args: Parameters<typeof ProfileApi.listSkills>) => calls.skills(...args),
  unpublishProfile: () => calls.unpublish(),
}));

/** What the API returns for a profile nobody has filled contact details into. */
const NO_CONTACT = {
  phoneE164: null,
  contactEmail: null,
  whatsappE164: null,
  linkedinUrl: null,
  figmaUrl: null,
  addressLine1: null,
  addressLine2: null,
  postalCode: null,
  dateOfBirth: null,
};

const NO_SECTIONS = {
  languages: [],
  skills: [],
  experience: [],
  education: [],
  licenses: [],
  portfolio: [],
};

/** Every section the strength card counts, so the profile reads as finished. */
const COMPLETE = {
  overview: 'I map difficult journeys and ship accessible services.',
  videoIntroUrl: 'https://vimeo.com/123456789',
  sections: {
    languages: [{ name: 'Urdu', proficiency: 'native', starred: true }],
    skills: [{ name: 'Service design', proficiency: 'expert', years: 7, approved: true }],
    experience: [
      {
        role: 'Lead designer',
        organization: 'Erste',
        startDate: '2022-02-01',
        endDate: null,
        summary: 'Led discovery.',
      },
    ],
    education: [
      {
        institution: 'University of Applied Arts Vienna',
        qualification: 'MA',
        fieldOfStudy: 'Service Design',
        startDate: '2013-09-01',
        endDate: '2017-06-30',
      },
    ],
    licenses: [
      {
        name: 'Accessibility Fundamentals',
        issuer: 'IDF',
        issuedOn: '2025-03-10',
        expiresOn: null,
        files: [],
      },
    ],
    portfolio: [{ title: 'Checkout redesign', url: null, summary: null, files: [] }],
  },
} as Partial<OwnProfile>;

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
    rates: [],
    responseTime: null,
    projectLength: null,
    availableFrom: null,
    contact: NO_CONTACT,
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
  stored({
    sections: {
      ...NO_SECTIONS,
      languages: [{ name: 'English', proficiency: null, starred: true }],
    },
  });

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
  // Reset between tests: one asking for `?edit=1` must not leave every later
  // test opening in edit mode.
  search = new URLSearchParams();
  push.mockReset();
  window.localStorage.clear();
  calls.load.mockReset().mockResolvedValue({ ok: true, profile: stored() });
  calls.skills.mockReset().mockResolvedValue([
    { slug: 'accessibility', name: 'Accessibility', category: 'Design' },
    { slug: 'service-design', name: 'Service design', category: 'Design' },
  ]);
  calls.save.mockReset().mockImplementation((version, values, _sections, rates) => {
    // The claimed photo is a key to send, not a field the profile answers with,
    // and a remote mode, response time and project length are each one of a few
    // words rather than whatever was typed.
    const {
      avatarKey: _claimed,
      remoteMode: _mode,
      responseTime: _responds,
      projectLength: _length,
      ...fields
    } = values;
    return Promise.resolve({
      ok: true,
      profile: stored({
        ...fields,
        version: version + 1,
        // Answered the way the API answers: minor units and the currency they
        // are quoted in, so what comes back is what a reload would show.
        ...(rates === undefined
          ? {}
          : {
              rates: rates.flatMap((rate) => {
                const amountMinor = toMinorUnits(rate.amount, RATE_CURRENCY);
                return amountMinor === null
                  ? []
                  : [{ period: rate.period, amountMinor, currency: RATE_CURRENCY }];
              }),
            }),
      }),
    });
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
          languages: [{ name: 'German', proficiency: 'fluent', starred: false }],
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

  /**
   * Preview does not wait for publishing; Share does.
   *
   * The one moment somebody wants to see what they are about to put in front of
   * buyers is the moment before they publish, and that was exactly when the
   * button refused. Share still waits, because until the profile is published
   * the public route answers 404 and a copied link would lead nowhere.
   */
  /**
   * Share opens before publishing, and says the link is not live yet.
   *
   * It used to be refused until the profile was published, because the public
   * route answers 404 until then — but a button that cannot be pressed, under a
   * line of grey text, reads as broken rather than as a rule. The address
   * exists the moment the profile does; what has to be said is that it will not
   * open for anyone else yet.
   */
  /**
   * Nothing to share until there is something at the address.
   *
   * The public route answers 404 until the profile is published, so a link
   * copied before then leads nowhere. Absent rather than present-and-refused:
   * a button that cannot be pressed reads as broken, and Preview is the useful
   * thing to offer while a profile is still a draft.
   */
  it('offers Preview but no Share while the profile is a draft', async () => {
    calls.load.mockResolvedValue({ ok: true, profile: stored({ status: 'draft', slug: 's1' }) });
    await open();

    const preview = await screen.findByRole('link', { name: 'Preview' });
    expect(preview).toHaveAttribute('href', '/profile/preview');
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  });

  /**
   * The header's "Edit profile" lands here with the pencils already on.
   *
   * Read once, as the initial state rather than on every render: reading it
   * live would turn editing back on the moment somebody pressed "Done editing"
   * without leaving the page, which is the one thing that button is for.
   */
  it('opens with editing on when the address asks for it', async () => {
    search = new URLSearchParams('edit=1');
    await open();

    expect(await screen.findByRole('button', { name: 'Done editing' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Complete your profile/ })).not.toBeInTheDocument();
  });

  /**
   * One button that says what pressing it will do.
   *
   * Offering to publish something already published is an action with no
   * meaning, and it left withdrawing a profile with nowhere to be done from.
   */
  it('turns Publish into Unpublish once the profile is live, and takes it back down', async () => {
    calls.load.mockResolvedValue({ ok: true, profile: stored({ status: 'published' }) });
    calls.unpublish
      .mockReset()
      .mockResolvedValue({ ok: true, profile: stored({ status: 'draft' }) });
    const user = await open();

    const withdraw = await screen.findByRole('button', { name: 'Unpublish' });
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();

    await user.click(withdraw);

    expect(calls.unpublish).toHaveBeenCalledOnce();
    // And back, without a reload: the button says Publish again, and Share goes.
    expect(await screen.findByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  });

  it('offers Share once the profile is published', async () => {
    calls.load.mockResolvedValue({ ok: true, profile: stored({ status: 'published' }) });
    await open();

    const share = await screen.findByRole('button', { name: 'Share' });
    expect(share).toBeEnabled();
    expect(screen.queryByText('Publish to share a link')).not.toBeInTheDocument();
  });

  /**
   * Share shows the address rather than copying it out of sight.
   *
   * It used to write to the clipboard and say "Link copied" in small print,
   * which asks somebody to trust that something they never saw is now on their
   * clipboard — and says nothing useful on the origins where the browser
   * refuses the clipboard outright.
   */
  it('opens the profile link in a dialog, with a button that copies it', async () => {
    calls.load.mockResolvedValue({
      ok: true,
      profile: stored({ status: 'published', slug: 's1' }),
    });

    const user = await open();
    // After `userEvent.setup()`, which installs a clipboard of its own: defined
    // before it, this stub is the one that gets replaced.
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

    await user.click(screen.getByRole('button', { name: 'Share' }));

    const dialog = screen.getByRole('dialog', { name: 'Share your profile' });
    const link = within(dialog).getByRole('textbox', { name: 'Your profile link' });
    expect(link).toHaveValue('http://localhost:3100/p/s1');
    expect(link).toHaveAttribute('readonly');
    // Published, so no warning about a link that leads nowhere.
    expect(dialog.textContent).not.toContain('not published yet');

    await user.click(within(dialog).getByRole('button', { name: /Copy/ }));
    expect(writeText).toHaveBeenCalledWith('http://localhost:3100/p/s1');
    expect(await within(dialog).findByText(/Link copied/)).toBeInTheDocument();
  });

  it('closes the share dialog on Escape and puts focus back on Share', async () => {
    calls.load.mockResolvedValue({
      ok: true,
      profile: stored({ status: 'published', slug: 's1' }),
    });
    const user = await open();

    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share' })).toHaveFocus();
  });

  /**
   * The card beside the name shows what was starred, and only that.
   *
   * It is the same card the published profile draws, so it has to say the same
   * thing — otherwise the owner arranges one list and the world reads another.
   * Editing is the exception: everything is listed then, because starring
   * happens here and a language hidden from its own editor cannot be unstarred.
   */
  it('lists only starred languages beside the name, and all of them in the section', async () => {
    calls.load.mockResolvedValue({
      ok: true,
      profile: stored({
        sections: {
          ...NO_SECTIONS,
          languages: [
            { name: 'Urdu', proficiency: 'native', starred: true },
            { name: 'German', proficiency: 'fluent', starred: false },
          ],
        },
      }),
    });
    const user = await open();

    // Scoped to the card beside the name: both languages exist on the page,
    // and the whole point is which of them this card shows.
    const nameCard = () => section(/Your name and details/);
    expect(await screen.findByText('About')).toBeInTheDocument();
    expect(nameCard().getByText(/Urdu/)).toBeInTheDocument();
    expect(nameCard().queryByText(/German/)).not.toBeInTheDocument();

    // The unstarred one is not missing, it is in the section that owns the
    // list — which is also the only place it can be starred from.
    await user.click(screen.getByRole('button', { name: /Complete your profile|Edit profile/ }));
    await user.click(screen.getByRole('button', { name: 'Edit languages' }));

    expect(
      section(/Languages/).getByRole('button', { name: 'Show German beside my name' }),
    ).toBeInTheDocument();
  });

  /**
   * Starring is the only thing on this screen that changes another page.
   *
   * The header on the published profile lists the starred languages and
   * nothing else, so the flag has to survive the trip from a click here,
   * through the draft, into the save. Every step of that is somewhere it could
   * be dropped silently — the language would still save, just never appear.
   */
  it('sends a starred language as starred', async () => {
    calls.load.mockResolvedValue({
      ok: true,
      profile: stored({
        sections: {
          ...NO_SECTIONS,
          languages: [{ name: 'German', proficiency: 'fluent', starred: false }],
        },
      }),
    });
    const user = await openForEditing();

    await user.click(screen.getByRole('button', { name: 'Edit languages' }));
    await user.click(
      await section(/Languages/).findByRole('button', { name: 'Show German beside my name' }),
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(calls.save).toHaveBeenCalled());
    const [, , sections] = calls.save.mock.calls.at(-1) ?? [];
    expect(sections).toMatchObject({ languages: [{ name: 'German', starred: true }] });
  });

  it('unstars one that was starred', async () => {
    calls.load.mockResolvedValue({
      ok: true,
      profile: stored({
        sections: {
          ...NO_SECTIONS,
          languages: [{ name: 'German', proficiency: 'fluent', starred: true }],
        },
      }),
    });
    const user = await openForEditing();

    await user.click(screen.getByRole('button', { name: 'Edit languages' }));
    await user.click(
      await section(/Languages/).findByRole('button', {
        name: 'Stop showing German beside my name',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(calls.save).toHaveBeenCalled());
    const [, , sections] = calls.save.mock.calls.at(-1) ?? [];
    expect(sections).toMatchObject({ languages: [{ name: 'German', starred: false }] });
  });

  /**
   * The defect this pair of buttons exists for.
   *
   * Publishing used to replace the edit button at a hundred per cent, so the
   * moment somebody filled in their last section was the moment they could no
   * longer change any of it — and starring a language, which only exists in
   * edit mode, became unreachable on exactly the profiles most likely to want
   * it.
   */
  it('still offers a way into editing once the profile is finished', async () => {
    calls.load.mockResolvedValue({ ok: true, profile: stored(COMPLETE) });
    const user = await open();

    const edit = await screen.findByRole('button', { name: /Edit profile/ });
    expect(screen.queryByRole('button', { name: /Complete your profile/ })).not.toBeInTheDocument();

    await user.click(edit);
    expect(screen.getByRole('button', { name: 'Edit portfolio' })).toBeInTheDocument();
  });

  it('offers Publish whether the profile is finished or not', async () => {
    calls.load.mockResolvedValue({ ok: true, profile: stored() });
    await open();
    expect(await screen.findByRole('button', { name: /^Publish/ })).toBeInTheDocument();

    // And the button that sits above it still asks for the missing sections.
    expect(screen.getByRole('button', { name: /Complete your profile/ })).toBeInTheDocument();
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

  /**
   * The photo lives on the server; the browser draft holds what was typed.
   *
   * A photo is shown from a `blob:` URL belonging to the tab that made it, so a
   * draft cannot carry one — and the step that reads the saved URL off the
   * profile is skipped whenever this browser holds a draft. Without this test
   * the page goes back to showing no photo at all the second time it is opened,
   * for somebody whose photo saved perfectly well.
   */
  it('shows the saved photo when the page reopens on a draft', async () => {
    const photo = 'https://media.test/profiles/p/avatar/0011223344556677.webp';
    calls.load.mockResolvedValue({ ok: true, profile: stored({ avatarUrl: photo }) });

    const user = await openForEditing();
    expect(document.querySelector(`img[src="${photo}"]`)).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Edit About' }));
    await user.type(await section(/About/).findByLabelText('Biography'), 'Kept for later.');
    await afterTheDraftIsWritten();

    // The tab is closed and opened again, on the draft this browser kept.
    cleanup();
    await openForEditing();

    expect(section(/About/).getByText('Kept for later.')).toBeInTheDocument();
    expect(document.querySelector(`img[src="${photo}"]`)).not.toBeNull();
  });

  /**
   * A draft is only newer than the server while the server has not moved on.
   *
   * The page used to prefer whatever this browser kept, for ever. A draft
   * written before ten portfolio images were attached then showed a piece with
   * none of them — the files were in Postgres and in storage the whole time —
   * and the next save would have cleared them, because a list is saved whole.
   */
  it('throws away a draft the server has moved past, rather than showing it', async () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });

    // Kept against version 2; the server answers with version 3.
    window.localStorage.setItem(
      'hireevo.client-profile-draft.user-1',
      JSON.stringify({
        version: 6,
        profileVersion: 2,
        identity: { headline: 'Typed before the save' },
        country: '',
        languages: [],
        skills: [],
        experience: [],
        education: [],
        licenses: [],
        portfolio: [{ id: 'p1', fields: { title: 'A piece with its files forgotten' }, files: [] }],
      }),
    );

    render(<ProfileBuilder />);

    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(window.localStorage.getItem('hireevo.client-profile-draft.user-1')).toBeNull();
  });

  it('keeps a draft written against the version the server still holds', async () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });

    window.localStorage.setItem(
      'hireevo.client-profile-draft.user-1',
      JSON.stringify({
        version: 6,
        // `stored()` answers with version 3.
        profileVersion: 3,
        identity: { overview: 'Kept for later.' },
        country: '',
        languages: [],
        skills: [],
        experience: [],
        education: [],
        licenses: [],
        portfolio: [],
      }),
    );

    await openForEditing();

    expect(section(/About/).getByText('Kept for later.')).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });

  /**
   * The line under each heading is an instruction, and an instruction that has
   * been followed is noise sitting above the answer.
   */
  it('drops a section’s instruction once the section holds something', async () => {
    await open();

    // Nothing filled in yet, so every section still says what it is for.
    expect(section(/About/).getByText(/Share some details about yourself/)).toBeInTheDocument();
    expect(
      section(/Skills and expertise/).getByText(/Attract relevant clients/),
    ).toBeInTheDocument();

    cleanup();
    calls.load.mockResolvedValue({
      ok: true,
      profile: stored({
        overview: 'Accomplished professional with thirteen years across QA and delivery.',
        sections: {
          ...NO_SECTIONS,
          skills: [{ name: 'QA', proficiency: null, years: null, approved: true }],
        },
      }),
    });
    await open();

    expect(
      section(/About/).queryByText(/Share some details about yourself/),
    ).not.toBeInTheDocument();
    expect(section(/About/).getByText(/Accomplished professional/)).toBeInTheDocument();
    expect(
      section(/Skills and expertise/).queryByText(/Attract relevant clients/),
    ).not.toBeInTheDocument();
    // And a section still empty keeps its own instruction.
    expect(section(/Work experience/).getByText(/Add your job history/)).toBeInTheDocument();
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

  it('removes a language from the section that owns the list', async () => {
    calls.load.mockResolvedValue({ ok: true, profile: withLanguage() });
    const user = await openForEditing();
    await user.click(screen.getByRole('button', { name: 'Edit languages' }));

    const languages = section(/Languages/);
    await user.click(await languages.findByRole('button', { name: 'Remove English' }));

    expect(languages.queryByRole('button', { name: 'Remove English' })).not.toBeInTheDocument();
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
      'Edit languages',
      'Save',
    ]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/profile photo/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Complete your profile/ }));

    for (const name of ['Edit display name: Sophie', 'Edit location: Austria', 'Edit languages']) {
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

  it('shows a preview of a portfolio piece’s images, not a count of them', async () => {
    calls.load.mockResolvedValue({
      ok: true,
      profile: stored({
        sections: {
          ...NO_SECTIONS,
          portfolio: [
            {
              title: 'Checkout redesign',
              url: null,
              summary: null,
              files: [
                {
                  kind: 'image',
                  url: 'https://storage.test/full.png',
                  thumbUrl: 'https://storage.test/thumb.png',
                  objectKey: 'obj-1',
                  thumbKey: 'thumb-1',
                  contentType: 'image/png',
                  byteSize: 1024,
                  width: 800,
                  height: 600,
                  fileName: 'checkout.png',
                },
              ],
            },
          ],
        },
      }),
    });
    await open();

    // The closed section shows the image itself, not the words "1 image".
    const preview = await section(/Portfolio/).findByRole('img', { name: 'checkout.png' });
    expect(preview).toHaveAttribute('src', 'https://storage.test/thumb.png');
    expect(section(/Portfolio/).queryByText(/\bimage\b/)).not.toBeInTheDocument();
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
    // Both drop zones are there from the start, each stating what it takes and
    // how much room is left, so nobody has to guess whether twenty is the limit.
    expect(portfolio().getByText(/Supported formats: JPG, PNG, WebP/)).toBeInTheDocument();
    expect(portfolio().getByText(/0 of 20 added/)).toBeInTheDocument();
    expect(portfolio().getByText(/Supported formats: PDF/)).toBeInTheDocument();
    expect(portfolio().getByText(/0 of 5 added/)).toBeInTheDocument();
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
    // A box per period, so somebody who charges by the hour for small jobs and
    // by the month for a retainer can say both.
    await user.type(await rates.findByLabelText('Per hour'), '85');
    await user.type(rates.getByLabelText('Per month'), '5200');

    expect(rates.getByLabelText('Per hour')).toHaveValue('85');
    expect(rates.getByLabelText('Per month')).toHaveValue('5200');
  });

  /**
   * The amount is typed the way it is spoken and stored in minor units, and
   * the two are a hundred apart. It used to be typed in minor units behind a
   * "$", so anyone who typed what they charge priced their week at 85 cents.
   */
  it('sends every price as minor units, not as the numbers that were typed', async () => {
    const user = await openForEditing();

    await user.click(screen.getByRole('button', { name: 'Edit expected rates' }));
    const rates = section(/Expected rates/);
    await user.type(await rates.findByLabelText('Per month'), '85.50');
    await user.type(rates.getByLabelText('Per hour'), '45');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // Shortest period first, whatever order the boxes were filled in: that is
    // the order the API answers in, and the order the profile shows them.
    await waitFor(() =>
      expect(calls.save.mock.calls.at(-1)?.[3]).toEqual([
        { period: 'hourly', amount: '45' },
        { period: 'monthly', amount: '85.50' },
      ]),
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
