import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from './switch.tsx';

function Harness() {
  const [on, setOn] = useState(true);
  return (
    <>
      <Switch checked={on} onCheckedChange={setOn} aria-labelledby="label" />
      <span id="label">Available</span>
    </>
  );
}

describe('Switch', () => {
  it('is a named switch that reports its state', () => {
    render(<Harness />);
    expect(screen.getByRole('switch', { name: 'Available' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('flips on click', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('flips from the keyboard', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard(' ');
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('does nothing while disabled', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Switch checked={false} onCheckedChange={onCheckedChange} aria-label="Available" disabled />,
    );
    await user.click(screen.getByRole('switch'));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('never submits the form it sits in', () => {
    render(<Switch checked={false} onCheckedChange={vi.fn()} aria-label="Available" />);
    expect(screen.getByRole('switch')).toHaveAttribute('type', 'button');
  });
});
