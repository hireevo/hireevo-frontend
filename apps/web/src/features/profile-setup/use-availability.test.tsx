import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatusBar } from '@/features/workspace/status-bar.tsx';
import type * as Api from './api.ts';
import type { OwnProfile } from './api.ts';
import { useAvailability } from './use-availability.ts';

vi.mock('next/link', () => ({
  default: (props: ComponentProps<'a'>) => <a {...props} />,
}));

const calls = vi.hoisted(() => ({
  load: vi.fn<typeof Api.loadOrCreateProfile>(),
  save: vi.fn<typeof Api.saveAvailability>(),
}));
vi.mock('./api.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof Api>()),
  loadOrCreateProfile: () => calls.load(),
  saveAvailability: (...args: Parameters<typeof Api.saveAvailability>) => calls.save(...args),
}));

const profile = (overrides: Partial<OwnProfile> = {}): OwnProfile =>
  ({ id: 'p1', version: 3, status: 'published', availability: null, ...overrides }) as OwnProfile;

/** The bar as the layout assembles it: the switch driven by the profile itself. */
function Harness() {
  const availability = useAvailability();
  return (
    <StatusBar
      seller={{ tier: 'New seller', upgrade: null, profileLive: false, available: true }}
      availability={availability}
    />
  );
}

const open = () => {
  render(<Harness />);
  return userEvent.setup();
};

const theSwitch = () => screen.getByRole('switch', { name: 'Available' });

beforeEach(() => {
  calls.load.mockReset().mockResolvedValue({ ok: true, profile: profile() });
  calls.save
    .mockReset()
    .mockImplementation((version, availability) =>
      Promise.resolve({ ok: true, profile: profile({ version: version + 1, availability }) }),
    );
});

describe('the availability switch', () => {
  it('cannot be moved until the profile has answered', async () => {
    calls.load.mockReturnValue(new Promise(() => undefined));
    const user = open();

    await user.click(theSwitch());

    expect(theSwitch()).toBeDisabled();
    expect(calls.save).not.toHaveBeenCalled();
  });

  it('opens on what the profile says, not on what a fixture said', async () => {
    calls.load.mockResolvedValue({ ok: true, profile: profile({ availability: 'unavailable' }) });
    open();

    await waitFor(() => expect(theSwitch()).toHaveAttribute('aria-checked', 'false'));
  });

  it('stays off and cannot be toggled until the profile is published', async () => {
    // An unpublished profile is not visible to anyone, so being "available" on
    // it means nothing — the switch reads off and is disabled even when the
    // field itself says available.
    calls.load.mockResolvedValue({
      ok: true,
      profile: profile({ status: 'draft', availability: 'available' }),
    });
    const user = open();

    await waitFor(() => expect(theSwitch()).toBeDisabled());
    expect(theSwitch()).toHaveAttribute('aria-checked', 'false');

    await user.click(theSwitch());
    expect(calls.save).not.toHaveBeenCalled();
  });

  it('reads anything that is not a refusal as available', async () => {
    // "open_to_offers" is a third state the switch cannot set but must not
    // misreport: it means yes, talk to me.
    calls.load.mockResolvedValue({
      ok: true,
      profile: profile({ availability: 'open_to_offers' }),
    });
    open();

    await waitFor(() => expect(theSwitch()).toHaveAttribute('aria-checked', 'true'));
  });

  it('saves the profile’s own field, at the version it was read at', async () => {
    const user = open();
    await waitFor(() => expect(theSwitch()).toBeEnabled());

    await user.click(theSwitch());

    // Moves at once rather than after the round trip.
    expect(theSwitch()).toHaveAttribute('aria-checked', 'false');
    await waitFor(() => expect(calls.save).toHaveBeenCalledWith(3, 'unavailable'));
  });

  it('puts the switch back and says why when the save is refused', async () => {
    calls.save.mockResolvedValue({
      ok: false,
      kind: 'failed',
      message: 'Could not reach HireEvo.',
    });
    const user = open();
    await waitFor(() => expect(theSwitch()).toBeEnabled());

    await user.click(theSwitch());

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach HireEvo.');
    expect(theSwitch()).toHaveAttribute('aria-checked', 'true');
  });

  it('carries the version its last save returned, so two toggles never conflict', async () => {
    const user = open();
    await waitFor(() => expect(theSwitch()).toBeEnabled());

    await user.click(theSwitch());
    await waitFor(() => expect(calls.save).toHaveBeenCalledTimes(1));
    await user.click(theSwitch());
    await waitFor(() => expect(calls.save).toHaveBeenCalledTimes(2));

    expect(calls.save.mock.calls.map((call) => call[0])).toEqual([3, 4]);
  });
});
