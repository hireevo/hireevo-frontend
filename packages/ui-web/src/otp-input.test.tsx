import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { OtpInput } from './otp-input.tsx';

/** The component is controlled, so the tests drive it the way a form does. */
function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <OtpInput label="Verification code" value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  );
}

const boxes = () => screen.getAllByRole('textbox');
const currentValue = () => screen.getByTestId('value').textContent;

describe('OtpInput', () => {
  it('renders one numbered box per digit', () => {
    render(<Harness />);
    expect(boxes()).toHaveLength(6);
    expect(
      screen.getByRole('textbox', { name: 'Verification code, digit 1 of 6' }),
    ).toBeInTheDocument();
  });

  it('advances as digits are typed and ignores everything else', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(boxes()[0] as HTMLElement);
    await user.keyboard('12a3');

    expect(currentValue()).toBe('123');
    expect(boxes()[3]).toHaveFocus();
  });

  it('distributes a pasted code across every box', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(boxes()[0] as HTMLElement);
    // Codes get pasted out of an email far more often than they get typed, and
    // landing the whole string in box one is the classic way this breaks.
    await user.paste('418302');

    expect(currentValue()).toBe('418302');
    expect(boxes()[5]).toHaveValue('2');
  });

  it('takes the previous digit when backspace lands on an empty box', async () => {
    const user = userEvent.setup();
    render(<Harness initial="12" />);

    await user.click(boxes()[2] as HTMLElement);
    await user.keyboard('{Backspace}');

    expect(currentValue()).toBe('1');
    expect(boxes()[1]).toHaveFocus();
  });

  it('moves between boxes with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<Harness initial="123456" />);

    await user.click(boxes()[3] as HTMLElement);
    await user.keyboard('{ArrowLeft}');
    expect(boxes()[2]).toHaveFocus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(boxes()[4]).toHaveFocus();
  });

  it('clears from the edited box rather than leaving a hole', async () => {
    const user = userEvent.setup();
    render(<Harness initial="123456" />);

    await user.click(boxes()[2] as HTMLElement);
    await user.keyboard('{Backspace}');

    expect(currentValue()).toBe('12');
  });

  it('marks every box invalid together', () => {
    render(<OtpInput label="Verification code" value="" onChange={() => {}} invalid />);
    for (const box of boxes()) expect(box).toHaveAttribute('aria-invalid', 'true');
  });
});
