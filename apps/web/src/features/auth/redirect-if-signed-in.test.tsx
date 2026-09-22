import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RedirectIfSignedIn } from './redirect-if-signed-in.tsx';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const status = vi.hoisted(() => ({ value: 'anonymous' }));
vi.mock('./session.tsx', () => ({ useSession: () => ({ status: status.value }) }));

afterEach(() => {
  replace.mockReset();
});

describe('RedirectIfSignedIn', () => {
  it('sends a signed-in visitor to the workspace', () => {
    status.value = 'authenticated';
    render(<RedirectIfSignedIn />);
    expect(replace).toHaveBeenCalledWith('/client-profile');
  });

  it('does nothing while the session is anonymous or still restoring', () => {
    status.value = 'anonymous';
    render(<RedirectIfSignedIn />);
    expect(replace).not.toHaveBeenCalled();

    status.value = 'loading';
    render(<RedirectIfSignedIn />);
    expect(replace).not.toHaveBeenCalled();
  });
});
