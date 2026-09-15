import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Api from './api.ts';
import type { OwnProfile } from './api.ts';
import { sinceLabel } from './draft-status-card.tsx';
import { ProfileSetupScreen, sectionsSavedIn } from './profile-setup-screen.tsx';

const nav = vi.hoisted(() => ({ push: vi.fn(), step: null as string | null }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push, replace: nav.push }),
  useSearchParams: () => ({ get: () => nav.step }),
}));
vi.mock('next/link', () => ({ default: (props: ComponentProps<'a'>) => <a {...props} /> }));

const calls = vi.hoisted(() => ({
  load: vi.fn<typeof Api.loadOrCreateProfile>(),
  save: vi.fn<typeof Api.saveIdentity>(),
  publish: vi.fn<typeof Api.publishProfile>(),
}));
vi.mock('./api.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof Api>()),
  loadOrCreateProfile: (...args: Parameters<typeof Api.loadOrCreateProfile>) => calls.load(...args),
  saveIdentity: (...args: Parameters<typeof Api.saveIdentity>) => calls.save(...args),
  publishProfile: (...args: Parameters<typeof Api.publishProfile>) => calls.publish(...args),
}));

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
    availability: null,
    rateAmountMinor: null,
    rateCurrency: null,
    ...overrides,
  }) as OwnProfile;

const renderScreen = () => {
  render(<ProfileSetupScreen autosaveDelay={40} />);
  return userEvent.setup();
};

beforeEach(() => {
  nav.push.mockReset();
  nav.step = null;
  calls.load.mockReset().mockResolvedValue({ ok: true, profile: stored() });
  calls.save
    .mockReset()
    .mockImplementation((version, values) =>
      Promise.resolve({ ok: true, profile: stored({ ...values, version: version + 1 }) }),
    );
  calls.publish.mockReset();
});

