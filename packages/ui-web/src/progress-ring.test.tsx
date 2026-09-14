import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressRing } from './progress-ring.tsx';

const ring = () => screen.getByRole('progressbar');

describe('ProgressRing', () => {
  it('reports its value the way a progress bar does', () => {
    render(<ProgressRing value={60} label="Profile strength" valueText="60 percent complete" />);
    expect(ring()).toHaveAccessibleName('Profile strength');
    expect(ring()).toHaveAttribute('aria-valuenow', '60');
    expect(ring()).toHaveAttribute('aria-valuetext', '60 percent complete');
  });

  it.each([
    [-5, '0'],
    [150, '100'],
    [33.4, '33'],
  ])('clamps and rounds %s to %s', (value, expected) => {
    render(<ProgressRing value={value} label="Profile strength" />);
    expect(ring()).toHaveAttribute('aria-valuenow', expected);
    expect(ring()).not.toHaveAttribute('aria-valuetext');
  });

  it('fills in proportion to the value', () => {
    const { container } = render(
      <ProgressRing value={25} label="Profile strength" size={100} thickness={10} />,
    );
    const arc = container.querySelector('[data-slot="progress"]');
    expect(Number(arc?.getAttribute('stroke-dashoffset'))).toBeCloseTo(2 * Math.PI * 45 * 0.75);
  });

  it('draws no arc at zero', () => {
    const { container } = render(<ProgressRing value={0} label="Profile strength" />);
    expect(container.querySelector('[data-slot="progress"]')).toBeNull();
  });

  it('hides its centre text, which the value text already speaks', () => {
    render(
      <ProgressRing value={60} label="Profile strength">
        <span>60%</span>
      </ProgressRing>,
    );
    expect(screen.getByText('60%').parentElement).toHaveAttribute('aria-hidden', 'true');
  });
});
