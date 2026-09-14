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
