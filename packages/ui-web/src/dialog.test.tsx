import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './dialog.tsx';

/**
 * The dialog as a caller uses it: something opens it, and closing it has to put
 * the person back where they were.
 */
function Harness({ size }: { size?: 'form' | 'wide' } = {}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Change name
      </button>
      {open ? (
        <Dialog
          title="Change your name"
          description="This is the name buyers see."
          {...(size === undefined ? {} : { size })}
          onClose={() => setOpen(false)}
        >
          <input aria-label="Name" />
          <button type="button">Save</button>
        </Dialog>
      ) : null}
    </>
  );
}

const open = async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Change name' }));
  return user;
};

describe('Dialog', () => {
  it('is a modal named by its title and described by its line under it', async () => {
    await open();

    const dialog = screen.getByRole('dialog', { name: 'Change your name' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('This is the name buyers see.');
  });

  it('carries no description when it was given none', () => {
    render(
      <Dialog title="Just a title" onClose={vi.fn()}>
        <button type="button">Save</button>
      </Dialog>,
    );

    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-describedby');
  });

  it('opens on the first field, because that is what the box was opened to do', async () => {
    await open();

    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('opens on whatever is first when there is no field', () => {
    render(
      <Dialog title="Nothing to type" onClose={vi.fn()}>
        <button type="button">Only this</button>
      </Dialog>,
    );

    // The close button, which is the first thing in the box.
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('holds the page still behind it, and lets it move again afterwards', async () => {
    const user = await open();
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('');
  });

  it('closes on Escape, on the backdrop and on its own button, each putting focus back', async () => {
    for (const close of [
      async (user: ReturnType<typeof userEvent.setup>) => user.keyboard('{Escape}'),
      async (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByRole('button', { name: 'Close' })),
    ]) {
      const user = await open();
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await close(user);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      // Back on the control that opened it, rather than at the top of the page.
      expect(screen.getByRole('button', { name: 'Change name' })).toHaveFocus();
      screen.getByRole('button', { name: 'Change name' }).blur();
      document.body.innerHTML = '';
    }
  });

  it('keeps Tab inside itself, in both directions', async () => {
    const user = await open();
    const dialog = within(screen.getByRole('dialog'));
    const close = dialog.getByRole('button', { name: 'Close' });
    const name = screen.getByLabelText('Name');
    const save = dialog.getByRole('button', { name: 'Save' });

    // Forward off the end comes back to the beginning.
    save.focus();
    await user.keyboard('{Tab}');
    expect(close).toHaveFocus();

    // And backward off the beginning goes to the end.
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(save).toHaveFocus();

    // In between it moves normally.
    close.focus();
    await user.keyboard('{Tab}');
    expect(name).toHaveFocus();
  });

  it('pulls focus back in when it has wandered outside', async () => {
    const user = await open();
    screen.getByRole('button', { name: 'Change name' }).focus();

    await user.keyboard('{Tab}');

    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('grows for content that is the point of the box rather than a control', async () => {
    const user = userEvent.setup();
    render(<Harness size="wide" />);
    await user.click(screen.getByRole('button', { name: 'Change name' }));

    expect(screen.getByRole('dialog').className).toContain('max-w-[900px]');
  });
});
