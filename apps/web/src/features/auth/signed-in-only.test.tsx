import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionStatus } from './session.tsx';
import { SignedInOnly } from './signed-in-only.tsx';

const session = vi.hoisted((): { status: SessionStatus } => ({ status: 'restoring' }));
const replace = vi.hoisted(() => vi.fn<(href: string) => void>());

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: replace }) }));
vi.mock('./session.tsx', () => ({
  useSession: () => ({ status: session.status, user: null, adopt: vi.fn(), signOut: vi.fn() }),
}));

const page = <p>Workspace content</p>;

describe('SignedInOnly', () => {
  beforeEach(() => replace.mockClear());

  it('holds the page while the session is still being restored', () => {
    session.status = 'restoring';
    render(<SignedInOnly>{page}</SignedInOnly>);
    expect(screen.getByRole('status')).toHaveTextContent('Loading your workspace…');
    expect(screen.queryByText('Workspace content')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('sends a signed-out visitor to sign in without showing the page', () => {
    session.status = 'anonymous';
    render(<SignedInOnly>{page}</SignedInOnly>);
    expect(replace).toHaveBeenCalledWith('/sign-in');
    expect(screen.queryByText('Workspace content')).not.toBeInTheDocument();
  });

  it('shows the page to someone signed in', () => {
    session.status = 'authenticated';
    render(<SignedInOnly>{page}</SignedInOnly>);
    expect(screen.getByText('Workspace content')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
