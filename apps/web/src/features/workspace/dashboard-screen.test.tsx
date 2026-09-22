import type { AuthenticatedUser } from '@hireevo/api-client';
import { render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type * as ProfileApi from '@/features/profile-setup/api.ts';
import type { OwnProfile } from '@/features/profile-setup/api.ts';
import { DashboardScreen } from './dashboard-screen.tsx';

vi.mock('next/link', () => ({ default: (props: ComponentProps<'a'>) => <a {...props} /> }));

const user: AuthenticatedUser = {
  id: 'u1',
  email: 'ayesha@example.com',
  firstName: 'Ayesha',
  lastName: 'Khan',
  username: 'ayesha',
  status: 'active',
  emailVerified: true,
  roles: [],
  permissions: [],
};
vi.mock('@/features/auth/session.tsx', () => ({ useSession: () => ({ user }) }));

const load = vi.hoisted(() => vi.fn<typeof ProfileApi.loadOrCreateProfile>());
vi.mock('@/features/profile-setup/api.ts', () => ({
  loadOrCreateProfile: () => load(),
}));

const profile = (overrides: Partial<OwnProfile> = {}): OwnProfile =>
  ({
    status: 'draft',
    overview: null,
    videoIntroUrl: null,
    sections: {
      languages: [],
      skills: [],
      experience: [],
      education: [],
      licenses: [],
      portfolio: [],
    },
    ...overrides,
  }) as unknown as OwnProfile;

describe('DashboardScreen', () => {
  it('renders the real profile once it loads — its own counts and strength', async () => {
    load.mockResolvedValueOnce({
      ok: true,
      profile: profile({
        sections: {
          languages: [],
          experience: [],
          education: [],
          licenses: [],
          skills: [{ name: 'UX' }, { name: 'UI' }] as never,
          portfolio: [
            { title: 'Fintech dashboard', summary: 'A case study.', url: null, files: [] },
          ] as never,
        },
      }),
    });

    render(<DashboardScreen />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading your workspace…');

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Fintech dashboard' })).toBeInTheDocument(),
    );
    // Real count from the profile, and none of the design's sample content.
    expect(
      screen.getByText(
        (_, element) => element?.tagName === 'P' && element.textContent === '2 Skills',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('12 of 15 bids left this month')).not.toBeInTheDocument();
  });

  it('shows a retry when the profile cannot be loaded', async () => {
    load.mockResolvedValueOnce({ ok: false, message: 'Could not reach HireEvo.' });
    render(<DashboardScreen />);
    await waitFor(() => expect(screen.getByText('Could not reach HireEvo.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
