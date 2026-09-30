import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Api from '@/features/profile-setup/api.ts';
import type { OwnProfile } from '@/features/profile-setup/api.ts';
import { PUBLIC_SECTIONS } from '@/features/profile-setup/use-visibility-draft.ts';
import { VisibilityEditor } from './visibility-editor.tsx';

const calls = vi.hoisted(() => ({
  load: vi.fn<typeof Api.loadOrCreateProfile>(),
  save: vi.fn<typeof Api.saveVisibility>(),
}));
vi.mock('@/features/profile-setup/api.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof Api>()),
  loadOrCreateProfile: () => calls.load(),
  saveVisibility: (...args: Parameters<typeof Api.saveVisibility>) => calls.save(...args),
}));

type Sections = OwnProfile['visibility']['sections'];

const allSections = (on: boolean): Sections =>
  Object.fromEntries(PUBLIC_SECTIONS.map((section) => [section.id, on])) as Sections;

const profile = (sections: Sections, version = 3): OwnProfile =>
  ({
    id: 'p1',
    version,
    status: 'draft',
    visibility: {
      profilePublic: true,
      locationGranularity: 'country',
      sections,
      searchIndexable: false,
    },
  }) as unknown as OwnProfile;

/**
 * Mirrors how the page holds the profile: `adopt` swaps it for the one read back
 * after a save, which is what lets the Save button notice there is nothing left
 * to send and dim again.
 */
function Harness({ initial }: { initial: OwnProfile }) {
  const [current, setCurrent] = useState<OwnProfile>(initial);
  return (
    <VisibilityEditor
      draft={{
        profile: current,
        version: () => current.version,
        flush: () => Promise.resolve(true),
        adopt: (next) => setCurrent(next),
      }}
    />
  );
}

const saveButton = () => screen.getByRole('button', { name: 'Save' });

beforeEach(() => {
  calls.save
    .mockReset()
    .mockResolvedValue({ ok: true, visibility: {} } as Awaited<
      ReturnType<typeof Api.saveVisibility>
    >);
  calls.load.mockReset();
});

describe('the visibility Save button', () => {
  it('is dim until something changes, and dims again once the change is saved', async () => {
    // The page reads the profile back after a save; here that read reflects the
    // section that was just unticked, which is what lets the button dim again.
    calls.load.mockResolvedValue({
      ok: true,
      profile: profile({ ...allSections(true), availability: false }),
    });
    render(<Harness initial={profile(allSections(true))} />);
    const user = userEvent.setup();

    // Nothing has changed since the profile loaded, so there is nothing to save.
    await waitFor(() => expect(saveButton()).toBeDisabled());

    // Untick a section: now there is.
    await user.click(screen.getByRole('checkbox', { name: 'Availability' }));
    expect(saveButton()).toBeEnabled();

    // Save it — and once the saved profile comes back, the button dims again.
    await user.click(saveButton());
    await waitFor(() => expect(calls.save).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(saveButton()).toBeDisabled());
  });
});
