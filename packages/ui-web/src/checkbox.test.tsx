import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Checkbox } from './checkbox.tsx';

describe('Checkbox', () => {
  it('is a real checkbox named by its own label text', () => {
    render(<Checkbox name="remember">Remember me</Checkbox>);
    expect(screen.getByRole('checkbox', { name: 'Remember me' })).toBeInTheDocument();
  });

  it('toggles when the label text is clicked, not only the box', async () => {
    const user = userEvent.setup();
    render(<Checkbox name="remember">Remember me</Checkbox>);

    const control = screen.getByRole('checkbox');
    // The tick is drawn over the input, so a click landing on it must still
    // reach the control underneath.
    await user.click(screen.getByText('Remember me'));
    expect(control).toBeChecked();
  });

  it('stays operable from the keyboard', async () => {
    const user = userEvent.setup();
    render(<Checkbox name="remember">Remember me</Checkbox>);

    await user.tab();
    expect(screen.getByRole('checkbox')).toHaveFocus();
    await user.keyboard(' ');
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});
