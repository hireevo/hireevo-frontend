import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button.tsx';

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Publish profile</Button>);
    expect(screen.getByRole('button', { name: 'Publish profile' })).toBeInTheDocument();
  });

  it('refuses clicks while loading and says so out loud', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Publish profile
      </Button>,
    );
    // A double submit on a loading button is how a duplicate profile gets
    // created, so `loading` must refuse the click, not just look busy.
    const control = screen.getByRole('button', { name: /Loading/ });
    await user.click(control);
    expect(onClick).not.toHaveBeenCalled();
    expect(control).toHaveAttribute('aria-disabled', 'true');
    expect(control).toHaveAttribute('aria-busy', 'true');
    expect(control).not.toBeDisabled(); // still focusable

    control.focus();
    await userEvent.click(control);
    expect(onClick).not.toHaveBeenCalled();
    expect(control).toHaveFocus();
  });

  it('keeps using the disabled attribute for a genuinely disabled button', () => {
    render(<Button disabled>Publish profile</Button>);
    expect(screen.getByRole('button', { name: 'Publish profile' })).toBeDisabled();
  });

  it('keeps focus on itself when it starts loading', () => {
    // A disabled button drops focus to the page, which sends a keyboard user
    // back to the top in the middle of saving (§6.8).
    const { rerender } = render(<Button>Save</Button>);
    const control = screen.getByRole('button', { name: 'Save' });
    control.focus();
    rerender(<Button loading>Save</Button>);
    expect(control).not.toBeDisabled();
    expect(control).toHaveFocus();
  });

  it('does not submit its form a second time while loading', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" loading>
          Save
        </Button>
      </form>,
    );
    await user.click(screen.getByRole('button'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('still honours disabled on its own', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('lets a caller override a default utility rather than stacking both', () => {
    render(<Button className="rounded-full">Publish</Button>);
    expect(screen.getByRole('button')).toHaveClass('rounded-full');
    expect(screen.getByRole('button')).not.toHaveClass('rounded-md');
  });
});
