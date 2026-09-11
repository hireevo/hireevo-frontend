import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from './chip.tsx';

describe('Chip', () => {
  it('shows its label with no remove control by default', () => {
    render(<Chip>English</Chip>);
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('removes on request', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <Chip onRemove={onRemove} removeLabel="Remove English">
        English
      </Chip>,
    );

    await user.click(screen.getByRole('button', { name: 'Remove English' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('names each remove button after its own chip', () => {
    // Five buttons all called "Remove" is a list a screen-reader user cannot
    // navigate: the name has to carry which one it removes.
    render(
      <>
        <Chip onRemove={vi.fn()} removeLabel="Remove English">
          English
        </Chip>
        <Chip onRemove={vi.fn()} removeLabel="Remove Urdu">
          Urdu
        </Chip>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Remove Urdu' })).toBeInTheDocument();
  });

  it('never submits the form it sits in', () => {
    render(<Chip onRemove={vi.fn()}>English</Chip>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
});