describe('ProfileSetupScreen', () => {
  it('opens on the saved profile', async () => {
    renderScreen();
    expect(await screen.findByLabelText('Display name')).toHaveValue('Sophie Brandt');
    expect(screen.getByLabelText('Professional headline')).toHaveValue('Senior service designer');
    expect(screen.getByText('Autosaved')).toBeInTheDocument();
    expect(screen.getByText('3 of 4 fields filled')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Identity & story/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('saves after a pause in typing, not on every keystroke', async () => {
    const user = renderScreen();
    const note = await screen.findByLabelText('Availability');

    await user.type(note, 'From October');
    expect(screen.getByText('Unsaved')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Autosaved')).toBeInTheDocument());
    expect(calls.save.mock.calls.length).toBeLessThan('From October'.length);
    expect(calls.save.mock.calls.at(-1)?.[1]).toMatchObject({ availabilityNote: 'From October' });
    expect(screen.getByText('All fields complete')).toBeInTheDocument();
  });

  it('sends the version the last save returned, so its own saves never conflict', async () => {
    const user = renderScreen();
    const name = await screen.findByLabelText('Display name');

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
    const name = await screen.findByLabelText('Display name');

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

    await user.type(await screen.findByLabelText('Professional headline'), '!');
    expect(await screen.findByRole('alert')).toHaveTextContent('Too long');
    expect(screen.getByLabelText('Professional headline')).toHaveAttribute('aria-invalid', 'true');
  });

  it('saves before moving on, and moves on only once saved', async () => {
    const user = renderScreen();
    await user.type(await screen.findByLabelText('Availability'), 'Now');

    await user.click(screen.getByRole('button', { name: /Save and next/ }));

    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/profile/setup?step=location'));
    expect(calls.save.mock.calls.at(-1)?.[1]).toMatchObject({ availabilityNote: 'Now' });
  });

  it('stays put when the save before moving on fails', async () => {
    calls.save.mockResolvedValue({
      ok: false,
      kind: 'failed',
      message: 'Could not reach HireEvo.',
    });
    const user = renderScreen();
    await user.type(await screen.findByLabelText('Availability'), 'Now');

    await user.click(screen.getByRole('button', { name: /Save and next/ }));

    expect(await screen.findByText('Could not reach HireEvo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try saving again' })).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
  });

  it('lists what publishing still needs, with the section that fixes each', async () => {
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
    expect(within(alert).getByRole('link', { name: 'Location & rate' })).toHaveAttribute(
      'href',
      '/profile/setup?step=location',
    );
    expect(
      within(alert).getByRole('link', { name: 'Visibility & publication' }),
    ).toBeInTheDocument();
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

  it('shows a section with no design yet as not available, with a way back', async () => {
    nav.step = 'skills';
    renderScreen();

    expect(await screen.findByText('This section is not available yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Identity and story' })).toHaveAttribute(
      'href',
      '/profile/setup',
    );
    expect(screen.getByRole('link', { name: /Languages & skills/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
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
    const note = await screen.findByLabelText('Availability');

    await user.type(note, 'x'.repeat(100));
    expect(screen.queryByText(/characters left/)).not.toBeInTheDocument();
    await user.type(note, 'x'.repeat(30));
    expect(screen.getByText('10 characters left')).toBeInTheDocument();
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
          status: 'published',
        }),
      ),
    ).toBe(3);
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

describe('ProfileSetupScreen: Location and rate', () => {
  const RATE = 'Hourly rate in smallest currency unit';
  const CURRENCY = 'Rate currency (3 letters)';

  it('shows every field of the design, empty, as step 2 of 6', async () => {
    nav.step = 'location';
    renderScreen();

    expect(await screen.findByLabelText('Country')).toHaveValue('');
    for (const label of [
      'City',
      'Service area',
      'Timezone',
      'Remote availability',
      CURRENCY,
      RATE,
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('0 of 7 fields filled')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Location & rate/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('fills in completely and moves on to step 3', async () => {
    nav.step = 'location';
    const user = renderScreen();

    await user.type(await screen.findByLabelText('Country'), 'austria');
    await user.type(screen.getByLabelText('City'), 'Vienna');
    await user.type(screen.getByLabelText('Service area'), 'Remote across Europe');
    await user.type(screen.getByLabelText('Timezone'), 'Europe/Vienna');
    await user.selectOptions(screen.getByLabelText('Remote availability'), 'remote');
    await user.type(screen.getByLabelText(CURRENCY), 'eur');
    await user.type(screen.getByLabelText(RATE), '14,000');

    // Left the country field already, so it settled to its listed name.
    expect(screen.getByLabelText('Country')).toHaveValue('Austria');
    expect(screen.getByLabelText(CURRENCY)).toHaveValue('EUR');
    expect(screen.getByLabelText(RATE)).toHaveValue('14000');
    expect(screen.getByText('€140.00 per hour')).toBeInTheDocument();
    expect(screen.getByText('All fields complete')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Location & rate, complete' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Save and next/ }));
    expect(nav.push).toHaveBeenCalledWith('/profile/setup?step=skills');
  });

  it('leaves a field without an error, and shows it on Save and next until it is fixed', async () => {
    nav.step = 'location';
    const user = renderScreen();
    const timezone = await screen.findByLabelText('Timezone');

    await user.type(timezone, 'Mars/Olympus');
    await user.tab();
    // Nothing appears on leaving, so nothing moves under the pointer.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Save and next/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a timezone from the list');
    expect(timezone).toHaveAttribute('aria-invalid', 'true');

    await user.type(timezone, '{Backspace}');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
  });

  it('asks before the page is left with location values entered', async () => {
    nav.step = 'location';
    const user = renderScreen();
    const leave = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    await screen.findByLabelText('City');
    expect(leave()).toBe(false);
    await user.type(screen.getByLabelText('City'), 'Vienna');
    expect(leave()).toBe(true);
  });

  it('stays on the step and takes the person to the first problem', async () => {
    nav.step = 'location';
    const user = renderScreen();
    const country = await screen.findByLabelText('Country');

    await user.type(country, 'Atlantis');
    await user.click(screen.getByRole('button', { name: /Save and next/ }));

    await waitFor(() => expect(country).toHaveFocus());
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a country from the list.');
    expect(nav.push).not.toHaveBeenCalled();
  });

  it('asks for the currency a rate is in', async () => {
    nav.step = 'location';
    const user = renderScreen();

    await user.type(await screen.findByLabelText(RATE), '14000');
    await user.click(screen.getByRole('button', { name: /Save and next/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Add the currency this rate is in.');
    await waitFor(() => expect(screen.getByLabelText(CURRENCY)).toHaveFocus());
  });

  it('says plainly that this section is not saved yet', async () => {
    nav.step = 'location';
    const user = renderScreen();

    expect(await screen.findByLabelText('City')).toBeInTheDocument();
    expect(screen.queryByText(/not connected to your profile yet/)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('City'), 'Vienna');

    expect(screen.getByText(/not connected to your profile yet/)).toBeInTheDocument();
    expect(calls.save).not.toHaveBeenCalled();
  });

  it('ticks Identity and story once its section is saved', async () => {
    calls.load.mockResolvedValue({
      ok: true,
      profile: stored({ availabilityNote: 'From October' }),
    });
    nav.step = 'location';
    renderScreen();

    expect(
      await screen.findByRole('link', { name: 'Identity & story, complete' }),
    ).toBeInTheDocument();
  });
});
