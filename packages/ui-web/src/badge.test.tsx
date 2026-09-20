import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './badge.tsx';

describe('Badge', () => {
  it('says what it means in words', () => {
    render(
      <Badge tone="warning" variant="text">
        Draft
      </Badge>,
    );
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('keeps its icon out of the accessibility tree', () => {
    const { container } = render(<Badge icon={<svg data-testid="icon" />}>Strong</Badge>);
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(container.textContent).toBe('Strong');
  });

  it.each(['neutral', 'accent', 'success', 'warning'] as const)(
    'renders the %s tone as a pill and as bare text',
    (tone) => {
      const { rerender } = render(<Badge tone={tone}>Label</Badge>);
      expect(screen.getByText('Label').parentElement).toHaveClass('rounded-full');
      rerender(
        <Badge tone={tone} variant="text">
          Label
        </Badge>,
      );
      expect(screen.getByText('Label').parentElement).not.toHaveClass('rounded-full');
    },
  );
});
