import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InlineEdit } from './inline-edit.tsx';

const setup = (value = '') => {
  const onSave = vi.fn();
  const user = userEvent.setup();
  render(
    <InlineEdit
      value={value}
      placeholder="Add display name"
      label="Edit display name"
      onSave={onSave}
    />,
  );
  return { onSave, user };
};

/** The idle control is named by its placeholder while empty, by the action once filled. */
const open = (value = '') =>
  screen.getByRole('button', {
    name: value === '' ? 'Add display name' : `Edit display name: ${value}`,
  });
const input = () => screen.getByRole('textbox', { name: 'Edit display name' });

describe('InlineEdit', () => {
  it('shows the placeholder until there is a value', () => {
    setup();
    expect(open()).toHaveTextContent('Add display name');
  });

  it('opens on the whole line, not only the pencil', async () => {
    // The pencil is 14px square. A mouse can just about hit that; a thumb
    // cannot, which is why the line itself is the control.
    const { user } = setup('Ayesha Khan');
    await user.click(screen.getByText('Ayesha Khan'));
    expect(input()).toHaveValue('Ayesha Khan');
  });

  it('saves on Enter', async () => {
    const { onSave, user } = setup();
    await user.click(open());
    await user.keyboard('Ayesha Khan{Enter}');
    expect(onSave).toHaveBeenCalledWith('Ayesha Khan');
  });

  it('saves when focus leaves', async () => {
    const { onSave, user } = setup();
    await user.click(open());
    await user.keyboard('Ayesha Khan');
    await user.tab();
    expect(onSave).toHaveBeenCalledWith('Ayesha Khan');
  });

  it('abandons the edit on Escape, including the blur it causes', async () => {
    // Escape blurs the input, and blur saves. Without the two being ordered,
    // cancelling would commit the very text the user just rejected.
    const { onSave, user } = setup('Ayesha Khan');
    await user.click(open('Ayesha Khan'));
    await user.keyboard('Something else{Escape}');
    expect(onSave).not.toHaveBeenCalled();
    expect(open('Ayesha Khan')).toHaveTextContent('Ayesha Khan');
  });

  it('trims, and stays quiet when nothing actually changed', async () => {
    const { onSave, user } = setup('Ayesha Khan');
    await user.click(open('Ayesha Khan'));
    await user.keyboard('   Ayesha Khan   {Enter}');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('lets a value be cleared', async () => {
    const { onSave, user } = setup('Ayesha Khan');
    await user.click(open('Ayesha Khan'));
    await user.clear(input());
    await user.keyboard('{Enter}');
    expect(onSave).toHaveBeenCalledWith('');
  });
});
