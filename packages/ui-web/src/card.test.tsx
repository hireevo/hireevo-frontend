import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './card.tsx';
import { IconTile } from './icon-tile.tsx';

describe('Card', () => {
  it('is a section, so a heading inside it names a region', () => {
    render(
      <Card aria-labelledby="h">
        <h2 id="h">About</h2>
      </Card>,
    );
    expect(screen.getByRole('region', { name: 'About' })).toBeInTheDocument();
  });

  it('lets a caller replace a default utility rather than stacking both', () => {
    const { container } = render(<Card className="p-0" />);
    expect(container.firstElementChild).toHaveClass('p-0');
    expect(container.firstElementChild).not.toHaveClass('p-7');
  });
});

describe('IconTile', () => {
  it('keeps its illustration out of the accessibility tree', () => {
    // The section heading beside it already says what the card is; "star"
    // announced next to "Skills and expertise" is noise.
    const { container } = render(
      <IconTile>
        <svg data-testid="glyph" />
      </IconTile>,
    );
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('glyph')).toBeInTheDocument();
  });
});
