import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './progress-bar.tsx';

const bar = () => screen.getByRole('progressbar');

describe('ProgressBar', () => {
  it('reports its position on a 0 to 100 scale', () => {
    render(<ProgressBar value={20} label="Profile completion" />);
    expect(bar()).toHaveAttribute('aria-valuenow', '20');
    expect(bar()).toHaveAttribute('aria-valuemin', '0');
    expect(bar()).toHaveAttribute('aria-valuemax', '100');
    expect(bar()).toHaveAccessibleName('Profile completion');
  });

  it.each([
    [-40, '0'],
    [140, '100'],
    [19.6, '20'],
  ])('renders %s as %s', (value, expected) => {
    // A completion count divided by a step count will produce both a fraction
    // and, when a step list changes under it, a number out of range.
    render(<ProgressBar value={value} label="Profile completion" />);
    expect(bar()).toHaveAttribute('aria-valuenow', expected);
  });

  it('prefers spoken text to a bare number when given it', () => {
    render(
      <ProgressBar value={40} label="Profile completion" valueText="40 percent, 2 of 5 steps" />,
    );
    expect(bar()).toHaveAttribute('aria-valuetext', '40 percent, 2 of 5 steps');
  });

  it('leaves valuetext off when there is none, rather than emptying it', () => {
    render(<ProgressBar value={40} label="Profile completion" />);
    expect(bar()).not.toHaveAttribute('aria-valuetext');
  });
});
