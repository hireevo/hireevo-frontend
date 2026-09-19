import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PasswordChangedDialog } from './password-changed-dialog.tsx';

const push = vi.fn<(href: string) => void>();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

// next/image needs the App Router image context. The motif is decorative and
// nothing in these tests inspects it, so the mock renders nothing.
vi.mock('next/image', () => ({ default: () => null }));

const EXIT = '/sign-in?reset=1';

afterEach(() => push.mockReset());

describe('PasswordChangedDialog', () => {
  it('is a labelled modal that takes focus on mount', () => {
    render(<PasswordChangedDialog />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // The only focusable is the action button, so focus lands there.
    expect(screen.getByRole('button', { name: /go to your account/i })).toHaveFocus();
  });

  it('leaves for sign-in when the button is clicked', async () => {
    render(<PasswordChangedDialog />);
    await userEvent.click(screen.getByRole('button', { name: /go to your account/i }));
    expect(push).toHaveBeenCalledWith(EXIT);
  });

  it('takes the same exit on Escape', () => {
    render(<PasswordChangedDialog />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(push).toHaveBeenCalledWith(EXIT);
  });

  it('keeps Tab inside the dialog', () => {
    render(<PasswordChangedDialog />);
    const button = screen.getByRole('button', { name: /go to your account/i });

    // Tab and Shift+Tab both wrap back to the only focusable element.
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(button).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(button).toHaveFocus();

    // Focus escaping the dialog is pulled back in.
    button.blur();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(button).toHaveFocus();
  });

  it('ignores keys other than Tab and Escape', () => {
    render(<PasswordChangedDialog />);
    fireEvent.keyDown(document, { key: 'a' });
    expect(push).not.toHaveBeenCalled();
  });
});
